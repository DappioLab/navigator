import { publicKey, struct, u64, u128, u8, bool, u16, i64, u32, f64 } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

// StakingPool
export const POOL_LAYOUT = struct([
  u64("discriminator"),
  publicKey("poolToken"),
  u8("tokenDecimals"),
  u32("weight"),
  u64("earliestUnlockDate"),
  u64("usersLockingWeight"),
  u64("poolTokenReserve"),
  u32("weightPerToken"),
  bool("governanceEligible"),
]);

// StakeMaster
export const FARM_LAYOUT = struct([
  u64("discriminator"),
  publicKey("authority"),
  publicKey("sgeneMinter"),
  publicKey("mintSgene"),
  publicKey("geneMint"),
  publicKey("geneRewarder"),
  u64("totalGeneRewarded"),
  publicKey("ataGeneRewarder"),
  u64("totalGeneAllocated"),
  u32("totalWeight"),
  u64("startTime"),
  u32("endTime"),
  u64("epochTime"),
  f64("decayFactorPerEpoch"),
  u64("initialGenesPerEpoch"),
  u32("stakeParams"),
  bool("pausedState"),
  u64("totalRewardWeight"),
  u64("accumulatedYieldRewardsPerWeight"),
  u64("lastYieldDistribution"),
  u64("totalGeneStaked"),
  u64("timeFactor"),
]);

// Staker
export const FARMER_LAYOUT = struct([
  u64("discriminator"),
  publicKey("owner"),
  u64("totalRewardWeight"),
  u64("subYieldRewards"),
  u32("activeDeposits"),
  u64("totalRewards"),
  u32("currentDepositIndex"),
]);

// Deposit
export const DEPOSIT_LAYOUT = struct([
  u64("discriminator"),
  publicKey("user"),
  u64("amount"),
  publicKey("poolToken"),
  u64("rewardWeight"),
  u64("depositTimestamp"),
  f64("depositMultiplier"),
  u64("lockFrom"),
  u64("lockUntil"),
  bool("isYield"),
  u8("tokenDecimals"),
  bool("active"),
  bool("governanceEligible"),
]);
