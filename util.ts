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


import { AccountLayout, AccountInfo } from "@solana/spl-token";
export async function wrapNative(amount: BN, walletPublicKey: PublicKey, connection: Connection, createAta: boolean) {
    let tx = new Transaction;

    let destinationAta = await findAssociatedTokenAddress(walletPublicKey, NATIVE_MINT);
    if (createAta == true) {
        if ((await connection.getAccountInfo(destinationAta))?.owner.toString() == TOKEN_PROGRAM_ID.toString()) {
            //console.log("wSol was created")

        }
        else {
            //console.log("creating wSol account")
            let createAtaIx = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT, destinationAta, walletPublicKey, walletPublicKey);
            tx.add(createAtaIx);
        }
    }
    let transferPram = { fromPubkey: walletPublicKey, lamports: amount.toNumber(), toPubkey: destinationAta }
    let transferLamportIx = SystemProgram.transfer(transferPram);
    tx.add(transferLamportIx);
    let key = [{ pubkey: destinationAta, isSigner: false, isWritable: true }];
    const dataLayout = struct([u8('instruction')]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        { instruction: 17 },
        data,
    );
    let syncNativeIx = new TransactionInstruction({ keys: key, programId: TOKEN_PROGRAM_ID, data: data });
    tx.add(syncNativeIx);
    return tx;
}
export async function findAssociatedTokenAddress(
    walletAddress: PublicKey,
    tokenMintAddress: PublicKey
): Promise<PublicKey> {
    return (await PublicKey.findProgramAddress(
        [
            walletAddress.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            tokenMintAddress.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    ))[0];
}
export async function checkTokenAccount(publickey: PublicKey, connection: Connection) {
    let accountInfo = await connection.getAccountInfo(publickey);
    if (accountInfo?.owner.toString() == TOKEN_PROGRAM_ID.toString()) {
        return true
    }
    else return false
}


export async function getTokenAccountAmount(connection: Connection, tokenAccountPubkey: PublicKey) {
    let accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
    let tokenAccountInfo = AccountLayout.decode(accountInfo?.data) as AccountInfo;
    let amount = new BN(tokenAccountInfo.amount);
    console.log(amount.toString());

    return amount;
}

