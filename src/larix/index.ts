export * from "./ids";
export * from "./infos";
export * from "./layouts";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { IFarmerInfo, IFarmInfo, IObligationInfo, IReserveInfo, IServicesTokenInfo } from "../types";

export interface ReserveInfo extends IReserveInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
  isLP: boolean;
  oracleBridgeInfo?: OracleBridgeInfo;
}

export interface FarmInfo extends IFarmInfo {
  // farmId

  unCollSupply: PublicKey;
  lTokenMiningIndex: BN;
  borrowMiningIndex: BN;
  totalMiningSpeed: BN;
  kinkUtilRate: BN;

  // from Reserve
  reserveTokenMint: PublicKey;
  oraclePublickey: PublicKey;
  // from ReserveLiquidity
  liquidityBorrowedAmountWads: BN;
  liquidityAvailableAmount: BN;
  liquidityMintDecimals: BN;
  liquidityMarketPrice: BN;
}

export interface ReserveConfig {
  optimalUtilizationRate: BN;
  loanToValueRatio: BN;
  liquidationBonus: BN;
  liquidationThreshold: BN;
  minBorrowRate: BN;
  optimalBorrowRate: BN;
  maxBorrowRate: BN;
  fees: ReserveFees;
}

export interface ReserveCollateral {
  reserveTokenMint: PublicKey;
  mintTotalSupply: BN;
  supplyPubkey: PublicKey;
}

export interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

export interface ReserveLiquidity {
  mintPubkey: PublicKey;
  mintDecimals: BN;
  supplyPubkey: PublicKey;
  feeReceiver: PublicKey;
  OraclePubkey: PublicKey;
  larixOraclePubkey: PublicKey;
  availableAmount: BN;
  borrowedAmountWads: BN;
  cumulativeBorrowRateWads: BN;
  marketPrice: BN;
  ownerUnclaimed: BN;
}

export interface ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
}

export interface IPartnerReward {
  rewardToken: IServicesTokenInfo;
  rate: number;
  side: string;
}

export interface OracleBridgeInfo {
  bridgePubkey: PublicKey;
  base: PublicKey;
  ammId: PublicKey;
  ammVersion: BN;
  lpMint: PublicKey;
  lpSupply: PublicKey;
  coinSupply: PublicKey;
  pcSupply: PublicKey;
  addLpWithdrawAmountAuthority: PublicKey;
  compoundAuthority: PublicKey;
  coinMintPrice: PublicKey;
  coinMintDecimal: BN;
  pcMintPrice: PublicKey;
  pcMintDecimal: BN;
  ammOpenOrders: PublicKey;
  ammCoinMintSupply: PublicKey;
  ammPcMintSupply: PublicKey;
  bump: BN;
  lpPriceAccount: PublicKey;
  isFarm: BN;
  farmPoolId: PublicKey;
  farmPoolVersion: BN;
  farmLedger: PublicKey;
}

export interface FarmerInfo extends IFarmerInfo {
  // farmerId
  // userKey
  version: BN;
  // owner: PublicKey;
  lendingMarket: PublicKey;
  reservesLen: BN;
  unclaimedMine: BN;
  indexs: FarmerIndex[];
}

export interface FarmerIndex {
  reserveId: PublicKey;
  unCollLTokenAmount: BN;
  index: BN;
}

export interface ObligationCollateral {
  index: BN;
  reserveId: PublicKey;
  depositedAmount: BN;
  marketValue: BN;
}

export interface ObligationLoan {
  index: BN;
  reserveId: PublicKey;
  cumulativeBorrowRate: BN;
  borrowedAmount: BN;
  marketValue: BN;
}

export interface ObligationInfo extends IObligationInfo {
  // obligationId

  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  owner: PublicKey;
  depositedValue: BN;
  borrowedValue: BN;
  allowedBorrowValue: BN;
  unhealthyBorrowValue: BN;
  unclaimedMine: BN;
  obligationCollaterals: ObligationCollateral[];
  obligationLoans: ObligationLoan[];
}
