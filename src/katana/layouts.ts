import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";

export const OPTION_PRAM_LAYOUT = struct([publicKey("vault"), u64("expiry"), u64("strike")]);

export const VAULT_LAYOUT_COMMON = [
  publicKey("admin"),
  publicKey("pendingAdmin"),
  publicKey("vaultAuthority"),
  u128("cap"),
  u128("lockedAmount"),
  u128("lastLockedAmount"),
  u128("totalPendingDeposits"),
  u128("queuedWithdrawShares"),
  u128("totalShares"),
  u128("round"),
  publicKey("underlyingTokenMint"),
  publicKey("quoteTokenMint"),
  publicKey("optionTokenMint"),
  publicKey("nextOptionTokenMint"),
  publicKey("nextOptionTokenVault"),
  publicKey("writerTokenMint"),
  publicKey("nextWriterTokenMint"),
  publicKey("nextWriterTokenVault"),
  publicKey("derivativeTokenMint"),
  publicKey("earlyAccessTokenMint"),
  publicKey("underlyingTokenVault"),
  publicKey("quoteTokenVault"),
  publicKey("optionTokenVault"),
  publicKey("writerTokenVault"),
  publicKey("derivativeTokenVault"),
  publicKey("openOrders"),
  u8("decimals"),
  u8("bump"),
  u8("authorityBump"),
  u8("derivativeMintBump"),
  u8("vaultBumpsUnderlying"),
  u8("vaultBumpsQuote"),
  u8("vaultBumpsOption"),
  u8("vaultBumpsWriter"),
  u8("vaultBumpsDerivative"),
  u8("pendingvaultBumpsOption"),
  u8("pendingvaultBumpsWriter"),
  bool("isPaused"),
  bool("onlyEarlyAccess"),
];

export const COVER_VAULT_LAYOUT = struct(VAULT_LAYOUT_COMMON);

export const PUT_VAULT_LAYOUT = struct([publicKey("identifier"), ...VAULT_LAYOUT_COMMON]);

export const DEPOSITOR_LAYOUT = struct([
  publicKey("owner"),
  u128("PendingDepositDataRound"),
  u128("PendingDepositDataAmount"),
  u128("PendingDepositDataUnredeemedShares"),
  u128("PendingWithdrawDataRound"),
  u128("PendingWithdrawDatShares"),
  u8("bump"),
]);

export const OTC_TERMS_LAYOUT = struct([
  u128("round"),
  u64("totalPrice"),
  publicKey("tokenMintToBuy"),
  publicKey("tokenMintToSell"),
  u8("bump"),
]);

export const PRICE_PER_PAGE_LAYOUT = struct([u128("page"), u8("bump")]);

export const MARKET_LAYOUT = struct([
  publicKey("optionMint"),
  publicKey("writerTokenMint"),
  publicKey("underlyingAssetMint"),
  publicKey("quoteAssetMint"),
  u64("underlyingAmountPerContract"),
  u64("quoteAmountPerContract"),
  i64("expirationUnixTimestamp"),
  publicKey("underlyingAssetPool"),
  publicKey("quoteAssetPool"),
  publicKey("mintFeeAccount"),
  publicKey("exerciseFeeAccount"),
  bool("expired"),
  u8("bumpSeed"),
]);
