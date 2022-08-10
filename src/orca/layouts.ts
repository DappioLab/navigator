import {
  publicKey,
  struct,
  u64,
  u128,
  u8,
  bool,
  u16,
  i64,
} from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";
export const POOL_LAYOUT = struct([
  u8("version"),
  u8("isInitialized"),
  u8("nonce"),
  publicKey("tokenProgramId"),
  publicKey("tokenAccountA"),
  publicKey("tokenAccountB"),
  publicKey("LPmint"),
  publicKey("mintA"),
  publicKey("mintB"),
  publicKey("feeAccount"),
  u64("tradeFeeNumerator"),
  u64("tradeFeeDenominator"),
  u64("ownerTradeFeeNumerator"),
  u64("ownerTradeFeeDenominator"),
  u64("ownerWithdrawFeeNumerator"),
  u64("ownerWithdrawFeeDenominator"),
  u64("hostFeeNumerator"),
  u64("hostFeeDenominator"),
  u8("curveType"),
  blob(32, "curveParameters"),
]);

export const FARM_LAYOUT = struct([
  u8("isInitialized"),
  u8("accountType"),
  u8("nonce"),
  publicKey("tokenProgramId"),
  publicKey("emissionsAuthority"),
  publicKey("removeRewardsAuthority"),
  publicKey("baseTokenMint"),
  publicKey("baseTokenVault"),
  publicKey("rewardTokenVault"),
  publicKey("farmTokenMint"),
  u64("emissionsPerSecondNumerator"),
  u64("emissionsPerSecondDenominator"),
  u64("lastUpdatedTimestamp"),
  blob(32, "cumulativeEmissionsPerFarmToken"),
]);

export const FARMER_LAYOUT = struct([
  u8("isInitialized"),
  u8("accountType"),
  publicKey("globalFarm"),
  publicKey("owner"),
  u64("baseTokensConverted"),
  blob(32, "cumulativeEmissionsCheckpoint"),
]);
