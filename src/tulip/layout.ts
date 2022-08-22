import { publicKey, struct, u64, u128, u8, bool } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

export const RESERVE_LAYOUT = struct([
  u8("version"),
  struct([u64("lastUpdatedSlot"), bool("stale")], "lastUpdate"),
  publicKey("lendingMarket"),
  publicKey("borrowAuthorizer"),
  struct(
    [
      publicKey("mintPubkey"),
      u8("mintDecimals"),
      publicKey("supplyPubkey"),
      publicKey("feeReceiver"),
      publicKey("oraclePubkey"),
      u64("availableAmount"),
      u128("borrowedAmount"),
      u128("cumulativeBorrowRate"),
      u128("marketPrice"),
      u128("platformAmountWads"),
      u8("platformFee"),
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
      u8("degenUtilizationRate"),
      u8("loanToValueRatio"),
      u8("liquidationBonus"),
      u8("liquidationThreshold"),
      u8("minBorrowRate"),
      u8("optimalBorrowRate"),
      u8("degenBorrowRate"),
      u8("maxBorrowRate"),
      struct(
        [u64("borrowFeeWad"), u64("flashLoanFeeWad"), u8("hostFeePercentage")],
        "fees"
      ),
    ],
    "config"
  ),
]);
