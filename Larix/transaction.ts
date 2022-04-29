import {
  checkTokenAccount,
  createATAWithoutCheckIx,
  findAssociatedTokenAddress,
} from "../util";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import * as ins from "./instructions";
import { lendingInfo } from "./larix";
import * as info from "./larixInfo";
import * as state from "./state";
import * as miner from "./mineInfo";
import { wrapNative } from "../util";
export async function createDepositTx(
  lendingInfo: lendingInfo,
  wallet: PublicKey,
  amount: BN,
  connection: Connection,
  minerPubKey?: PublicKey,
  supplyTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey,
) {
  let tx: Transaction = new Transaction();
  let cleanupTx = new Transaction();
  if (minerPubKey) {
  } else {
    minerPubKey = await miner.newMinerAccountPub(wallet);
    if (!(await miner.checkMinerCreated(connection, wallet))) {
      let createMiningIx = await ins.createInitMinningIx(wallet);
      tx.add(createMiningIx);
    }
  }

  if (reserveTokenAddress) {
    reserveTokenAddress = supplyTokenAddress as PublicKey;
  } else
    reserveTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingInfo.reserveTokenMint,
    );
  if (supplyTokenAddress) {
    supplyTokenAddress = supplyTokenAddress as PublicKey;
  } else
    supplyTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingInfo.supplyTokenMint,
    );

  let createAtaIx = await createATAWithoutCheckIx(
    wallet,
    lendingInfo.reserveTokenMint,
  );
  tx.add(createAtaIx);

  
  let refreshIx = await ins.refreshReserveInstruction(
    lendingInfo.reserveAddress,
    lendingInfo.reserveInfo.liquidity.OraclePubkey,
    lendingInfo.reserveInfo.liquidity.larixOraclePubkey,
  );
  //console.log(refreshIx);
  tx.add(refreshIx);
  if (lendingInfo.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
    let wrapIx = await wrapNative(amount, wallet, connection, true);
    cleanupTx.add(
      createCloseAccountInstruction(supplyTokenAddress, wallet, wallet, []),
    );
    tx.add(wrapIx);
  }

  let supplyIx = await ins.depositReserveLiquidity(
    // Breaking change Fixed
    amount,
    supplyTokenAddress,
    reserveTokenAddress,
    lendingInfo.reserveAddress,
    lendingInfo.reserveTokenMint,
    lendingInfo.reserveInfo.liquidity.supplyPubkey,

    info.LARIX_MARKET_ID,
    info.MARKETPDA,
    wallet,
  );
  //console.log(supplyIx.keys[0].pubkey.toString());

  tx.add(supplyIx);
  tx.add(refreshIx);
  let miningIx = await ins.depositToMiner(
    lendingInfo.reserveInfo.farm.unCollSupply,
    minerPubKey,
    lendingInfo.reserveAddress,
    reserveTokenAddress,
    wallet,
  );
  tx.add(miningIx);
  cleanupTx.add(
    createCloseAccountInstruction(reserveTokenAddress, wallet, wallet, []),
  );
  tx.add(cleanupTx);
  return tx;
}

export async function createWithdrawTx(
  wallet: PublicKey,
  amount: BN,
  lendingMarketInfo: lendingInfo,
  minerPub: PublicKey,
  connection: Connection,
  createWithdrawTokenATA: boolean = true,
  withdrawTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey,
) {
  let tx = new Transaction();
  let cleanupTx = new Transaction();

  let refreshIx = await ins.refreshReserveInstruction(
    lendingMarketInfo.reserveAddress,
    lendingMarketInfo.reserveInfo.liquidity.OraclePubkey,
    lendingMarketInfo.reserveInfo.liquidity.larixOraclePubkey,
  );
  tx.add(refreshIx);
  if (reserveTokenAddress) {
    reserveTokenAddress = reserveTokenAddress as PublicKey;
  } else
    reserveTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingMarketInfo.reserveTokenMint,
    );
  if (withdrawTokenAddress) {
    withdrawTokenAddress = withdrawTokenAddress as PublicKey;
  } else
    withdrawTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingMarketInfo.supplyTokenMint,
    );
  let createWithdrawTokenATAIx = await createATAWithoutCheckIx(
    wallet,
    lendingMarketInfo.supplyTokenMint,
  );
  tx.add(createWithdrawTokenATAIx);
  let createReserveATA = await createATAWithoutCheckIx(
    wallet,
    lendingMarketInfo.reserveTokenMint,
  );
  tx.add(createReserveATA);

  let withdrawFarm = await ins.withdrawFromMiner(
    amount,
    lendingMarketInfo.reserveInfo.farm.unCollSupply,
    reserveTokenAddress,
    minerPub,
    lendingMarketInfo.reserveAddress,

    wallet,
  );
  tx.add(withdrawFarm);

  tx.add(refreshIx);
  let withdrawIns = ins.RedeemReserveLiquidity(
    reserveTokenAddress,
    withdrawTokenAddress,

    lendingMarketInfo.reserveAddress,
    lendingMarketInfo.reserveTokenMint,
    lendingMarketInfo.reserveInfo.liquidity.supplyPubkey,
    wallet,
  );

  tx.add(withdrawIns);
  if (lendingMarketInfo.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
    cleanupTx.add(
      createCloseAccountInstruction(withdrawTokenAddress, wallet, wallet, []),
    );
  }
  cleanupTx.add(
    createCloseAccountInstruction(reserveTokenAddress, wallet, wallet, []),
  );
  tx.add(cleanupTx);
  return tx;
}

export async function claimReward(
  wallet: PublicKey,
  minerIn: miner.MinerInfo,
  connection: Connection,
) {
  let tx: Transaction = new Transaction();
  let reservepub: PublicKey[] = [];
  for (let index of minerIn.indexs) {
    reservepub.push(index.reserve);
  }
  let reserveAccounts = await connection.getMultipleAccountsInfo(reservepub);
  let allReserve: state.Reserve[] = [];
  for (let index = 0; index < reserveAccounts.length; index++) {
    allReserve.push(
      state.parseReserveData(reserveAccounts[index]?.data, reservepub[index]),
    );
  }
  for (let reserve of allReserve) {
    tx.add(
      ins.refreshReserveInstruction(
        reserve.infoPubkey,
        reserve.liquidity.OraclePubkey,
        reserve.liquidity.larixOraclePubkey,
      ),
    );
  }
  let larixTokenAddress = await findAssociatedTokenAddress(
    wallet,
    info.LARIX_MINT,
  );
  let createLarixATA = await createATAWithoutCheckIx(wallet, info.LARIX_MINT);
  tx.add(createLarixATA);
  tx.add(
    ins.claimReward(larixTokenAddress, minerIn.infoPub, wallet, reservepub),
  );
  return tx;
}
