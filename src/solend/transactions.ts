import {
  NATIVE_MINT,
  createCloseAccountInstruction,
} from "@solana/spl-token-v2";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  findAssociatedTokenAddress,
  createATAWithoutCheckIx,
  wrapNative,
} from "../utils";
import {
  getObligationPublicKey,
  obligationCreated,
  ObligationInfoWrapper,
  parseReserveData,
  ReserveInfoWrapper,
} from "./infos";
import { MARKET_PDA, SOLEND_LENDING_MARKET_ID } from "./ids";
import {
  createObligationAccountIx,
  depositReserveLiquidityAndObligationCollateralInstruction,
  refreshObligationInstruction,
  refreshReserveInstruction,
  withdrawObligationCollateralAndRedeemReserveLiquidity,
} from "./instructions";

export async function createDepositTx(
  reserveInfoWrapper: ReserveInfoWrapper,
  wallet: PublicKey,
  amount: BN,
  connection: Connection,
  supplyTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey
) {
  let tx: Transaction = new Transaction();
  if (await obligationCreated(connection, wallet)) {
  } else {
    let createObligationIx = await createObligationAccountIx(wallet);
    tx.add(createObligationIx);
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

  tx.add(
    await createATAWithoutCheckIx(wallet, reserveInfoWrapper.reserveTokenMint())
  );

  let refreshIx = refreshReserveInstruction(
    reserveInfoWrapper.reserveId,
    reserveInfoWrapper.reserveInfo.liquidity.pythOraclePubkey,
    reserveInfoWrapper.reserveInfo.liquidity.switchboardOraclePubkey
  );
  tx.add(refreshIx);
  if (
    reserveInfoWrapper.supplyTokenMint().toString() == NATIVE_MINT.toString()
  ) {
    let wrapIx = await wrapNative(amount, wallet, connection, true);
    tx.add(wrapIx);
  }

  let supplyIx = depositReserveLiquidityAndObligationCollateralInstruction(
    amount,
    supplyTokenAddress,
    reserveTokenAddress,
    reserveInfoWrapper.reserveId,
    reserveInfoWrapper.reserveInfo.liquidity.supplyPubkey,
    reserveInfoWrapper.reserveTokenMint(),
    SOLEND_LENDING_MARKET_ID,
    MARKET_PDA,
    reserveInfoWrapper.reserveInfo.collateral.supplyPubkey,
    await getObligationPublicKey(wallet),
    wallet,
    reserveInfoWrapper.reserveInfo.liquidity.pythOraclePubkey,
    reserveInfoWrapper.reserveInfo.liquidity.switchboardOraclePubkey,
    wallet
  );
  tx.add(supplyIx);
  return tx;
}

export async function createWithdrawTx(
  wallet: PublicKey,
  reserveAddress: PublicKey,
  amount: BN,
  obligationInfoWrapper: ObligationInfoWrapper,
  reserveInfoWrapper: ReserveInfoWrapper,
  connection: Connection,
  createWithdrawTokenATA: boolean = true,
  withdrawTokenAddress?: PublicKey,
  reserveTokenAddress?: PublicKey
) {
  let tx = new Transaction();
  let depositReserves: PublicKey[] = [];
  let borrowedReserves: PublicKey[] = [];
  for (let reserve of obligationInfoWrapper.obligationCollaterals) {
    depositReserves.push(reserve.reserveId);
    let reserveInfo = parseReserveData(
      (await connection.getAccountInfo(reserve.reserveId))?.data
    );
    tx.add(
      refreshReserveInstruction(
        reserve.reserveId,
        reserveInfo.liquidity.pythOraclePubkey,
        reserveInfo.liquidity.switchboardOraclePubkey
      )
    );
  }
  for (let reserve of obligationInfoWrapper.obligationLoans) {
    borrowedReserves.push(reserve.reserveId);
    let reserveInfo = parseReserveData(
      (await connection.getAccountInfo(reserve.reserveId))?.data
    );
    tx.add(
      refreshReserveInstruction(
        reserve.reserveId,
        reserveInfo.liquidity.pythOraclePubkey,
        reserveInfo.liquidity.switchboardOraclePubkey
      )
    );
  }
  tx.add(
    refreshObligationInstruction(
      await getObligationPublicKey(wallet),
      depositReserves,
      borrowedReserves
    )
  );
  if (await obligationCreated(connection, wallet)) {
  } else {
    let createObligationIx = await createObligationAccountIx(wallet);
    tx.add(createObligationIx);
  }
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
  if (createWithdrawTokenATA) {
    tx.add(
      await createATAWithoutCheckIx(
        wallet,
        reserveInfoWrapper.supplyTokenMint()
      )
    );
  }
  tx.add(
    await createATAWithoutCheckIx(wallet, reserveInfoWrapper.reserveTokenMint())
  );

  let withdrawIns = withdrawObligationCollateralAndRedeemReserveLiquidity(
    amount,
    reserveInfoWrapper.reserveInfo.collateral.supplyPubkey,
    reserveTokenAddress,
    reserveAddress,
    await getObligationPublicKey(wallet),
    SOLEND_LENDING_MARKET_ID,
    MARKET_PDA,
    withdrawTokenAddress,
    reserveInfoWrapper.reserveTokenMint(),
    reserveInfoWrapper.reserveInfo.liquidity.supplyPubkey,
    wallet,
    wallet
  );

  tx.add(withdrawIns);
  if (
    reserveInfoWrapper.supplyTokenMint().toString() == NATIVE_MINT.toString()
  ) {
    tx.add(
      createCloseAccountInstruction(withdrawTokenAddress, wallet, wallet, [])
    );
  }
  return tx;
}
