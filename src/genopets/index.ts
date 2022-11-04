import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IFarmInfo, IFarmerInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layouts";
export * from "./utils";

export interface FarmInfo extends IFarmInfo {
  master: FarmMaster;
  poolToken: PublicKey;
  tokenDecimals: BN;
  weight: BN;
  earliestUnlockDate: BN;
  usersLockingWeight: BN;
  poolTokenReserve: BN;
  weightPerToken: BN;
  governanceEligible: boolean;
}

export interface FarmMaster {
  id: PublicKey;
  authority: PublicKey;
  sgeneMinter: PublicKey;
  mintSgene: PublicKey;
  geneMint: PublicKey;
  geneRewarder: PublicKey;
  totalGeneRewarded: BN;
  ataGeneRewarder: PublicKey;
  totalGeneAllocated: BN;
  totalWeight: BN;
  startTime: BN;
  endTime: BN;
  epochTime: BN;
  decayFactorPerEpoch: BN;
  initialGenesPerEpoch: BN;
  stakeParams: {
    minStakeDuration: BN;
    maxStakeDuration: BN;
  };
  pausedState: BN;
  totalRewardWeight: BN;
  accumulatedYieldRewardsPerWeight: BN;
  lastYieldDistribution: BN;
  totalGeneStaked: BN;
  timeFactor: BN;
}

export interface FarmerInfo extends IFarmerInfo {
  totalRewardWeight: BN;
  subYieldRewards: BN;
  activeDeposits: BN;
  totalRewards: BN;
  currentDepositIndex: BN;
  instance: FarmerInstance[];
}

export interface FarmerInstance {
  id: PublicKey;
  user: PublicKey;
  amount: BN;
  poolToken: PublicKey;
  rewardWeight: BN;
  depositTimestamp: BN;
  depositMultiplier: BN;
  lockFrom: BN;
  lockUntil: BN;
  isYield: boolean;
  tokenDecimals: BN;
  active: boolean;
  governanceEligible: boolean;
}

export const defaultFarmerMaster = {
  id: PublicKey.default,
  authority: PublicKey.default,
  sgeneMinter: PublicKey.default,
  mintSgene: PublicKey.default,
  geneMint: PublicKey.default,
  geneRewarder: PublicKey.default,
  totalGeneRewarded: new BN(0),
  ataGeneRewarder: PublicKey.default,
  totalGeneAllocated: new BN(0),
  totalWeight: new BN(0),
  startTime: new BN(0),
  endTime: new BN(0),
  epochTime: new BN(0),
  decayFactorPerEpoch: new BN(0),
  initialGenesPerEpoch: new BN(0),
  stakeParams: {
    minStakeDuration: new BN(0),
    maxStakeDuration: new BN(0),
  },
  pausedState: new BN(0),
  totalRewardWeight: new BN(0),
  accumulatedYieldRewardsPerWeight: new BN(0),
  lastYieldDistribution: new BN(0),
  totalGeneStaked: new BN(0),
  timeFactor: new BN(0),
};
