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

export const POOL_LAYOUT = struct([
  bool("isInitialized"),
  bool("isPaused"),
  u8("nonce"),
  u64("initialAmpFactor"),
  u64("targetAmpFactor"),
  i64("startRampTs"),
  i64("stopRampTs"),
  i64("futureAdminDeadline"),
  publicKey("futureAdminKey"),
  publicKey("adminKey"),
  publicKey("tokenAccountA"),
  publicKey("tokenAccountB"),
  publicKey("poolMint"),
  publicKey("mintA"),
  publicKey("mintB"),
  publicKey("adminFeeAccountA"),
  publicKey("adminFeeAccountB"),
  u64("adminTradeFeeNumerator"),
  u64("adminTradeFeeDenominator"),
  u64("adminWithdrawFeeNumerator"),
  u64("adminWithdrawFeeDenominator"),
  u64("tradeFeeNumerator"),
  u64("tradeFeeDenominator"),
  u64("withdrawFeeNumerator"),
  u64("withdrawFeeDenominator"),
]);

export const FARM_LAYOUT = struct([
  publicKey("rewarderKey"),
  publicKey("tokenMintKey"),
  u8("bump"),
  u16("index"),
  u8("tokenMintDecimals"),
  i64("famineTs"),
  i64("lastUpdateTs"),
  u128("rewardsPerTokenStored"),
  u64("annualRewardsRate"),
  u64("rewardsShare"),
  u64("totalTokensDeposited"),
  u64("numMiners"),
]);

export const FARMER_LAYOUT = struct([
  publicKey("farmKey"),
  publicKey("owner"),
  u8("bump"),
  publicKey("vault"),
  u64("rewardsEarned"),
  u128("rewardsPerTokenPaid"),
  u64("balance"),
  u64("index"),
]);

export const WRAP_LAYOUT = struct([
  u8("decimal"),
  u64("multiplyer"),
  publicKey("underlyingWrappedTokenMint"),
  publicKey("underlyingTokenAccount"),
  publicKey("wrappedTokenMint"),
]);
