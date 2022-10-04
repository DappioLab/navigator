import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IPoolInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layouts";

export interface PoolInfo extends IPoolInfo {
  initializerKey: PublicKey;
  initializerDepositTokenAccount: PublicKey;
  initializerReceiveTokenAccount: PublicKey;
  initializerAmount: BN;
  takerAmount: BN;
  initialized: BN;
  bumpSeed: BN;
  freezeTrade: BN;
  freezeDeposit: BN;
  freezeWithdraw: BN;
  baseDecimals: BN;
  tokenProgramId: PublicKey;
  tokenAAccount: PublicKey;
  tokenBAccount: PublicKey;
  poolFeeAccount: PublicKey;
  pythAccount: PublicKey;
  pythPcAccount: PublicKey;
  poolConfig: PoolConfig;
  tradeFee: BN;
  hostFee: BN;
  curveType: BN;
  curveParameters: BN;

  // Additional Attributes
  tokenAAmount?: bigint;
  tokenADecimals?: number;
  tokenBAmount?: bigint;
  tokenBDecimals?: number;
  lpSupplyAmount?: bigint;
  lpDecimals?: number;
  tradingFee?: number;
  marketMakingProfit?: number;
}

export interface PoolConfig {
  key: PublicKey;
  concentrationRatio: BN;
  lastPrice: BN;
  adjustRatio: BN;
  balanceRatio: BN;
  lastBalancedPrice: BN;
  configDenominator: BN;
  pythConfidenceLimit: BN;
  pythSlotLimit: BN;
  volumeX: BN;
  volumeY: BN;
  volumeXinY: BN;
  coefficientUp: BN;
  coefficientDown: BN;
  oracleStatus: BN;
  depositCap: BN;
  configTemp2: BN;
}

export interface LifinityAPI {
  symbol: string;
  volume7Days: number;
  volume7DaysX: number;
  volume7DaysY: number;
  volumeYesterDay: number;
  volumeYesterDayX: number;
  volumeYesterDayY: number;
  fee: number;
  netapr: number;
  ca: number;
  startDate: string;
  coinBalance: number;
  pcBalance: number;
  liquidity: string;
  liquidityAmount: number;
  pythPrice: number;
  pythPcPrice: number;
  rewardsRate: number;
}

export const defaultPoolConfig: PoolConfig = {
  key: new PublicKey(0),
  concentrationRatio: new BN(0),
  lastPrice: new BN(0),
  adjustRatio: new BN(0),
  balanceRatio: new BN(0),
  lastBalancedPrice: new BN(0),
  configDenominator: new BN(0),
  pythConfidenceLimit: new BN(0),
  pythSlotLimit: new BN(0),
  volumeX: new BN(0),
  volumeY: new BN(0),
  volumeXinY: new BN(0),
  coefficientUp: new BN(0),
  coefficientDown: new BN(0),
  oracleStatus: new BN(0),
  depositCap: new BN(0),
  configTemp2: new BN(0),
};
