import {
    checkTokenAccount,
    createATAWithoutCheckIx,
    findAssociatedTokenAddress,
    wrapNative,
} from "../../util";
import {
    TOKEN_PROGRAM_ID,
    NATIVE_MINT,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    Token,
} from "@solana/spl-token";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { StrategyState } from "./StrategyState";
import { swap, transfer, borrow, initializeUser, addLiquidity } from "./instructions";
import { parseLendingInfo } from "../lending/lendingInfo";
import { parseV4PoolInfo } from "../../Raydium/poolInfo";
import { Market } from "@project-serum/serum";
export async function getDepositTx(
    strategy: StrategyState,
    wallet: PublicKey,
    stopLoss: BN,
    amount0: BN,
    amount1: BN,
    borrow0: BN,
    borrow1: BN,
    connection: Connection,
) {
    let swapTx = new Transaction();
    let depositTx = new Transaction();
    let preTx = new Transaction();
    let cleanUpTx = new Transaction();
    let init = await initializeUser(wallet, strategy);
    let pubkeys = [strategy.lendingPool0, strategy.lendingPool1, strategy.ammId];
    let accountsInfo = await connection.getMultipleAccountsInfo(pubkeys);
    let lending0 = parseLendingInfo(accountsInfo[0]?.data, pubkeys[0]);
    let lending1 = parseLendingInfo(accountsInfo[1]?.data, pubkeys[1]);
    let ammInfo = parseV4PoolInfo(accountsInfo[2]?.data, pubkeys[2]);
    let serumMarket = await Market.load(
        connection,
        ammInfo.serumMarket,
        undefined,
        ammInfo.serumProgramId,
    );

    preTx.add(init.instruction);
    preTx.add(await createATAWithoutCheckIx(wallet, ammInfo.pcMintAddress));
    preTx.add(await createATAWithoutCheckIx(wallet, ammInfo.coinMintAddress));
    
    let usrATA0 = await findAssociatedTokenAddress(
        wallet, 
        ammInfo.pcMintAddress
    );
    let usrATA1 = await findAssociatedTokenAddress(
        wallet,
        ammInfo.coinMintAddress,
    );
    
    if (ammInfo.pcMintAddress.toString( ) == NATIVE_MINT.toString()){
        preTx.add(await wrapNative(amount0,wallet,connection,false))
        cleanUpTx.add(
            Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,usrATA0,wallet,wallet,[])
        )
    }
    if (ammInfo.coinMintAddress.toString( ) == NATIVE_MINT.toString()){
        preTx.add(await wrapNative(amount1,wallet,connection,false))
        cleanUpTx.add(
            Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,usrATA1,wallet,wallet,[])
        )
    }

    depositTx.add(
        await transfer(
            wallet,
            strategy,
            init.userKey,
            stopLoss,
            amount0,
            amount1,
            usrATA0,
            usrATA1,
        ),
    );
    depositTx.add(
        await borrow(wallet,strategy,lending0,lending1,ammInfo,init.userKey,borrow0,borrow1)
    );
    swapTx.add(
        await swap(wallet,strategy,ammInfo,serumMarket,init.userKey)
    )
    swapTx.add(
        await addLiquidity(wallet,strategy,ammInfo,init.userKey)
    )

    return [preTx,depositTx,swapTx,cleanUpTx]
}
