import { publicKey, struct, u64, u128, u8, bool } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

export const FARM_LAYOUT = struct(
  [
    publicKey("unCollSupply"),
    u128("lTokenMiningIndex"),
    u128("borrowMiningIndex"),
    u64("totalMiningSpeed"),
    u64("kinkUtilRate"),
  ],
  "bonus"
);

export const RESERVE_LAYOUT = struct([
  u8("version"),
  struct([u64("lastUpdatedSlot"), bool("stale")], "lastUpdate"),
  publicKey("lendingMarket"),
  struct(
    [
      publicKey("mintPubkey"),
      u8("mintDecimals"),
      publicKey("supplyPubkey"),
      publicKey("feeReceiver"),
      u8("padding"),
      publicKey("OraclePubkey"),
      publicKey("larixOraclePubkey"),
      u64("availableAmount"),
      u128("borrowedAmountWads"),
      u128("cumulativeBorrowRateWads"),
      u128("marketPrice"),
      u128("ownerUnclaimed"),
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
        [
          u64("borrowFeeWad"),
          u64("borrowInterestFeeWad"),
          u64("flashLoanFeeWad"),
          u8("hostFeePercentage"),
        ],
        "fees"
      ),
    ],
    "config"
  ),
  blob(164,"padding"),
  FARM_LAYOUT,
  u8("reentry"),
  u64("depositLimit"),
  u8("isLP"),
  blob(239, "padding"),
]);

export const MINER_LAYOUT = struct([
  u8("version"),
  publicKey("owner"),
  publicKey("lendingMarket"),
  u8("reservesLen"),
  u128("unclaimedMine"),
  blob(56 * 10, "dataFlat"),
]);

export const MINER_INDEX_LAYOUT = struct([
  publicKey("reserveId"),
  u64("unCollLTokenAmount"),
  u128("index"),
]);
