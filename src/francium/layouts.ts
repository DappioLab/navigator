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
import { blob, nu64, seq } from "buffer-layout";

export const LendingPoolLayout = struct([
  u8("version"),
  u64("last_updateSlot"),
  u8("last_updateStale"),
  publicKey("lendingMarket"),
  publicKey("liquidityMintPubkey"),
  u8("liquidityMint_decimals"),
  publicKey("liquiditySupplyPubkey"),
  publicKey("liquidityFeeReceiver"),
  blob(36, "oracle"),
  u64("liquidity_available_amount"),
  blob(16, "liquidity_borrowed_amount_wads"),
  blob(16, "liquidity_cumulative_borrowRate_wads"),
  u64("liquidityMarketPrice"),
  publicKey("shareMintPubkey"),
  u64("shareMintTotalSupply"),
  publicKey("shareSupplyPubkey"),
  publicKey("creditMintPubkey"),
  u64("creditMintTotalSupply"),
  publicKey("creditSupplyPubkey"),
  u8("threshold_1"),
  u8("threshold_2"),
  u8("base_1"),
  u16("factor_1"),
  u8("base_2"),
  u16("factor_2"),
  u8("base_3"),
  u16("factor_3"),
  u8("interestReverseRate"),
  u64("accumulated_interestReverse"),
  blob(108, "padding"),
]);

// Raydium
export const RAYDIUM_STRATEGY_STATE_LAYOUT = struct([
  u8("protocolVersion"),
  u8("protocolSubVersion"),
  u64("lastUpdateSlot"),
  u64("totalLp"),
  u64("totalShares"),
  u64("totalBorrowed0"),
  u64("totalBorrowed1"),
  u64("pendingTkn0"),
  u64("pendingTkn1"),
  u64("pendingWithdrawLp"),
  u64("pendingRepay0"),
  u64("pendingRepay1"),
  u128("cumulatedBorrowRate0"),
  u128("cumulatedBorrowRate1"),
  //114Byte
  publicKey("admin"),
  publicKey("authority"),
  u8("authorityNonce"),
  publicKey("tokenProgramId"),
  publicKey("tknAccount0"),
  publicKey("tknAccount1"),
  publicKey("lpAccount"),
  publicKey("rewardAccount"),
  publicKey("rewardAccountB"),
  publicKey("lendingProgramId"),
  publicKey("lendingPool0"),
  publicKey("strategyLendingCreditAccount0"),
  publicKey("lendingPool1"),
  publicKey("strategyLendingCreditAccount1"),
  u8("platformRewardsEnable"),
  u64("rewardsStartSlot"),
  u64("rewardsEndSlot"),
  u64("rewardsPerSlot"),
  publicKey("platformRewardsTknMint"),
  publicKey("platformRewardsTknAccount"),
  u128("accumulatedRewardsPerShare"),
  u8("maxLeverage"),
  u8("liquidateLine"),
  u8("compoundRewardsRate"),
  publicKey("ammProgramId"),
  publicKey("ammId"),
  publicKey("ammIdForRewards"),
  publicKey("ammIdForRewardsB"),
  publicKey("stakeProgramId"),
  publicKey("stakePoolId"),
  publicKey("stakePoolTkn"),
]);

// Orca
export const ORCA_STRATEGY_STATE_LAYOUT = struct([
  u8("protocolVersion"),
  u8("protocolSubVersion"),
  u64("lastUpdateSlot"),
  u64("totalLp"),
  u64("totalShares"),
  u64("totalBorrowed0"),
  u64("totalBorrowed1"),
  u64("pendingTkn0"),
  u64("pendingTkn1"),
  u64("pendingWithdrawLp"),
  u64("pendingRepay0"),
  u64("pendingRepay1"),
  u128("cumulatedBorrowRate0"),
  u128("cumulatedBorrowRate1"),
  u8("maxLeverage"),
  u8("liquidateLine"),
  u8("compoundRewardsRate"),
  //117Byte
  publicKey("admin"),
  publicKey("authority"),
  u8("authorityNonce"),
  u8("franciumRewardsEnable"),
  u64("franciumRewardsStartSlot"),
  u64("franciumRewardsEndSlot"),
  u64("franciumRewardsPerSlot"),
  u128("franciumAccumulatedRewardsPerShare"),
  publicKey("franciumRewardsTknAccount"),
  publicKey("lendingProgramId"),
  publicKey("ammProgramId"),
  publicKey("stakeProgramId"),
  publicKey("tknAccount0"),
  publicKey("tknAccount1"),
  publicKey("lpTknAccount"),
  publicKey("rewardsTknAccount"),
  publicKey("farmTknAccount"),
  publicKey("lendingPool0"),
  publicKey("strategyLendingCreditAccount0"),
  publicKey("lendingPool1"),
  publicKey("strategyLendingCreditAccount1"),
  publicKey("doubleDipRewardsSwapPoolId"),
  publicKey("doubleDipStrategyRewardsTknAccount"),
  publicKey("swapPoolId"),
  publicKey("rewardsSwapPoolId"),
  publicKey("stakePoolFarmInfo"),
  publicKey("strategyFarmInfo"),
  publicKey("doubleDipFarmTknAccount"),
  publicKey("doubleDipStakePoolFarmInfo"),
  publicKey("doubleDipStrategyFarmInfo"),
]);

// Raydium
export const RAYDIUM_POSITION_LAYOUT = struct([
  u8("version"),
  u64("lastUpdateSlot"),
  publicKey("strategyStateAccount"),
  //41Byte
  publicKey("userMainAccount"),
  u8("pending0"),
  u8("pendingInvestFlag"),
  u8("stopLoss"),
  u64("tkn0"),
  u64("tkn1"),
  u64("borrowed0"),
  u64("borrowed1"),
  u64("principle0"),
  u64("principle1"),
  u64("investedLp"),
  u64("lpShares"),
  u64("pendingWithdrawLp"),
  u64("pendingRepay0"),
  u64("pendingRepay1"),
  u128("cumulatedBorrowRate0"),
  u128("cumulatedBorrowRate1"),
  u128("platformRewardsDebt"),
  u8("pendingWithdrawFlag"),
  u16("takeProfitLine"),
]);

// Orca
export const ORCA_POSITION_LAYOUT = struct([
  u8("version"),
  u64("lastUpdateSlot"),
  publicKey("strategyStateAccount"),
  //41Byte
  publicKey("userMainAccount"),
  u8("pending0"),
  u8("pendingInvestFlag"),
  u8("stopLoss"),
  u64("tkn0"),
  u64("tkn1"),
  u64("borrowed0"),
  u64("borrowed1"),
  u64("principle0"),
  u64("principle1"),
  u64("investedLp"),
  u64("lpShares"),
  u64("pendingWithdrawLp"),
  u64("pendingRepay0"),
  u64("pendingRepay1"),
  u128("cumulatedBorrowRate0"),
  u128("cumulatedBorrowRate1"),
  u128("platformRewardsDebt"),
  u8("pendingWithdrawFlag"),
  u16("takeProfitLine"),
  u8("stableSwapComputeFlag"),
  u8("stableSwapDirection"),
  u64("stableSwapAmount"),
]);