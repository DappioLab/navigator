import * as solana from "@solana/web3.js"
import * as solend from "./solend";
import { check_token_account, findAssociatedTokenAddress } from "./util";
import { TOKEN_PROGRAM_ID, NATIVE_MINT, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import {
    AccountMeta,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
    GetProgramAccountsConfig,
    MemcmpFilter,
    DataSizeFilter
} from "@solana/web3.js";
import * as ins from "./instructions"
import { lending_info } from "./solend";
import * as info from "./solend_info"
import * as obligation from "./obligation"
export async function create_deposit_tx(lending_info: lending_info, wallet: PublicKey, connection: Connection, amount: number, supply_token_address?: PublicKey, reserve_token_address?: PublicKey) {

    let tx: Transaction = new Transaction;
    if (await obligation.obligation_created(connection,wallet)){

    }
    else{
        let create_obligation_ix = await ins.create_obligation_account_ix(wallet)
        tx.add(create_obligation_ix);
    }
    if (reserve_token_address) {
        reserve_token_address = supply_token_address as PublicKey;
    }
    else
        reserve_token_address = await findAssociatedTokenAddress(wallet, lending_info.reserve_token_mint);
    if (supply_token_address) {
        supply_token_address = supply_token_address as PublicKey;
    }
    else
        supply_token_address = await findAssociatedTokenAddress(wallet, lending_info.supply_token_mint);
    if (await check_token_account(reserve_token_address, connection)) { }
    else {
        let create_ata_ix = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, lending_info.reserve_token_mint, reserve_token_address, wallet, wallet);
        tx.add(create_ata_ix);
    }
    /*if (await check_token_account(supply_token_address, connection)) { }
    else {
        let create_ata_ix = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, lending_info.supply_token_mint, supply_token_address, wallet, wallet);
        tx.add(create_ata_ix);
    }*/
    let refresh_ix = await ins.refreshReserveInstruction(lending_info.reserve_address, lending_info.reserve_info.liquidity.pyth_oracle_pubkey, lending_info.reserve_info.liquidity.switchboard_oracle_pubkey);
    //console.log(refresh_ix);
    tx.add(refresh_ix);
    if (lending_info.supply_token_mint.toString() == NATIVE_MINT.toString()) {
        let wrap_ix = await ins.wrap_native(amount, wallet, connection, true);
        tx.add(wrap_ix);
    }

    let supply_ix = await ins.depositReserveLiquidityAndObligationCollateralInstruction(
        amount, supply_token_address, reserve_token_address, lending_info.reserve_address, lending_info.reserve_info.liquidity.supply_pubkey, lending_info.reserve_token_mint, info.SOLEND_LENDING_MARKET_ID, info.MARKET_PDA, lending_info.reserve_info.collateral.supply_pubkey,await obligation.get_obligation_public_key(wallet), wallet,lending_info.reserve_info.liquidity.pyth_oracle_pubkey, lending_info.reserve_info.liquidity.switchboard_oracle_pubkey,wallet
    );
    console.log(supply_ix.keys[0].pubkey.toString());
    tx.add(supply_ix);
    return tx;
}