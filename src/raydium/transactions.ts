import {
  createATAWithoutCheckIx,
  findAssociatedTokenAddress,
  wrapNative,
} from "../utils";
import {
  NATIVE_MINT,
  createCloseAccountInstruction,
} from "@solana/spl-token-v2";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Market } from "@project-serum/serum";
import * as ins from "./instructions";
import { AMM_AUTHORITY, POOL_PROGRAM_ID_V3, POOL_PROGRAM_ID_V4 } from "./ids";
import { PoolInfo } from "./infos";

export async function swap(
  pool: PoolInfo,
  fromMint: PublicKey,
  toMint: PublicKey,
  wallet: PublicKey,
  amountIn: BN,
  minAmountOut: BN,
  connection: Connection,
  fromTokenAccount?: PublicKey
) {
  let tx = new Transaction();
  let cleanUpTx = new Transaction();
  if (fromTokenAccount) {
    fromTokenAccount = fromTokenAccount as PublicKey;
  } else {
    fromTokenAccount = await findAssociatedTokenAddress(wallet, fromMint);
  }
  let toTokenAccount = await findAssociatedTokenAddress(wallet, toMint);
  tx.add(await createATAWithoutCheckIx(wallet, toMint, wallet));
  if (fromMint.equals(NATIVE_MINT)) {
    tx.add(await wrapNative(amountIn, wallet, connection, true));
    cleanUpTx.add(
      createCloseAccountInstruction(fromTokenAccount, wallet, wallet, [])
    );
  }
  if (toMint.equals(NATIVE_MINT)) {
    cleanUpTx.add(
      createCloseAccountInstruction(toTokenAccount, wallet, wallet, [])
    );
  }
  let serumMarket = await Market.load(
    connection,
    pool.serumMarket,
    undefined,
    pool.serumProgramId
  );
  let programId = PublicKey.default;
  if (pool.version == 3) {
    programId = POOL_PROGRAM_ID_V3;
  } else if (pool.version == 4) {
    programId = POOL_PROGRAM_ID_V4;
  }
  let serumVaultSigner = await PublicKey.createProgramAddress(
    [
      serumMarket.address.toBuffer(),
      serumMarket.decoded.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
    ],
    serumMarket.programId
  );
  let swapIns = ins.swapInstruction(
    programId,
    pool.poolId,
    AMM_AUTHORITY,
    pool.ammOpenOrders,
    pool.ammTargetOrders,
    pool.poolCoinTokenAccount,
    pool.poolPcTokenAccount,
    pool.serumProgramId,
    pool.serumMarket,
    serumMarket.bidsAddress,
    serumMarket.asksAddress,
    new PublicKey(serumMarket.decoded.eventQueue),
    new PublicKey(serumMarket.decoded.baseVault),
    new PublicKey(serumMarket.decoded.quoteVault),
    serumVaultSigner,
    fromTokenAccount,
    toTokenAccount,
    wallet,
    amountIn,
    minAmountOut
  );
  tx.add(swapIns);
  return [tx, cleanUpTx];
}

export async function addLiquidity(
  pool: PoolInfo,
  wallet: PublicKey,
  maxCoinAmount: BN,
  maxPcAmount: BN,
  coinFixed: BN,
  //0 for coin, 1 for pc
  connection: Connection,
  userCoinTokenAccount?: PublicKey,
  userPcTokenAccount?: PublicKey,
  userLpTokenAccount?: PublicKey
) {
  let tx = new Transaction();
  let cleanUpTx = new Transaction();
  if (userCoinTokenAccount) {
    userCoinTokenAccount = userCoinTokenAccount as PublicKey;
  } else {
    userCoinTokenAccount = await findAssociatedTokenAddress(
      wallet,
      pool.tokenAMint
    );
  }
  if (userPcTokenAccount) {
    userPcTokenAccount = userPcTokenAccount as PublicKey;
  } else {
    userPcTokenAccount = await findAssociatedTokenAddress(
      wallet,
      pool.tokenBMint
    );
  }
  if (userLpTokenAccount) {
    userLpTokenAccount = userLpTokenAccount as PublicKey;
  } else {
    userLpTokenAccount = await findAssociatedTokenAddress(wallet, pool.lpMint);
  }
  tx.add(await createATAWithoutCheckIx(wallet, pool.lpMint));
  if (pool.tokenAMint.equals(NATIVE_MINT)) {
    tx.add(await wrapNative(maxCoinAmount, wallet, connection, true));
    cleanUpTx.add(
      createCloseAccountInstruction(
        await findAssociatedTokenAddress(wallet, pool.tokenAMint),
        wallet,
        wallet,
        []
      )
    );
  }
  if (pool.tokenBMint.equals(NATIVE_MINT)) {
    tx.add(await wrapNative(maxPcAmount, wallet, connection, true));
    cleanUpTx.add(
      createCloseAccountInstruction(
        await findAssociatedTokenAddress(wallet, pool.tokenBMint),
        wallet,
        wallet,
        []
      )
    );
  }
  if (pool.version == 4) {
    let addIns = ins.addLiquidityInstructionV4(
      POOL_PROGRAM_ID_V4,
      pool.poolId,
      AMM_AUTHORITY,
      pool.ammOpenOrders,
      pool.ammTargetOrders,
      pool.lpMint,
      pool.poolCoinTokenAccount,
      pool.poolPcTokenAccount,
      pool.serumMarket,
      userCoinTokenAccount,
      userPcTokenAccount,
      userLpTokenAccount,
      wallet,
      maxCoinAmount,
      maxPcAmount,
      coinFixed
    );
    tx.add(addIns);
  }

  return [tx, cleanUpTx];
}
