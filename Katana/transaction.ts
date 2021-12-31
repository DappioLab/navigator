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


export async function deposit(vault:Vault,wallet:PublicKey,amount:BN,connection:Connection,tokenAccount?:PublicKey) {
    let tx: Transaction = new Transaction;
    let cleanupTx = new Transaction;
    if (tokenAccount) {
        tokenAccount = tokenAccount as PublicKey;
    }
    else
    tokenAccount = await findAssociatedTokenAddress(wallet, vault.underlyingTokenMint);
    if (vault.underlyingTokenMint.toString() == NATIVE_MINT.toString()){
        tx.add(await wrapNative(amount,wallet,connection,true))
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,tokenAccount,wallet,wallet
            ,[]))
    }
    tx.add(await createATAWithoutCheckIx(wallet,vault.derivativeTokenMint))
    if (!(await checkUserVaultCreated(wallet,vault.infoPubkey,connection) )){
        tx.add(await ins.createUserVaultIx(vault,wallet));
    }
    tx.add(await ins.deposit(vault,wallet,tokenAccount,amount))


    tx.add(cleanupTx)
    return tx;
}