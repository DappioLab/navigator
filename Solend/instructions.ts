enum LendingInstruction {
    InitLendingMarket = 0,
    SetLendingMarketOwner = 1,
    InitReserve = 2,
    RefreshReserve = 3,
    DepositReserveLiquidity = 4,
    RedeemReserveCollateral = 5,
    InitObligation = 6,
    RefreshObligation = 7,
    DepositObligationCollateral = 8,
    WithdrawObligationCollateral = 9,
    BorrowObligationLiquidity = 10,
    RepayObligationLiquidity = 11,
    LiquidateObligation = 12,
    FlashLoan = 13,
    DepositReserveLiquidityAndObligationCollateral = 14,
    WithdrawObligationCollateralAndRedeemReserveLiquidity = 15,
    SyncNative = 17,
}
import * as info from "./solendInfo"
const SOLENDPROGRAMID = info.SOLENDPROGRAMID;
import * as solendUtil from "./util"
import * as util from "../util"

// deposit
import { TOKEN_PROGRAM_ID, NATIVE_MINT, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';

import {
    PublicKey,
    SYSVAR_CLOCK_PUBKEY,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    TransferParams,
    Connection,
    SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import BN from 'bn.js';
import { publicKey, struct, u64, u128, u8, bool, u16 } from "@project-serum/borsh";
import { getObligationPublicKey, obligationCreated } from "./obligation";
/// Deposit liquidity into a reserve in exchange for collateral, and deposit the collateral as well.
export const depositReserveLiquidityAndObligationCollateralInstruction = (
    liquidityAmount: number | BN,
    sourceLiquidity: PublicKey,
    sourceCollateral: PublicKey,
    reserve: PublicKey,
    reserveLiquiditySupply: PublicKey,
    reserveCollateralMint: PublicKey,
    lendingMarket: PublicKey,
    lendingMarketAuthority: PublicKey,
    destinationCollateral: PublicKey,
    obligation: PublicKey,
    obligationOwner: PublicKey,
    pythOracle: PublicKey,
    switchboardFeedAddress: PublicKey,
    transferAuthority: PublicKey,
): TransactionInstruction => {
    const dataLayout = struct([
        u8('instruction'),
        u64('liquidityAmount'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            instruction:
                LendingInstruction.DepositReserveLiquidityAndObligationCollateral,
            liquidityAmount: new BN(liquidityAmount),
        },
        data,
    );

    const keys = [
        { pubkey: sourceLiquidity, isSigner: false, isWritable: true },
        { pubkey: sourceCollateral, isSigner: false, isWritable: true },
        { pubkey: reserve, isSigner: false, isWritable: true },
        { pubkey: reserveLiquiditySupply, isSigner: false, isWritable: true },
        { pubkey: reserveCollateralMint, isSigner: false, isWritable: true },
        { pubkey: lendingMarket, isSigner: false, isWritable: true },
        { pubkey: lendingMarketAuthority, isSigner: false, isWritable: false },
        { pubkey: destinationCollateral, isSigner: false, isWritable: true },
        { pubkey: obligation, isSigner: false, isWritable: true },
        { pubkey: obligationOwner, isSigner: true, isWritable: false },
        { pubkey: pythOracle, isSigner: false, isWritable: false },
        { pubkey: switchboardFeedAddress, isSigner: false, isWritable: false },
        { pubkey: transferAuthority, isSigner: true, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SOLENDPROGRAMID,
        data,
    });
};




// withdraw


/// Redeem collateral from a reserve in exchange for liquidity.
export const withdrawObligationCollateralAndRedeemReserveLiquidity = (
    collateralAmount: number | BN,
    sourceCollateral: PublicKey,
    destinationCollateral: PublicKey,
    withdrawReserve: PublicKey,
    obligation: PublicKey,
    lendingMarket: PublicKey,
    lendingMarketAuthority: PublicKey,
    destinationLiquidity: PublicKey,
    reserveCollateralMint: PublicKey,
    reserveLiquiditySupply: PublicKey,
    obligationOwner: PublicKey,
    transferAuthority: PublicKey,
): TransactionInstruction => {
    const dataLayout = struct([
        u8('instruction'),
        u64('collateralAmount'),
    ]);

    //console.log(new BN(collateralAmount).toString());
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            instruction:
                LendingInstruction.WithdrawObligationCollateralAndRedeemReserveLiquidity,
            collateralAmount: new BN(collateralAmount),
        },
        data,
    );

    const keys = [
        { pubkey: sourceCollateral, isSigner: false, isWritable: true },
        { pubkey: destinationCollateral, isSigner: false, isWritable: true },
        { pubkey: withdrawReserve, isSigner: false, isWritable: true },
        { pubkey: obligation, isSigner: false, isWritable: true },
        { pubkey: lendingMarket, isSigner: false, isWritable: false },
        { pubkey: lendingMarketAuthority, isSigner: false, isWritable: false },
        { pubkey: destinationLiquidity, isSigner: false, isWritable: true },
        { pubkey: reserveCollateralMint, isSigner: false, isWritable: true },
        { pubkey: reserveLiquiditySupply, isSigner: false, isWritable: true },
        { pubkey: obligationOwner, isSigner: true, isWritable: false },
        { pubkey: transferAuthority, isSigner: true, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SOLENDPROGRAMID,
        data,
    });
};


// refresh reserve


/// Accrue interest and update market price of liquidity on a reserve.
///
/// Accounts expected by this instruction:
///
///   0. `[writable]` Reserve account.
///   1. `[]` Clock sysvar.
///   2. `[optional]` Reserve liquidity oracle account.
///                     Required if the reserve currency is not the lending market quote
///                     currency.
export const refreshReserveInstruction = (
    reserve: PublicKey,
    oracle?: PublicKey,
    switchboardFeedAddress?: PublicKey,
): TransactionInstruction => {
    const dataLayout = struct([u8('instruction')]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({ instruction: LendingInstruction.RefreshReserve }, data);

    const keys = [{ pubkey: reserve, isSigner: false, isWritable: true }];

    if (oracle) {
        keys.push({ pubkey: oracle, isSigner: false, isWritable: false });
    }
    if (switchboardFeedAddress) {
        keys.push({
            pubkey: switchboardFeedAddress,
            isSigner: false,
            isWritable: false,
        });
    }

    keys.push({
        pubkey: SYSVAR_CLOCK_PUBKEY,
        isSigner: false,
        isWritable: false,
    });

    return new TransactionInstruction({
        keys,
        programId: SOLENDPROGRAMID,
        data,
    });
};

// refresh obligation


/// Refresh an obligation"s accrued interest and collateral and liquidity prices. Requires
/// refreshed reserves, as all obligation collateral deposit reserves in order, followed by all
/// liquidity borrow reserves in order.
///
/// Accounts expected by this instruction:
///
///   0. `[writable]` Obligation account.
///   1. `[]` Clock sysvar.
///   .. `[]` Collateral deposit reserve accounts - refreshed, all, in order.
///   .. `[]` Liquidity borrow reserve accounts - refreshed, all, in order.
export const refreshObligationInstruction = (
    obligation: PublicKey,
    depositReserves: PublicKey[],
    borrowReserves: PublicKey[],
): TransactionInstruction => {
    const dataLayout = struct([u8('instruction')]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        { instruction: LendingInstruction.RefreshObligation },
        data,
    );

    const keys = [
        { pubkey: obligation, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ];

    depositReserves.forEach((depositReserve) =>
        keys.push({
            pubkey: depositReserve,
            isSigner: false,
            isWritable: false,
        }),
    );
    borrowReserves.forEach((borrowReserve) =>
        keys.push({
            pubkey: borrowReserve,
            isSigner: false,
            isWritable: false,
        }),
    );
    return new TransactionInstruction({
        keys,
        programId: SOLENDPROGRAMID,
        data,
    });
};


export async function createObligationAccountIx(wallet :PublicKey) {
    let tx = new Transaction;
    const seed = info.SOLENDLENDINGMARKETID.toString().slice(0, 32);
    let createAccountFromSeedIx = await  SystemProgram.createAccountWithSeed({fromPubkey:wallet,seed:seed,space:1300,newAccountPubkey:await getObligationPublicKey(wallet),basePubkey:wallet,lamports:9938880,programId:info.SOLENDPROGRAMID});
    //console.log(createAccountFromSeedIx);
    tx.add(createAccountFromSeedIx);
    const dataLayout = struct([u8('instruction')]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        { instruction: LendingInstruction.InitObligation },
        data,
    );
    let keys = [
        { pubkey: await getObligationPublicKey(wallet), isSigner: false, isWritable: true},
        {pubkey: info.SOLENDLENDINGMARKETID, isSigner: false, isWritable: false},
        {pubkey: wallet, isSigner: true, isWritable: true},
    ];
    keys.push({
        pubkey: SYSVAR_CLOCK_PUBKEY,
        isSigner: false,
        isWritable: false,
    });
    keys.push({
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
    });
    keys.push({
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
    });

    let createObligationIx = new TransactionInstruction(
        {keys,programId:info.SOLENDPROGRAMID,data:data}
        )
    tx.add(createObligationIx);
    return tx;
}
