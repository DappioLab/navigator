export * from "./ids";
export * from "./infos";

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IDepositorInfo, IReserveInfo, IVaultInfo } from "../types";

export interface Fees {
  feeMultiplier: BN;
  controllerFee: BN;
  platformFee: BN;
  withdrawFee: BN;
  depositFee: BN;
  feeWallet: PublicKey;
  totalCollectedA: BN;
  totalCollectedB: BN;
}

export interface RealizedYield {
  gainPerSecond: BN;
  apr: BN;
}

export interface Base {
  nonce: BN;
  tag: BN[];
  pda: PublicKey;
  pdaNonce: BN;
  pdaAlignment: BN[];
  totalDepositedBalance: BN;
  totalShares: BN;
  underlyingMint: PublicKey;
  underlyingWithdrawQueue: PublicKey;
  underlyingDepositQueue: PublicKey;
  underlyingCompoundQueue: PublicKey;
  sharesMint: PublicKey;
  withdrawsPaused: BN;
  depositsPaused: BN;
  compoundPaused: BN;
  supportsCompound: BN;
  rebasePaused: BN;
  rebalancePaused: BN;
  stateAlignment: BN[];
  precisionFactor: BN;
  lastCompoundTime: BN;
  compoundInterval: BN;
  slippageTolerance: BN;
  slipAlignment: BN[];
  fees: Fees;
  farm: BN[];
  configured: BN;
  configuredAlignment: BN[];
  pendingFees: BN;
  totalDepositedBalanceCap: BN;
  realizedYield: RealizedYield;
}

export interface RaydiumVaultInfo extends VaultInfo {
  base: Base;
  lpMint: PublicKey;
  ammId: PublicKey;
  ammAuthority: PublicKey;
  ammOpenOrders: PublicKey;
  ammQuantitiesOrTargetOrders: PublicKey;
  stakeProgram: PublicKey;
  liquidityProgram: PublicKey;
  coinTokenAccount: PublicKey;
  pcTokenAccount: PublicKey;
  poolTempTokenAccount: PublicKey;
  poolLpTokenAccount: PublicKey;
  poolWithdrawQueue: PublicKey;
  poolId: PublicKey;
  poolAuthority: PublicKey;
  poolRewardATokenAccount: PublicKey;
  poolRewardBTokenAccount: PublicKey;
  feeCollectorRewardATokenAccount: PublicKey;
  feeCollectorRewardBTokenAccount: PublicKey;
  dualRewards: BN;
  vaultRewardATokenAccount: PublicKey;
  vaultRewardBTokenAccount: PublicKey;
  vaultStakeInfoAccount: PublicKey;
  associatedStakeInfoAddress: PublicKey;
  coinMint: PublicKey;
  pcMint: PublicKey;
  serumMarket: PublicKey;
}

export interface ReserveConfig {
  optimalUtilizationRate: BN;
  degenUtilizationRate: BN;
  loanToValueRatio: BN;
  liquidationBonus: BN;
  liquidationThreshold: BN;
  minBorrowRate: BN;
  optimalBorrowRate: BN;
  degenBorrowRate: BN;
  maxBorrowRate: BN;
  fees: ReserveFees;
}

export interface ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
}

export interface ReserveCollateral {
  reserveTokenMint: PublicKey;
  mintTotalSupply: BN;
  supplyPubkey: PublicKey;
}

export interface ReserveLiquidity {
  mintPubkey: PublicKey;
  mintDecimals: BN;
  supplyPubkey: PublicKey;
  feeReceiver: PublicKey;
  oraclePubkey: PublicKey;
  availableAmount: BN;
  borrowedAmount: BN;
  cumulativeBorrowRate: BN;
  marketPrice: BN;
  platformAmountWads: BN;
  platformFee: BN;
}

export interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

export interface ReserveInfo extends IReserveInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  borrowAuthorizer: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
}

export interface VaultInfo extends IVaultInfo {
  base: Base;
}

export interface DepositorInfo extends IDepositorInfo {
  vaultId: PublicKey;
  pdaNonce: BN;
  queueNonce: BN;
  shares: BN;
  depositedBalance: BN;
  lastDepositTime: BN;
  pendingWithdrawAmount: BN;
  totalDepositedUnderlying: BN;
  totalWithdrawnUnderlying: BN;
  lastPendingReward: BN;
  rewardPerSharePaid: BN;
  extra_data_account: PublicKey;
}
