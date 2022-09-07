import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { IFarmerInfo, IFarmInfo, IObligationInfo, IReserveInfo } from "../types";
export * from "./ids";
export * from "./infos";
export * from "./layouts";
export * from "./instructions";
export * from "./transactions";

export interface ReserveInfo extends IReserveInfo {
  market: PublicKey;
  tokenMint: PublicKey;
  tknAccount: PublicKey;
  feeAccount: PublicKey;
  shareMint: PublicKey;
  shareAccount: PublicKey;
  creditMint: PublicKey;
  creditAccount: PublicKey;
  decimal: BN;
  liquidityAvailableAmount: BN;
  liquidityBorrowedAmount: BN;
  marketPrice: BN;
  shareMintTotalSupply: BN;
  creditMintTotalSupply: BN;
  interestReverseRate: BN;
  accumulatedInterestReverse: BN;
  threshold1: number;
  threshold2: number;
  base1: number;
  factor1: number;
  base2: number;
  factor2: number;
  base3: number;
  factor3: number;
}

export interface FarmerInfo extends IFarmerInfo {
  // farmerId
  // userKey
  // farmerId
  // amount

  version: BN;
  rewardsDebt: BN;
  rewardsDebtB: BN;
  stakeTokenAccount: PublicKey;
  rewardsTokenAccount: PublicKey;
  rewardsTokenAccountB: PublicKey;
}

export interface RaydiumStrategyState {
  infoPubkey: PublicKey;
  protocolVersion: BN;
  protocolSubVersion: BN;
  lastUpdateSlot: BN;
  totalLp: BN;
  totalShares: BN;
  totalBorrowed0: BN;
  totalBorrowed1: BN;
  pendingTkn0: BN;
  pendingTkn1: BN;
  pendingWithdrawLp: BN;
  pendingRepay0: BN;
  pendingRepay1: BN;
  cumulatedBorrowRate0: BN;
  cumulatedBorrowRate1: BN;
  admin: PublicKey;
  authority: PublicKey;
  authorityNonce: BN;
  tokenProgramId: PublicKey;
  tknAccount0: PublicKey;
  tknAccount1: PublicKey;
  lpAccount: PublicKey;
  rewardAccount: PublicKey;
  rewardAccountB: PublicKey;
  lendingProgramId: PublicKey;
  lendingPool0: PublicKey;
  strategyLendingCreditAccount0: PublicKey;
  lendingPool1: PublicKey;
  strategyLendingCreditAccount1: PublicKey;
  platformRewardsEnable: BN;
  rewardsStartSlot: BN;
  rewardsEndSlot: BN;
  rewardsPerSlot: BN;
  platformRewardsTknMint: PublicKey;
  platformRewardsTknAccount: PublicKey;
  accumulatedRewardsPerShare: BN;
  maxLeverage: BN;
  liquidateLine: BN;
  compoundRewardsRate: BN;
  ammProgramId: PublicKey;
  ammId: PublicKey;
  ammIdForRewards: PublicKey;
  ammIdForRewardsB: PublicKey;
  stakeProgramId: PublicKey;
  stakePoolId: PublicKey;
  stakePoolTkn: PublicKey;
}

export interface OrcaStrategyState {
  infoPubkey: PublicKey;
  protocolVersion: BN;
  protocolSubVersion: BN;
  lastUpdateSlot: BN;
  totalLp: BN;
  totalShares: BN;
  totalBorrowed0: BN;
  totalBorrowed1: BN;
  pendingTkn0: BN;
  pendingTkn1: BN;
  pendingWithdrawLp: BN;
  pendingRepay0: BN;
  pendingRepay1: BN;
  cumulatedBorrowRate0: BN;
  cumulatedBorrowRate1: BN;
  maxLeverage: BN;
  liquidateLine: BN;
  compoundRewardsRate: BN;
  admin: PublicKey;
  authority: PublicKey;
  authorityNonce: BN;
  franciumRewardsEnable: BN;
  franciumRewardsStartSlot: BN;
  franciumRewardsEndSlot: BN;
  franciumRewardsPerSlot: BN;
  franciumAccumulatedRewardsPerShare: BN;
  franciumRewardsTknAccount: PublicKey;
  lendingProgramId: PublicKey;
  ammProgramId: PublicKey;
  stakeProgramId: PublicKey;
  tknAccount0: PublicKey;
  tknAccount1: PublicKey;
  lpTknAccount: PublicKey;
  rewardsTknAccount: PublicKey;
  farmTknAccount: PublicKey;
  lendingPool0: PublicKey;
  strategyLendingCreditAccount0: PublicKey;
  lendingPool1: PublicKey;
  strategyLendingCreditAccount1: PublicKey;
  doubleDipRewardsSwapPoolId: PublicKey;
  doubleDipStrategyRewardsTknAccount: PublicKey;
  swapPoolId: PublicKey;
  rewardsSwapPoolId: PublicKey;
  stakePoolFarmInfo: PublicKey;
  strategyFarmInfo: PublicKey;
  doubleDipFarmTknAccount: PublicKey;
  doubleDipStakePoolFarmInfo: PublicKey;
  doubleDipStrategyFarmInfo: PublicKey;
}

export interface RaydiumPosition {
  infoPubkey: PublicKey;
  version: BN;
  lastUpdateSlot: BN;
  strategyStateAccount: PublicKey;
  userMainAccount: PublicKey;
  pending0: BN;
  pendingInvestFlag: BN;
  stopLoss: BN;
  tkn0: BN;
  tkn1: BN;
  borrowed0: BN;
  borrowed1: BN;
  principle0: BN;
  principle1: BN;
  investedLp: BN;
  lpShares: BN;
  pendingWithdrawLp: BN;
  pendingRepay0: BN;
  pendingRepay1: BN;
  cumulatedBorrowRate0: BN;
  cumulatedBorrowRate1: BN;
  platformRewardsDebt: BN;
  pendingWithdrawFlag: BN;
  takeProfitLine: BN;
}

export interface OrcaPosition {
  infoPubkey: PublicKey;
  version: BN;
  lastUpdateSlot: BN;
  strategyStateAccount: PublicKey;
  userMainAccount: PublicKey;
  pending0: BN;
  pendingInvestFlag: BN;
  stopLoss: BN;
  tkn0: BN;
  tkn1: BN;
  borrowed0: BN;
  borrowed1: BN;
  principle0: BN;
  principle1: BN;
  investedLp: BN;
  lpShares: BN;
  pendingWithdrawLp: BN;
  pendingRepay0: BN;
  pendingRepay1: BN;
  cumulatedBorrowRate0: BN;
  cumulatedBorrowRate1: BN;
  platformRewardsDebt: BN;
  pendingWithdrawFlag: BN;
  takeProfitLine: BN;
  stableSwapComputeFlag: BN;
  stableSwapDirection: BN;
  stableSwapAmount: BN;
}

export interface FarmInfo extends IFarmInfo {
  // farmId

  version: BN;
  isDualRewards: BN;
  admin: PublicKey;
  tokenProgramId: PublicKey;
  poolAuthority: PublicKey;
  stakedTokenMint: PublicKey;
  stakedTokenAccount: PublicKey;
  rewardsTokenMint: PublicKey;
  rewardsTokenAccount: PublicKey;
  rewardsTokenMintB: PublicKey;
  rewardsTokenAccountB: PublicKey;
  poolStakeCap: BN;
  userStakeCap: BN;
  rewardsStartSlot: BN;
  rewardsEndSlot: BN;
  rewardsPerDay: BN;
  rewardsStartSlotB: BN;
  rewardsEndSlotB: BN;
  rewardsPerDayB: BN;
  totalStakedAmount: BN;
  lastUpdateSlot: BN;
  accumulatedRewardsPerShare: BN;
  accumulatedRewardsPerShareB: BN;
}

export interface ObligationInfo extends IObligationInfo {}
