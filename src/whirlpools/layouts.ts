import { publicKey, u8, u64, u128, u16, i32, bool, i128, str } from "@project-serum/borsh";
//@ts-ignore
import { blob, seq, struct } from "buffer-layout";

export const CONFIG_LAYOUT = struct([
  blob(8, "discriminator"),
  publicKey("feeAuthority"),
  publicKey("collectProtocolFeesAuthority"),
  publicKey("rewardEmissionsSuperAuthority"),
  u16("defaultProtocolFeeRate"),
]);
export const REWARD_LAYOUT = [
  publicKey("mint"),
  publicKey("vault"),
  publicKey("authority"),
  u128("emissionsPerSecondX64"),
  u128("growthGlobalX64"),
];
export const POSITION_REWARD_LAYOUT = [u128("growthInsideCheckpoint"), u64("amountOwed")];

export const FEE_LAYOUT = struct([publicKey("whirlpoolsConfig"), u16("tickSpacing"), u16("defaultFeeRate")]);

export const POSITION_LAYOUT = struct([
  blob(8, "discriminator"),
  publicKey("whirlpool"),
  publicKey("mint"),
  u128("liquidity"),
  i32("tickLowerIndex"),
  i32("tickUpperIndex"),
  u128("feeGrowthCheckpointA"),
  u64("feeOwedA"),
  u128("feeGrowthCheckpointB"),
  u64("feeOwedB"),
  struct(POSITION_REWARD_LAYOUT, "rewardInfo0"),
  struct(POSITION_REWARD_LAYOUT, "rewardInfo1"),
  struct(POSITION_REWARD_LAYOUT, "rewardInfo2"),
]);

export const WHIRLPOOL_LAYOUT = struct([
  blob(8, "discriminator"),
  publicKey("whirlpoolsConfig"),
  u8("whirlpoolBump"),
  u16("tickSpacing"),
  u8("tickSpacingSeed0"),
  u8("tickSpacingSeed1"),
  u16("feeRate"),
  u16("protocolFeeRate"),
  u128("liquidity"),
  u128("sqrtPrice"),
  i32("tickCurrentIndex"),
  u64("protocolFeeOwedA"),
  u64("protocolFeeOwedB"),
  publicKey("tokenMintA"),
  publicKey("tokenVaultA"),
  u128("feeGrowthGlobalA"),
  publicKey("tokenMintB"),
  publicKey("tokenVaultB"),
  u128("feeGrowthGlobalB"),
  u64("rewardLastUpdatedTimestamp"),
  struct(REWARD_LAYOUT, "reward0"),
  struct(REWARD_LAYOUT, "reward1"),
  struct(REWARD_LAYOUT, "reward2"),
]);

export const TICK_LAYOUT = struct([
  bool("initialized"),
  i128("liquidityNet"),
  u128("liquidityGross"),
  u128("feeGrowthOutsideA"),
  u128("feeGrowthOutsideB"),
  u128("rewardGrowthsOutside0"),
  u128("rewardGrowthsOutside1"),
  u128("rewardGrowthsOutside2"),
]);

export const TICK_ARRAY_LAYOUT = struct([
  blob(8, "discriminator"),
  i32("startTickIndex"),
  seq(TICK_LAYOUT, 88, "ticks"),
  publicKey("whirlpool"),
]);
