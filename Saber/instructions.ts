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
import { SWAP_PROGRAM_ID } from './saberInfo';
import { wrapInfo } from './wrapInfo';

enum SaberInstruction {
    swap = 1,
    deposit = 2,
    withdraw = 3,
    withdrawOne = 4,
}

export  function deposit(swapInfo :SwapInfo,AtokenAmount: BN , BtokenAmount:BN, minimalRecieve:BN, wallet:PublicKey, AtokenSourceAccount : PublicKey, BtokenSourceAccount: PublicKey ,LPtokenAccount:PublicKey){
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
        {pubkey: swapInfo.infoPublicKey, isSigner: false, isWritable: false},
        {pubkey: swapInfo.authority, isSigner: false, isWritable: false},
        {pubkey: wallet, isSigner: true, isWritable: false},
        {pubkey: AtokenSourceAccount, isSigner: false, isWritable: true},
        {pubkey: BtokenSourceAccount, isSigner: false, isWritable: true},
        {pubkey: swapInfo.tokenAccountA, isSigner: false, isWritable: true},
        {pubkey: swapInfo.tokenAccountB, isSigner: false, isWritable: true},
        {pubkey: swapInfo.poolMint, isSigner: false, isWritable: true},
        {pubkey: LPtokenAccount, isSigner: false, isWritable: true},
        {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
    ];
    return new TransactionInstruction({
        keys,
        programId: SWAP_PROGRAM_ID,
        data,
    });
}

export function wrapToken(wrapInfo:wrapInfo,wallet:PublicKey,amount:BN,wrapInTokenAccount:PublicKey, wrapOutTokenAccount:PublicKey){
    const dataLayout = struct([
        u64('amount'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            amount: new BN(amount),
        },
        data,
    );

    const keys = [
        {pubkey: wrapInfo.wrapAuthority, isSigner: false, isWritable: true},
        {pubkey: wrapInfo.wrappedTokenMint, isSigner: false, isWritable: true},
        {pubkey: wrapInfo.underlyingTokenAccount, isSigner: false, isWritable: true},
        {pubkey: wallet, isSigner: true, isWritable: false},

        {pubkey: wrapInTokenAccount, isSigner: false, isWritable: true},
        {pubkey: wrapOutTokenAccount, isSigner: false, isWritable: true},
        {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
    ];
    return new TransactionInstruction({
        keys,
        programId: SWAP_PROGRAM_ID,
        data,
    });
}
