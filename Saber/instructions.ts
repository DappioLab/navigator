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
import { SwapInfo } from './swapInfoLayout';
import { publicKey, struct, u64, u128, u8, bool, u16 } from "@project-serum/borsh";
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SWAP_PROGRAM_ID ,SABER_WRAP_PROGRAM_ID} from './saberInfo';
import { wrapInfo } from './wrapInfo';

enum SaberInstruction {
    swap = 1,
    deposit = 2,
    withdraw = 3,
    withdrawOne = 4,
}

export function deposit(swapInfo: SwapInfo, AtokenAmount: BN, BtokenAmount: BN, minimalRecieve: BN, wallet: PublicKey, AtokenSourceAccount: PublicKey, BtokenSourceAccount: PublicKey, LPtokenAccount: PublicKey) {
    const dataLayout = struct([
        u8('instruction'),
        u64('AtokenAmount'),
        u64('BtokenAmount'),
        u64('minimalRecieve'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            instruction:
                SaberInstruction.deposit,
            AtokenAmount: new BN(AtokenAmount),
            BtokenAmount: new BN(BtokenAmount),
            minimalRecieve: new BN(minimalRecieve),
        },
        data,
    );
    const keys = [
        { pubkey: swapInfo.infoPublicKey, isSigner: false, isWritable: false },
        { pubkey: swapInfo.authority, isSigner: false, isWritable: false },
        { pubkey: wallet, isSigner: true, isWritable: false },
        { pubkey: AtokenSourceAccount, isSigner: false, isWritable: true },
        { pubkey: BtokenSourceAccount, isSigner: false, isWritable: true },
        { pubkey: swapInfo.tokenAccountA, isSigner: false, isWritable: true },
        { pubkey: swapInfo.tokenAccountB, isSigner: false, isWritable: true },
        { pubkey: swapInfo.poolMint, isSigner: false, isWritable: true },
        { pubkey: LPtokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SWAP_PROGRAM_ID,
        data,
    });
}

export function withdrawOne(swapInfo: SwapInfo, tokenType: String, LPtokenAmount: BN, minimalRecieve: BN, wallet: PublicKey, LPtokenSourceAccount: PublicKey, recieveTokenAccount: PublicKey) {
    const dataLayout = struct([
        u8('instruction'),
        u64('LPtokenAmount'),
        u64('minimalRecieve'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            instruction:
                SaberInstruction.withdrawOne,
            LPtokenAmount: new BN(LPtokenAmount),
            minimalRecieve: new BN(minimalRecieve),
        },
        data,
    );
    let baseTokenAccount = PublicKey.default;
    let quoteTokenAccount = PublicKey.default;
    let feeTokenAccount = PublicKey.default;
    if (tokenType == "A"){
        baseTokenAccount = swapInfo.tokenAccountA;
        quoteTokenAccount = swapInfo.tokenAccountB;
        feeTokenAccount = swapInfo.adminFeeAccountA;
    }
    else if (tokenType == "B") {
        baseTokenAccount = swapInfo.tokenAccountB;
        quoteTokenAccount = swapInfo.tokenAccountA;
        feeTokenAccount = swapInfo.adminFeeAccountB;
    }
    else{
        console.log("panic!!, no withdraw type provided");
    }
    
    const keys = [
        { pubkey: swapInfo.infoPublicKey, isSigner: false, isWritable: false },
        { pubkey: swapInfo.authority, isSigner: false, isWritable: false },
        { pubkey: wallet, isSigner: true, isWritable: false },
        { pubkey: swapInfo.poolMint, isSigner: false, isWritable: true },
        { pubkey: LPtokenSourceAccount, isSigner: false, isWritable: true },
        { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
        { pubkey: quoteTokenAccount, isSigner: false, isWritable: true },
        { pubkey: recieveTokenAccount, isSigner: false, isWritable: true },
        { pubkey: feeTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SWAP_PROGRAM_ID,
        data,
    });
}

export function wrapToken(wrapInfo: wrapInfo, wallet: PublicKey, amount: BN, wrapInTokenAccount: PublicKey, wrapOutTokenAccount: PublicKey) {
    if (amount.eq(new BN(0))){
        return new Transaction;
    }
    const dataLayout = struct([
        u64('amount'),
    ]);
    let data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            amount: new BN(amount),
        },
        data,
    );
    let datahex = data.toString('hex');
    let datastring = 'f223c68952e1f2b6'.concat(datahex);
    data = Buffer.from(datastring, "hex")
    const keys = [
        { pubkey: wrapInfo.wrapAuthority, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.wrappedTokenMint, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.underlyingTokenAccount, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: false },

        { pubkey: wrapInTokenAccount, isSigner: false, isWritable: true },
        { pubkey: wrapOutTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SABER_WRAP_PROGRAM_ID,
        data,
    });
}
export function unwrapToken(wrapInfo: wrapInfo, wallet: PublicKey, unwrapTokenAccount: PublicKey, originalTokenAccount: PublicKey) {
    const dataLayout = struct([
        u64('amount'),
    ]);
    let data = Buffer.alloc(dataLayout.span);
    let datastring = 'd608044db4e6cf9e0a00ffffffffffffffffffffffffffffffff';
    data = Buffer.from(datastring, "hex")
    const keys = [
        { pubkey: wrapInfo.wrapAuthority, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.wrappedTokenMint, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.underlyingTokenAccount, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: false },

        { pubkey: originalTokenAccount, isSigner: false, isWritable: true },
        { pubkey: unwrapTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SABER_WRAP_PROGRAM_ID,
        data,
    });
}