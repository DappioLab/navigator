import {
  checkTokenAccount,
  findAssociatedTokenAddress,
  createATAWithoutCheckIx,
} from "../utils";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
} from "@solana/spl-token-v2";
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
  DataSizeFilter,
} from "@solana/web3.js";
import * as ins from "./instructions";
import { lendingInfo } from "./solend";
import * as info from "./solendInfo";
import * as obligation from "./obligation";
import * as state from "./state";
import { wrapNative } from "../utils";
export async function createDepositTx(
  lendingInfo: lendingInfo,
  wallet: PublicKey,
  amount: BN,
  connection: Connection,
  supplyTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey
) {
  let tx: Transaction = new Transaction();
  if (await obligation.obligationCreated(connection, wallet)) {
  } else {
    let createObligationIx = await ins.createObligationAccountIx(wallet);
    tx.add(createObligationIx);
  }
  if (reserveTokenAddress) {
    reserveTokenAddress = supplyTokenAddress as PublicKey;
  } else
    reserveTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingInfo.reserveTokenMint
    );
  if (supplyTokenAddress) {
    supplyTokenAddress = supplyTokenAddress as PublicKey;
  } else
    supplyTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingInfo.supplyTokenMint
    );

  tx.add(await createATAWithoutCheckIx(wallet, lendingInfo.reserveTokenMint));

  let refreshIx = await ins.refreshReserveInstruction(
    lendingInfo.reserveAddress,
    lendingInfo.reserveInfo.liquidity.pythOraclePubkey,
    lendingInfo.reserveInfo.liquidity.switchboardOraclePubkey
  );
  //console.log(refreshIx);
  tx.add(refreshIx);
  if (lendingInfo.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
    let wrapIx = await wrapNative(amount, wallet, connection, true);
    tx.add(wrapIx);
  }

  let supplyIx =
    await ins.depositReserveLiquidityAndObligationCollateralInstruction(
      amount,
      supplyTokenAddress,
      reserveTokenAddress,
      lendingInfo.reserveAddress,
      lendingInfo.reserveInfo.liquidity.supplyPubkey,
      lendingInfo.reserveTokenMint,
      info.SOLENDLENDINGMARKETID,
      info.MARKETPDA,
      lendingInfo.reserveInfo.collateral.supplyPubkey,
      await obligation.getObligationPublicKey(wallet),
      wallet,
      lendingInfo.reserveInfo.liquidity.pythOraclePubkey,
      lendingInfo.reserveInfo.liquidity.switchboardOraclePubkey,
      wallet
    );
  //console.log(supplyIx.keys[0].pubkey.toString());
  tx.add(supplyIx);
  return tx;
}

export async function createWithdrawTx(
  wallet: PublicKey,
  reserveAddress: PublicKey,
  amount: BN,
  obligationInfo: obligation.obligation,
  lendingMarketInfo: lendingInfo,
  connection: Connection,
  createWithdrawTokenATA: boolean = true,
  withdrawTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey
) {
  let tx = new Transaction();
  let depositReserves: PublicKey[] = [];
  let borrowedReserves: PublicKey[] = [];
  for (let reserve of obligationInfo.depositCollateral) {
    depositReserves.push(reserve.reserve);
    let reserveInfo = state.parseReserveData(
      (await connection.getAccountInfo(reserve.reserve))?.data
    );
    tx.add(
      ins.refreshReserveInstruction(
        reserve.reserve,
        reserveInfo.liquidity.pythOraclePubkey,
        reserveInfo.liquidity.switchboardOraclePubkey
      )
    );
  }
  for (let reserve of obligationInfo.borrowedLiqudity) {
    borrowedReserves.push(reserve.reserve);
    let reserveInfo = state.parseReserveData(
      (await connection.getAccountInfo(reserve.reserve))?.data
    );
    tx.add(
      ins.refreshReserveInstruction(
        reserve.reserve,
        reserveInfo.liquidity.pythOraclePubkey,
        reserveInfo.liquidity.switchboardOraclePubkey
      )
    );
  }
  tx.add(
    ins.refreshObligationInstruction(
      await obligation.getObligationPublicKey(wallet),
      depositReserves,
      borrowedReserves
    )
  );
  if (await obligation.obligationCreated(connection, wallet)) {
  } else {
    let createObligationIx = await ins.createObligationAccountIx(wallet);
    tx.add(createObligationIx);
  }
  if (reserveTokenAddress) {
    reserveTokenAddress = reserveTokenAddress as PublicKey;
  } else
    reserveTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingMarketInfo.reserveTokenMint
    );
  if (withdrawTokenAddress) {
    withdrawTokenAddress = withdrawTokenAddress as PublicKey;
  } else
    withdrawTokenAddress = await findAssociatedTokenAddress(
      wallet,
      lendingMarketInfo.supplyTokenMint
    );
  if (createWithdrawTokenATA) {
    tx.add(
      await createATAWithoutCheckIx(wallet, lendingMarketInfo.supplyTokenMint)
    );
  }
  tx.add(
    await createATAWithoutCheckIx(wallet, lendingMarketInfo.reserveTokenMint)
  );

  let withdrawIns = ins.withdrawObligationCollateralAndRedeemReserveLiquidity(
    amount,
    lendingMarketInfo.reserveInfo.collateral.supplyPubkey,
    reserveTokenAddress,
    reserveAddress,
    await obligation.getObligationPublicKey(wallet),
    info.SOLENDLENDINGMARKETID,
    info.MARKETPDA,
    withdrawTokenAddress,
    lendingMarketInfo.reserveTokenMint,
    lendingMarketInfo.reserveInfo.liquidity.supplyPubkey,
    wallet,
    wallet
  );

  tx.add(withdrawIns);
  if (lendingMarketInfo.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
    tx.add(
      createCloseAccountInstruction(withdrawTokenAddress, wallet, wallet, [])
    );
  }
  return tx;
}
