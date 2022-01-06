import { checkTokenAccount, createATAWithoutCheckIx, findAssociatedTokenAddress, wrapNative } from "../util";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import * as ins from "./instructions";
import { Vault } from "./vaultInfo";
import { checkUserVaultCreated } from "./userVault";


export async function deposit(vault: Vault, wallet: PublicKey, amount: BN, connection: Connection, underlyingTokenAccount?: PublicKey) {
    let tx: Transaction = new Transaction;
    let cleanupTx = new Transaction;
    if (underlyingTokenAccount) {
        underlyingTokenAccount = underlyingTokenAccount as PublicKey;
    }
    else{
        underlyingTokenAccount = await findAssociatedTokenAddress(wallet, vault.underlyingTokenMint);
    }
    if (vault.underlyingTokenMint.toString() == NATIVE_MINT.toString()) {
        tx.add(await wrapNative(amount, wallet, connection, true))
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, underlyingTokenAccount, wallet, wallet
            , []))
    }
    tx.add(await createATAWithoutCheckIx(wallet, vault.derivativeTokenMint))
    if (!(await checkUserVaultCreated(wallet, vault.infoPubkey, connection))) {
        tx.add(await ins.createUserVaultIx(vault, wallet));
    }
    tx.add(await ins.depositIx(vault, wallet, underlyingTokenAccount, amount))


    tx.add(cleanupTx)
    return tx;
}
export async function instantWithdraw(vault: Vault, wallet: PublicKey, amount: BN) {
    let tx: Transaction = new Transaction;
    let cleanupTx = new Transaction;
    tx.add(await createATAWithoutCheckIx(wallet, vault.underlyingTokenMint))
    let underlyingTokenAccount = await findAssociatedTokenAddress(wallet, vault.underlyingTokenMint); 
    tx.add(await ins.instantWithdrawIx(vault, wallet, underlyingTokenAccount, amount))
    if (vault.underlyingTokenMint.toString() == NATIVE_MINT.toString()) {
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, underlyingTokenAccount, wallet, wallet
            , []))
    }
    tx.add(cleanupTx)
    return tx;
}

export async function initiateWithdraw(vault: Vault, wallet: PublicKey, amount: BN, shareTokenAccount?: PublicKey) {
    let tx: Transaction = new Transaction;
    if (shareTokenAccount) {
        shareTokenAccount = shareTokenAccount as PublicKey;
    }
    else {
        shareTokenAccount = await findAssociatedTokenAddress(wallet, vault.derivativeTokenMint);
    }
    tx.add(await ins.initiateWithdrawIx(vault, wallet, shareTokenAccount, amount))
    return tx;
}

export async function completeWithdraw(vault: Vault, wallet: PublicKey,) {
    let tx: Transaction = new Transaction;
    let cleanupTx = new Transaction;
    tx.add(await createATAWithoutCheckIx(wallet, vault.underlyingTokenMint))
    let underlyingTokenAccount = await findAssociatedTokenAddress(wallet, vault.underlyingTokenMint);
    tx.add(await ins.completeWithdrawIx(vault, wallet, underlyingTokenAccount))
    if (vault.underlyingTokenMint.toString() == NATIVE_MINT.toString()) {
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, underlyingTokenAccount, wallet, wallet, []))
    }
    tx.add(cleanupTx)
    return tx;

}
export async function claimShares(vault: Vault, wallet: PublicKey,) {
    let tx: Transaction = new Transaction;
    tx.add(await createATAWithoutCheckIx(wallet, vault.derivativeTokenMint))
    let shareTokenAccount = await findAssociatedTokenAddress(wallet, vault.derivativeTokenMint);
    tx.add(await ins.claimShareIx(vault, wallet, shareTokenAccount))
    return tx;
}