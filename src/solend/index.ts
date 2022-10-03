export * from "./ids";
export * from "./infos";
export * from "./layouts";
export * from ".";

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IObligationInfo, IReserveInfo ,IServicesTokenInfo} from "../types";

export interface ReserveConfig {
  optimalUtilizationRate: BN;
  loanToValueRatio: BN;
  liquidationBonus: BN;
  liquidationThreshold: BN;
  minBorrowRate: BN;
  optimalBorrowRate: BN;
  maxBorrowRate: BN;
  fees: ReserveFees;
  depositLimit: BN;
  borrowLimit: BN;
  feeReceiver: PublicKey;
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
  pythOraclePubkey: PublicKey;
  switchboardOraclePubkey: PublicKey;
  availableAmount: BN;
  borrowedAmountWads: BN;
  cumulativeBorrowRateWads: BN;
  marketPrice: BN;
}

export interface ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
}

export interface ISolendAPIPartnerReward {
  rewardsPerShare: string;
  totalBalance: string;
  lastSlot: number;
  side: string;
  tokenMint: string;
  reserveID: string;
  market: string;
  mint: string;
  rewardMint: string;
  rewardSymbol: string;
  rewardRates: {
    beginningSlot: number;
    rewardRate: number;
    name: 0;
  }[];
}

export interface IPartnerReward {
  rewardToken: IServicesTokenInfo;
  rate: number;
  side: string;
}

export interface ReserveInfo extends IReserveInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
  partnerRewardData: IPartnerReward[];
}
export interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

export interface ObligationCollateral {
  reserveId: PublicKey;
  depositedAmount: BN;
  marketValue: BN;
}

export interface ObligationLoan {
  reserveId: PublicKey;
  cumulativeBorrowRate: BN;
  borrowedAmount: BN;
  marketValue: BN;
}

export interface ObligationInfo extends IObligationInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  depositedValue: BN;
  borrowedValue: BN;
  allowedBorrowValue: BN;
  unhealthyBorrowValue: BN;
  obligationCollaterals: ObligationCollateral[];
  obligationLoans: ObligationLoan[];
}
