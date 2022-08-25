import { publicKey, struct, u64, u128, u8,u16, bool } from "@project-serum/borsh";
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
  blob(164, "padding"),
  FARM_LAYOUT,
  u8("reentry"),
  u64("depositLimit"),
  u8("isLP"),
  blob(239, "padding"),
]);

export const FARMER_LAYOUT = struct([
  u8("version"),
  publicKey("owner"),
  publicKey("lendingMarket"),
  u8("reservesLen"),
  u128("unclaimedMine"),
  blob(56 * 10, "dataFlat"),
]);

export const FARMER_INDEX_LAYOUT = struct([
  publicKey("reserveId"),
  u64("unCollLTokenAmount"),
  u128("index"),
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
  u8("depositsLen"),
  u8("borrowsLen"),
  u128("unclaimedMine"),
  blob(96 * 9 + 72, "dataFlat"),
]);

export const COLLATERAL_LAYOUT = struct([
  publicKey("reserveId"),
  u64("depositedAmount"),
  u128("marketValue"),
  u128("index"),
]);

export const LOAN_LAYOUT = struct([
  publicKey("reserveId"),
  u128("cumulativeBorrowRate"),
  u128("borrowedAmount"),
  u128("marketValue"),
  u128("index"),
]);

export const ORACLE_BRIDGE_LAYOUT = struct([
  blob(8, "discriminator"),
  u8("version"),
  publicKey("base"),
  publicKey("owner"),
  publicKey("pendingOwner"),
  publicKey("ammId"),
  u8("ammVersion"),
  publicKey("lpMint"),
  publicKey("lpSupply"),
  publicKey("coinSupply"),
  publicKey("pcSupply"),
  publicKey("addLpWithdrawAmountAuthority"),
  publicKey("compoundAuthority"),
  publicKey("coinMintPrice"),
  u8("coinMintDecimal"),
  publicKey("pcMintPrice"),
  u8("pcMintDecimal"),
  publicKey("ammOpenOrders"),
  publicKey("ammCoinMintSupply"),
  publicKey("ammPcMintSupply"),
  u8("bump"),
  publicKey("lpPriceAccount"),
  u8("isFarm"),
  publicKey("farmPoolId"),
  u8("farmPoolVersion"),
  publicKey("farmLedger"),
  u16("rewardSupplyLen"),
])