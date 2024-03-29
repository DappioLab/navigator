import { publicKey, struct, u64, u128, u8, bool, i64, array } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

export const RESERVE_LAYOUT = struct([
  u8("version"),
  struct([u64("lastUpdatedSlot"), bool("stale")], "lastUpdate"),
  publicKey("lendingMarket"),
  publicKey("borrowAuthorizer"),
  struct(
    [
      publicKey("mintPubkey"),
      u8("mintDecimals"),
      publicKey("supplyPubkey"),
      publicKey("feeReceiver"),
      publicKey("oraclePubkey"),
      u64("availableAmount"),
      u128("borrowedAmount"),
      u128("cumulativeBorrowRate"),
      u128("marketPrice"),
      u128("platformAmountWads"),
      u8("platformFee"),
    ],
    "liquidity"
  ),
  struct([publicKey("reserveTokenMint"), u64("mintTotalSupply"), publicKey("supplyPubkey")], "collateral"),
  struct(
    [
      u8("optimalUtilizationRate"),
      u8("degenUtilizationRate"),
      u8("loanToValueRatio"),
      u8("liquidationBonus"),
      u8("liquidationThreshold"),
      u8("minBorrowRate"),
      u8("optimalBorrowRate"),
      u8("degenBorrowRate"),
      u8("maxBorrowRate"),
      struct([u64("borrowFeeWad"), u64("flashLoanFeeWad"), u8("hostFeePercentage")], "fees"),
    ],
    "config"
  ),
]);

// Vault Layout
export const VAULT_BASE_LAYOUT = struct(
  [
    u8("nonce"),
    array(u8(), 32, "tag"),
    publicKey("pda"),
    u8("pdaNonce"),
    array(u8(), 6, "pdaAlignment"),
    u64("totalDepositedBalance"),
    u64("totalShares"),
    publicKey("underlyingMint"),
    publicKey("underlyingWithdrawQueue"),
    publicKey("underlyingDepositQueue"),
    publicKey("underlyingCompoundQueue"),
    publicKey("sharesMint"),
    u8("withdrawsPaused"),
    u8("depositsPaused"),
    u8("compoundPaused"),
    u8("supportsCompound"),
    u8("rebasePaused"),
    u8("rebalancePaused"),
    array(u8(), 2, "stateAlignment"),
    u64("precisionFactor"),
    i64("lastCompoundTime"),
    i64("compoundInterval"),
    u8("slippageTolerance"),
    array(u8(), 7, "slipAlignment"),
    struct(
      [
        u64("feeMultiplier"),
        u64("controllerFee"),
        u64("platformFee"),
        u64("withdrawFee"),
        u64("depositFee"),
        publicKey("feeWallet"),
        u64("totalCollectedA"),
        u64("totalCollectedB"),
        array(u64(), 6, "buffer"),
      ],
      "fees"
    ),
    array(u64(), 2, "farm"),
    u8("configured"),
    array(u8(), 7, "configuredAlignment"),
    u64("pendingFees"),
    u64("totalDepositedBalanceCap"),
    struct([u128("a"), u128("b"), blob(32, "buffer")], "testData"),
    array(u64(), 4, "buffer"),
  ],
  "base"
);

export const RAYDIUM_VAULT_LAYOUT = struct([
  u64("discriminator"),
  VAULT_BASE_LAYOUT,
  publicKey("raydiumLpMintAddress"),
  publicKey("raydiumAmmId"),
  publicKey("raydiumAmmAuthority"),
  publicKey("raydiumAmmOpenOrders"),
  publicKey("raydiumAmmQuantitiesOrTargetOrders"),
  publicKey("raydiumStakeProgram"),
  publicKey("raydiumLiquidityProgram"),
  publicKey("raydiumCoinTokenAccount"),
  publicKey("raydiumPcTokenAccount"),
  publicKey("raydiumPoolTempTokenAccount"),
  publicKey("raydiumPoolLpTokenAccount"),
  publicKey("raydiumPoolWithdrawQueue"),
  publicKey("raydiumPoolId"),
  publicKey("raydiumPoolAuthority"),
  publicKey("raydiumPoolRewardATokenAccount"),
  publicKey("raydiumPoolRewardBTokenAccount"),
  u8("dualRewards"),
  publicKey("vaultRewardATokenAccount"),
  publicKey("vaultRewardBTokenAccount"),
  publicKey("vaultStakeInfoAccount"),
  publicKey("associatedStakeInfoAddress"),
  publicKey("coinMint"),
  publicKey("pcMint"),
  publicKey("serumMarket"),
  blob(407, "padding"),
]);

export const ORCA_FARM_DATA = [
  publicKey("userFarmAddr"),
  u8("userFarmNonce"),
  publicKey("vaultSwapTokenA"),
  publicKey("vaultSwapTokenB"),
  publicKey("poolSwapTokenA"),
  publicKey("poolSwapTokenB"),
  publicKey("poolSwapAccount"),
  publicKey("vaultRewardTokenAccount"),
  publicKey("vaultFarmTokenAccount"),
  publicKey("vaultSwapTokenAccount"),
  publicKey("globalBaseTokenVault"),
  publicKey("globalRewardTokenVault"),
  publicKey("globalFarm"),
  publicKey("farmTokenMint"),
  publicKey("rewardTokenMint"),
  publicKey("swapPoolMint"),
  publicKey("tokenAMint"),
  publicKey("tokenBMint"),
  array(publicKey(), 3, "swapMarkets"),
  blob(32, "padding"),
];

export const ORCA_VAULT_LAYOUT = struct([
  u64("discriminator"),
  VAULT_BASE_LAYOUT,
  struct(ORCA_FARM_DATA, "farmData"),
  blob(135, "padding"),
]);

export const ORCA_DD_VAULT_LAYOUT = struct([
  u64("discriminator"),
  VAULT_BASE_LAYOUT,
  struct(ORCA_FARM_DATA, "farmData"),
  struct(ORCA_FARM_DATA, "ddFarmData"),
  publicKey("ddCompoundQueue"),
  u8("ddCompoundQueueNonce"),
  u8("ddConfigured"),
  publicKey("ddWithdrawQueue"),
  u8("ddWithdrawQueueNonce"),
  blob(35, "padding"),
]);

export const LENDING_OPTIMIZER_VAULT_LAYOUT = struct([
  u64("discriminator"),
  VAULT_BASE_LAYOUT,
  publicKey("currentFarmProgram"),
  publicKey("currentPlatformInformation"),
  publicKey("currentPlatformCount"),
  u64("lastRebaseSlot"),
  blob(1000, "padding"),
]);

const STANDALONE_VAULT_CACHE = struct([
  publicKey("vaultAddress"),
  u64("depositedBalance"),
  u8("programType"),
  publicKey("programAddress"),
  publicKey("sharesMint"),
  publicKey("sharesAccount"),
  blob(55, "padding"),
]);

export const MULTI_DEPOSIT_OPTIMIZER_VAULT_LAYOUT = struct([
  u64("discriminator"),
  VAULT_BASE_LAYOUT,
  u64("lastRebaseSlot"),
  array(STANDALONE_VAULT_CACHE, 6, "standaloneVaults"),
  publicKey("targetVault"),
  publicKey("stateTransitionAccount"),
  u64("minimumRebalanceAmount"),
  blob(272, "padding"),
]);

export const DEPOSITOR_LAYOUT = struct([
  u64("discriminator"),
  publicKey("owner"),
  publicKey("vault"),
  u8("pdaNonce"),
  u8("queueNonce"),
  array(u8(), 6, "_alignment"),
  u64("shares"),
  u64("depositedBalance"),
  i64("lastDepositTime"),
  u64("pendingWithdrawAmount"),
  u64("totalDepositedUnderlying"),
  u64("totalWithdrawnUnderlying"),
  u64("lastPendingReward"),
  u128("rewardPerSharePaid"),
  publicKey("extraDataAccount"),
  blob(407, "padding"),
]);
