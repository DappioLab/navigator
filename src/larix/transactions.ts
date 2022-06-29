import { createATAWithoutCheckIx, findAssociatedTokenAddress } from "../utils";
import {
  NATIVE_MINT,
  createCloseAccountInstruction,
} from "@solana/spl-token-v2";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { wrapNative } from "../utils";
import {
  checkMinerCreated,
  MinerInfo,
  newMinerAccountPub,
  parseReserveData,
  ReserveInfo,
  ReserveInfoWrapper,
} from "./infos";
import {
  createInitMinningIx,
  depositReserveLiquidity,
  depositToMiner,
  RedeemReserveLiquidity,
  refreshReserveInstruction,
  withdrawFromMiner,
  claimRewardIx,
} from "./instructions";
import { LARIX_MARKET_ID, LARIX_MINT, MARKET_PDA } from "./ids";

export async function createDepositTx(
  reserveInfoWrapper: ReserveInfoWrapper,
  wallet: PublicKey,
  amount: BN,
  connection: Connection,
  minerPubKey?: PublicKey,
  supplyTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey
) {
  let tx: Transaction = new Transaction();
  let cleanupTx = new Transaction();
  if (minerPubKey) {
  } else {
    minerPubKey = await newMinerAccountPub(wallet);
    if (!(await checkMinerCreated(connection, wallet))) {
      let createMiningIx = await createInitMinningIx(wallet);
      tx.add(createMiningIx);
    }
  }

  if (reserveTokenAddress) {
    reserveTokenAddress = supplyTokenAddress as PublicKey;
  } else
    reserveTokenAddress = await findAssociatedTokenAddress(
      wallet,
      reserveInfoWrapper.reserveTokenMint()
    );
  if (supplyTokenAddress) {
    supplyTokenAddress = supplyTokenAddress as PublicKey;
  } else
    supplyTokenAddress = await findAssociatedTokenAddress(
      wallet,
      reserveInfoWrapper.supplyTokenMint()
    );

  let createAtaIx = await createATAWithoutCheckIx(
    wallet,
    reserveInfoWrapper.reserveTokenMint()
  );
  tx.add(createAtaIx);

  let refreshIx = refreshReserveInstruction(
    reserveInfoWrapper.reserveInfo.reserveId,
    reserveInfoWrapper.reserveInfo.liquidity.OraclePubkey,
    reserveInfoWrapper.reserveInfo.liquidity.larixOraclePubkey
  );
  tx.add(refreshIx);

  if (reserveInfoWrapper.supplyTokenMint().equals(NATIVE_MINT)) {
    let wrapIx = await wrapNative(amount, wallet, connection, true);
    cleanupTx.add(
      createCloseAccountInstruction(supplyTokenAddress, wallet, wallet, [])
    );
    tx.add(wrapIx);
  }

  let supplyIx = depositReserveLiquidity(
    // Breaking change Fixed
    amount,
    supplyTokenAddress,
    reserveTokenAddress,
    reserveInfoWrapper.reserveInfo.reserveId,
    reserveInfoWrapper.reserveTokenMint(),
    reserveInfoWrapper.reserveInfo.liquidity.supplyPubkey,
    LARIX_MARKET_ID,
    MARKET_PDA,
    wallet
  );

  tx.add(supplyIx);
  tx.add(refreshIx);
  let miningIx = await depositToMiner(
    reserveInfoWrapper.reserveInfo.farm.unCollSupply,
    minerPubKey,
    reserveInfoWrapper.reserveInfo.reserveId,
    reserveTokenAddress,
    wallet
  );
  tx.add(miningIx);
  cleanupTx.add(
    createCloseAccountInstruction(reserveTokenAddress, wallet, wallet, [])
  );
  tx.add(cleanupTx);
  return tx;
}

export async function createWithdrawTx(
  wallet: PublicKey,
  amount: BN,
  reserveInfoWrapper: ReserveInfoWrapper,
  minerPub: PublicKey,
  connection: Connection,
  createWithdrawTokenATA: boolean = true,
  withdrawTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey
) {
  let tx = new Transaction();
  let cleanupTx = new Transaction();

  let refreshIx = refreshReserveInstruction(
    reserveInfoWrapper.reserveInfo.reserveId,
    reserveInfoWrapper.reserveInfo.liquidity.OraclePubkey,
    reserveInfoWrapper.reserveInfo.liquidity.larixOraclePubkey
  );
  tx.add(refreshIx);

  if (reserveTokenAddress) {
    reserveTokenAddress = reserveTokenAddress as PublicKey;
  } else
    reserveTokenAddress = await findAssociatedTokenAddress(
      wallet,
      reserveInfoWrapper.reserveTokenMint()
    );
  if (withdrawTokenAddress) {
    withdrawTokenAddress = withdrawTokenAddress as PublicKey;
  } else
    withdrawTokenAddress = await findAssociatedTokenAddress(
      wallet,
      reserveInfoWrapper.supplyTokenMint()
    );
  let createWithdrawTokenATAIx = await createATAWithoutCheckIx(
    wallet,
    reserveInfoWrapper.supplyTokenMint()
  );
  tx.add(createWithdrawTokenATAIx);
  let createReserveATA = await createATAWithoutCheckIx(
    wallet,
    reserveInfoWrapper.reserveTokenMint()
  );
  tx.add(createReserveATA);

  let withdrawFarm = await withdrawFromMiner(
    amount,
    reserveInfoWrapper.reserveInfo.farm.unCollSupply,
    reserveTokenAddress,
    minerPub,
    reserveInfoWrapper.reserveInfo.reserveId,
    wallet
  );
  tx.add(withdrawFarm);

  tx.add(refreshIx);
  let withdrawIns = RedeemReserveLiquidity(
    reserveTokenAddress,
    withdrawTokenAddress,

    reserveInfoWrapper.reserveInfo.reserveId,
    reserveInfoWrapper.reserveTokenMint(),
    reserveInfoWrapper.reserveInfo.liquidity.supplyPubkey,
    wallet
  );

  tx.add(withdrawIns);
  if (reserveInfoWrapper.supplyTokenMint().equals(NATIVE_MINT)) {
    cleanupTx.add(
      createCloseAccountInstruction(withdrawTokenAddress, wallet, wallet, [])
    );
  }
  cleanupTx.add(
    createCloseAccountInstruction(reserveTokenAddress, wallet, wallet, [])
  );
  tx.add(cleanupTx);
  return tx;
}

export async function claimReward(
  wallet: PublicKey,
  minerInfo: MinerInfo,
  connection: Connection
) {
  let tx: Transaction = new Transaction();
  let reservepub: PublicKey[] = [];
  for (let index of minerInfo.indexs) {
    reservepub.push(index.reserve);
  }
  let reserveAccounts = await connection.getMultipleAccountsInfo(reservepub);
  let allReserve: ReserveInfo[] = [];
  for (let index = 0; index < reserveAccounts.length; index++) {
    allReserve.push(
      parseReserveData(reserveAccounts[index]?.data, reservepub[index])
    );
  }
  for (let reserve of allReserve) {
    tx.add(
      refreshReserveInstruction(
        reserve.reserveId,
        reserve.liquidity.OraclePubkey,
        reserve.liquidity.larixOraclePubkey
      )
    );
  }
  let larixTokenAddress = await findAssociatedTokenAddress(wallet, LARIX_MINT);
  let createLarixATA = await createATAWithoutCheckIx(wallet, LARIX_MINT);
  tx.add(createLarixATA);
  tx.add(
    claimRewardIx(larixTokenAddress, minerInfo.farmerId, wallet, reservepub)
  );
  return tx;
}
