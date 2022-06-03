import { publicKey, u8, u64, u128 } from "@project-serum/borsh";
//@ts-ignore
import { blob, seq, struct } from "buffer-layout";

// For summarized lp & farm info, refer to Raydium of SDK
// https://github.com/raydium-io/raydium-sdk

/* ================= state layouts ================= */

// Legacy name: STAKE_INFO_LAYOUT
export const FARM_STATE_LAYOUT_V3 = struct([
  u64("state"),
  u64("nonce"),
  publicKey("lpVault"),
  seq(publicKey(), 1, "rewardVaults"),
  publicKey("owner"), // name name defined by dappio
  publicKey("feeOwner"), // name name defined by dappio
  u64("feeY"), // name name defined by dappio
  u64("feeX"), // name name defined by dappio
  seq(u64(), 1, "totalRewards"),
  seq(u128(), 1, "perShareRewards"),
  u64("lastSlot"),
  seq(u64(), 1, "perSlotRewards"),
]);

// Legacy name: STAKE_INFO_LAYOUT_V4
export const REAL_FARM_STATE_LAYOUT_V5 = struct([
  u64("state"),
  u64("nonce"),
  publicKey("lpVault"),
  publicKey("rewardVaultA"),
  u64("totalRewardA"),
  u128("perShareRewardA"),
  u64("perSlotRewardA"),
  u8("option"),
  publicKey("rewardVaultB"),
  blob(7),
  u64("totalRewardB"),
  u128("perShareRewardB"),
  u64("perSlotRewardB"),
  u64("lastSlot"),
  publicKey("owner"), // name name defined by dappio
]);

/* ================= ledger layouts ================= */

// Legacy name:  USER_STAKE_INFO_ACCOUNT_LAYOUT
export const FARM_LEDGER_LAYOUT_V3_1 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u64(), 1, "rewardDebts"),
]);

// Legacy name: USER_STAKE_INFO_ACCOUNT_LAYOUT_V3_1
export const FARM_LEDGER_LAYOUT_V3_2 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u128(), 1, "rewardDebts"),
  seq(u64(), 17),
]);

// Legacy name: USER_STAKE_INFO_ACCOUNT_LAYOUT_V4
export const FARM_LEDGER_LAYOUT_V5_1 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u64(), 2, "rewardDebts"),
]);
// Legacy name: USER_STAKE_INFO_ACCOUNT_LAYOUT_V5
export const FARM_LEDGER_LAYOUT_V5_2 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u128(), 2, "rewardDebts"),
  seq(u64(), 17),
]);

export const AMM_INFO_LAYOUT_V4 = struct([
  u64("status"),
  u64("nonce"),
  u64("orderNum"),
  u64("depth"),
  u64("coinDecimals"),
  u64("pcDecimals"),
  u64("state"),
  u64("resetFlag"),
  u64("minSize"),
  u64("volMaxCutRatio"),
  u64("amountWaveRatio"),
  u64("coinLotSize"),
  u64("pcLotSize"),
  u64("minPriceMultiplier"),
  u64("maxPriceMultiplier"),
  u64("systemDecimalsValue"),
  // Fees
  u64("minSeparateNumerator"),
  u64("minSeparateDenominator"),
  u64("tradeFeeNumerator"),
  u64("tradeFeeDenominator"),
  u64("pnlNumerator"),
  u64("pnlDenominator"),
  u64("swapFeeNumerator"),
  u64("swapFeeDenominator"),
  // OutPutData
  u64("needTakePnlCoin"),
  u64("needTakePnlPc"),
  u64("totalPnlPc"),
  u64("totalPnlCoin"),
  u128("poolTotalDepositPc"),
  u128("poolTotalDepositCoin"),
  u128("swapCoinInAmount"),
  u128("swapPcOutAmount"),
  u64("swapCoin2PcFee"),
  u128("swapPcInAmount"),
  u128("swapCoinOutAmount"),
  u64("swapPc2CoinFee"),

  publicKey("poolCoinTokenAccount"),
  publicKey("poolPcTokenAccount"),
  publicKey("coinMintAddress"),
  publicKey("pcMintAddress"),
  publicKey("lpMintAddress"),
  publicKey("ammOpenOrders"),
  publicKey("serumMarket"),
  publicKey("serumProgramId"),
  publicKey("ammTargetOrders"),
  publicKey("poolWithdrawQueue"),
  publicKey("poolTempLpTokenAccount"),
  publicKey("ammOwner"),
  publicKey("pnlOwner"),
]);

export const STAKE_INFO_LAYOUT = struct([
  u64("state"),
  u64("nonce"),
  publicKey("poolLpTokenAccountPubkey"),
  publicKey("poolRewardTokenAccountPubkey"),
  publicKey("owner"),
  publicKey("feeOwner"),
  u64("feeY"),
  u64("feeX"),
  u64("totalReward"),
  u128("rewardPerShareNet"),
  u64("lastBlock"),
  u64("rewardPerBlock"),
]);

export const STAKE_INFO_LAYOUT_V4 = struct([
  u64("state"),
  u64("nonce"),
  publicKey("poolLpTokenAccountPubkey"),
  publicKey("poolRewardTokenAccountPubkey"),
  u64("totalReward"),
  u128("perShare"),
  u64("perBlock"),
  u8("option"),
  publicKey("poolRewardTokenAccountPubkeyB"),
  blob(7),
  u64("totalRewardB"),
  u128("perShareB"),
  u64("perBlockB"),
  u64("lastBlock"),
  publicKey("owner"),
]);
