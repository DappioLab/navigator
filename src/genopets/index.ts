import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IFarmInfo, IFarmerInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layouts";

export interface FarmInfo extends IFarmInfo {
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
  stakeParams: BN;
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
  userDeposit: (Deposit | null)[];
}

export interface Deposit {
  depositId: PublicKey;
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
