export * from "./ids";
export * from "./infos";
export * from "./layouts";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { ICLPoolInfo, ICLPositionInfo } from "../types";

export interface PoolInfo extends ICLPoolInfo {
  poolId: PublicKey;
  whirlpoolBump: number;
  config: WhirlpoolConfig;
  tickSpacing: number;
  tickSpacingSeed0: number;
  tickSpacingSeed1: number;
  feeRate: number;
  protocolFeeRate: number;
  liquidity: BN;
  sqrtPrice: BN;
  tickCurrentIndex: number;
  protocolFeeOwedA: BN;
  protocolFeeOwedB: BN;
  tokenMintA: PublicKey;
  tokenVaultA: PublicKey;
  feeGrowthGlobalA: BN;
  tokenMintB: PublicKey;
  tokenVaultB: PublicKey;
  feeGrowthGlobalB: BN;
  rewardLastUpdatedTimestamp: BN;
  reward0: RewardInfo;
  reward1: RewardInfo;
  reward2: RewardInfo;
  tickArray: Tick[];
}

export interface PositionInfo extends ICLPositionInfo {
  positionId: PublicKey;
  poolId: PublicKey;
  positionMint: PublicKey;
  liquidity: BN;
  tickLowerIndex: number;
  tickUpperIndex: number;
  feeGrowthCheckpointA: BN;
  feeOwedA: BN;
  feeGrowthCheckpointB: BN;
  feeOwedB: BN;
  rewardInfo0: PositionReward;
  rewardInfo1: PositionReward;
  rewardInfo2: PositionReward;
}

export interface WhirlpoolConfig {
  configId: PublicKey;
  feeAuthority: PublicKey;
  collectProtocolFeesAuthority: PublicKey;
  rewardEmissionsSuperAuthority: PublicKey;
  defaultProtocolFeeRate: number;
}

export interface FeeConfig {
  configId: PublicKey;
  defaultProtocolFeeRate: PublicKey;
  tickSpacing: number;
  defaultFeeRate: number;
}

export interface Tick {
  tickId: PublicKey;
  index: number;
  initialized: boolean;
  liquidityGross: BN;
  liquidityNet: BN;
  feeGrowthOutsideA: BN;
  feeGrowthOutsideB: BN;
  rewardGrowthsOutside0: BN;
  rewardGrowthsOutside1: BN;
  rewardGrowthsOutside2: BN;
}
export interface RewardInfo {
  mint: PublicKey;
  vault: PublicKey;
  authority: PublicKey;
  emissionsPerSecondX64: BN;
  growthGlobalX64: BN;
}

export interface PositionReward {
  growthInsideCheckpoint: BN;
  amountOwed: BN;
}

export interface TickArray {
  startTickIndex: number;
  ticks: Tick[];
  whirlpool: PublicKey;
}
