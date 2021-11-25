import * as solana from "@solana/web3.js"
import * as solend from "./solend";
import { check_token_account, findAssociatedTokenAddress } from "./util";
import { TOKEN_PROGRAM_ID, NATIVE_MINT, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import BN from "bn.js";
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
import * as state from "./state";
export async function create_deposit_tx(lending_info: lending_info, wallet: PublicKey, amount: BN, connection: Connection, supply_token_address?: PublicKey, reserve_token_address?: PublicKey) {

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
    //console.log(supply_ix.keys[0].pubkey.toString());
    tx.add(supply_ix);
    return tx;
}

export async function createWithdrawTx(wallet:PublicKey,reserve_address:PublicKey ,amount:BN,obligationInfo:obligation.obligation,lendingMarketInfo:lending_info,connection:Connection,withdrawTokenAddress?: PublicKey, reserveTokenAddress?: PublicKey) {
    let tx = new Transaction;
    let depositReserves: PublicKey[] = [];
    let borrowedReserves: PublicKey[] = [];
    for (let reserve of obligationInfo.depositCollateral){
        depositReserves.push(reserve.reserve);
        let reserveInfo = state.parseReserveData((await connection.getAccountInfo(reserve.reserve))?.data)
        tx.add(
            ins.refreshReserveInstruction(reserve.reserve,reserveInfo.liquidity.pyth_oracle_pubkey,reserveInfo.liquidity.switchboard_oracle_pubkey)
        );
    }
    for (let reserve of obligationInfo.borrowedLiqudity){
        borrowedReserves.push(reserve.reserve);
        let reserveInfo = state.parseReserveData((await connection.getAccountInfo(reserve.reserve))?.data)
        tx.add(
            ins.refreshReserveInstruction(reserve.reserve,reserveInfo.liquidity.pyth_oracle_pubkey,reserveInfo.liquidity.switchboard_oracle_pubkey)
        );
    }
    tx.add(ins.refreshObligationInstruction(await obligation.get_obligation_public_key(wallet),depositReserves,borrowedReserves));
    if (await obligation.obligation_created(connection,wallet)){

    }
    else{
        let create_obligation_ix = await ins.create_obligation_account_ix(wallet)
        tx.add(create_obligation_ix);
    }
    if (reserveTokenAddress) {
        reserveTokenAddress = reserveTokenAddress as PublicKey;
    }
    else
        reserveTokenAddress = await findAssociatedTokenAddress(wallet, lendingMarketInfo.reserve_token_mint);
    if (withdrawTokenAddress) {
        withdrawTokenAddress = withdrawTokenAddress as PublicKey;
    }
    else
        withdrawTokenAddress = await findAssociatedTokenAddress(wallet, lendingMarketInfo.supply_token_mint);
    if (await check_token_account(reserveTokenAddress, connection)) { }
    else {
        let create_ata_ix = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, lendingMarketInfo.reserve_token_mint, reserveTokenAddress, wallet, wallet);
        tx.add(create_ata_ix);
    }
    let withdrawIns = ins.withdrawObligationCollateralAndRedeemReserveLiquidity(
        amount,
        lendingMarketInfo.reserve_info.collateral.supply_pubkey,
        reserveTokenAddress,reserve_address,await obligation.get_obligation_public_key(wallet),info.SOLEND_LENDING_MARKET_ID,info.MARKET_PDA,withdrawTokenAddress,lendingMarketInfo.reserve_token_mint,lendingMarketInfo.reserve_info.liquidity.supply_pubkey,wallet,wallet);
    
    tx.add(withdrawIns);
    if (lendingMarketInfo.supply_token_mint.toString()== NATIVE_MINT.toString()){
        tx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,withdrawTokenAddress,wallet,wallet,[]))
    }
    return tx;

}