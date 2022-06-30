import { publicKey, struct, u64, u128, u8, bool } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

export const RESERVE_LAYOUT = struct([
  u8("version"),
  struct([u64("lastUpdatedSlot"), bool("stale")], "lastUpdate"),
  publicKey("lendingMarket"),
  struct(
    [
      publicKey("mintPubkey"),
      u8("mintDecimals"),
      publicKey("supplyPubkey"),
      publicKey("pythOraclePubkey"),
      publicKey("switchboardOraclePubkey"),
      u64("availableAmount"),
      u128("borrowedAmountWads"),
      u128("cumulativeBorrowRateWads"),
      u128("marketPrice"),
    ],
    "liquidity"
  ),
  struct(
    [
      publicKey("reserveTokenMint"),
      u64("mintTotalSupply"),
      publicKey("supplyPubkey"),
    ],
    "collateral"
  ),
  struct(
    [
      u8("optimalUtilizationRate"),
      u8("loanToValueRatio"),
      u8("liquidationBonus"),
      u8("liquidationThreshold"),
      u8("minBorrowRate"),
      u8("optimalBorrowRate"),
      u8("maxBorrowRate"),
      struct(
        [u64("borrowFeeWad"), u64("flashLoanFeeWad"), u8("hostFeePercentage")],
        "fees"
      ),
      u64("depositLimit"),
      u64("borrowLimit"),
      publicKey("feeReceiver"),
    ],
    "config"
  ),
]);

export const OBLIGATION_LAYOUT = struct([
  u8("version"),
  struct([u64("lastUpdatedSlot"), bool("stale")], "lastUpdate"),
  publicKey("lendingMarket"),
  publicKey("owner"),
  u128("depositedValue"),
  u128("borrowedValue"),
  u128("allowedBorrowValue"),
  u128("unhealthyBorrowValue"),
  blob(64, "_padding"),
  u8("depositsLen"),
  u8("borrowsLen"),
  blob(1096, "dataFlat"),
]);

export const COLLATERAL_LAYOUT = struct([
  publicKey("reserveAddress"),
  u64("depositedAmount"),
  u128("marketValue"),
]);

export const LOAN_LAYOUT = struct([
  publicKey("reserveAddress"),
  u128("cumulativeBorrowRate"),
  u128("borrowedAmount"),
  u128("marketValue"),
]);
