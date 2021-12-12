import { checkTokenAccount, findAssociatedTokenAddress, wrapNative } from "../util";
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
import { SwapInfo } from "./swapInfoLayout";
import { wrapInfo } from "./wrapInfo";
export async function createDepositTx(swapInfo: SwapInfo, AtokenAmount: BN, BtokenAmount: BN, minimalRecieve: BN, wallet: PublicKey, connection: Connection) {
    let tx: Transaction = new Transaction;
    let cleanupTx = new Transaction;
    // check if Token A source account is created
    let AtokenSourceAccount = await findAssociatedTokenAddress(wallet, swapInfo.mintA);
    let AtokenSourceAccountCreated = await checkTokenAccount(AtokenSourceAccount, connection)

    if (!AtokenSourceAccountCreated) {
        //if false add a create IX
        let createAtokenAccount = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, swapInfo.mintA, AtokenSourceAccount, wallet, wallet);
        tx.add(createAtokenAccount);
    }
    // check if Token B source account is created
    let BtokenSourceAccount = await findAssociatedTokenAddress(wallet, swapInfo.mintB);
    let BtokenSourceAccountCreated = await checkTokenAccount(BtokenSourceAccount, connection)
    if (!BtokenSourceAccountCreated) {
        //if false add a create IX
        let createBtokenAccount = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, swapInfo.mintB, BtokenSourceAccount, wallet, wallet);
        tx.add(createBtokenAccount);
    }
    // check if LP Token account is created
    let LPtokenAccount = await findAssociatedTokenAddress(wallet, swapInfo.poolMint);
    if (await checkTokenAccount(LPtokenAccount, connection)) { }
    else {
        //if false add a create IX
        let createAtokenAccount = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, swapInfo.poolMint, LPtokenAccount, wallet, wallet);
        tx.add(createAtokenAccount);
    }
    // check Token A is wSol
    if (swapInfo.mintA.toString() == NATIVE_MINT.toString()) {
        // if true add a wrapNative IX
        let wrapNativeIns = await wrapNative(AtokenAmount, wallet, connection, false);
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, AtokenSourceAccount, wallet, wallet, []))
        tx.add(wrapNativeIns);
    }
    // if Token A source account is created in this tx
    else if (!AtokenSourceAccountCreated) {
        // add a close account IX
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, AtokenSourceAccount, wallet, wallet, []))
    }
    // check Token A is wSol
    if (swapInfo.mintB.toString() == NATIVE_MINT.toString()) {
        // if true add a wrapNative IX
        let wrapNativeIns = await wrapNative(BtokenAmount, wallet, connection, false);
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, BtokenSourceAccount, wallet, wallet, []))
        tx.add(wrapNativeIns);
    }
    // if Token B source account is created in this tx
    else if (!BtokenSourceAccountCreated) {
        // add a close account IX
        cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, BtokenSourceAccount, wallet, wallet, []))
    }
    // if Token A is wrapped
    if (swapInfo.mintAWrapped) {
        // check underlying tokan account is created
        let wrapMintAtokenAddress = await findAssociatedTokenAddress(wallet, swapInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey);
        if (!(await checkTokenAccount(wrapMintAtokenAddress, connection))) {
            // if false add a create IX
            let createAtokenAccount = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, swapInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey, wrapMintAtokenAddress, wallet, wallet);
            tx.add(createAtokenAccount);
            // add a close account IX
            cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, wrapMintAtokenAddress, wallet, wallet, []))
        }
        let wrapAIns = ins.wrapToken(swapInfo.mintAWrapInfo as wrapInfo, wallet, AtokenAmount, AtokenSourceAccount, wrapMintAtokenAddress);
        let multiplyer = (new BN(swapInfo.mintAWrapInfo?.multiplyer as BN))
        if (multiplyer.gt(AtokenAmount)) {
            AtokenAmount = multiplyer;
        }
        else {
            AtokenAmount = AtokenAmount.div(multiplyer);
        }
        AtokenAmount = AtokenAmount.div(new BN(swapInfo.mintAWrapInfo?.multiplyer as BN));

        tx.add(wrapAIns);
    }
    // if Token B is wrapped
    if (swapInfo.mintBWrapped == true) {
        // check underlying tokan account is created
        let wrapMintBtokenAddress = await findAssociatedTokenAddress(wallet, swapInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey);
        if (!(await checkTokenAccount(wrapMintBtokenAddress, connection))) {
            // if false add a create IX
            let createBtokenAccount = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, swapInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey, wrapMintBtokenAddress, wallet, wallet);
            tx.add(createBtokenAccount);
            // add a close account IX
            cleanupTx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, wrapMintBtokenAddress, wallet, wallet, []))
        }
        let wrapBIns = ins.wrapToken(swapInfo.mintBWrapInfo as wrapInfo, wallet, BtokenAmount, wrapMintBtokenAddress, BtokenSourceAccount);
        let multiplyer = (new BN(swapInfo.mintBWrapInfo?.multiplyer as BN))
        if (multiplyer.gt(BtokenAmount)) {
            BtokenAmount = multiplyer;
        }
        else {
            BtokenAmount = BtokenAmount.div(multiplyer);
        }
        tx.add(wrapBIns);
    }
    console.log(BtokenAmount);
    let depositIns = ins.deposit(swapInfo, AtokenAmount, BtokenAmount, minimalRecieve, wallet, AtokenSourceAccount, BtokenSourceAccount, LPtokenAccount)
    tx.add(depositIns);
    tx.add(cleanupTx);
    return tx;
}