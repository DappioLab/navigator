import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IFarmerInfo, IFarmInfo, IPoolInfo } from "../types";
import { TokenAccount } from "../utils";

export * from "./ids";
export * from "./infos";
export * from "./layouts";

export interface PoolInfo extends IPoolInfo {
  version: number;
  status: BN;
  nonce: BN;
  orderNum: BN;
  depth: BN;
  coinDecimals: BN;
  pcDecimals: BN;
  state: BN;
  resetFlag: BN;
  minSize: BN;
  volMaxCutRatio: BN;
  amountWaveRatio: BN;
  coinLotSize: BN;
  pcLotSize: BN;
  minPriceMultiplier: BN;
  maxPriceMultiplier: BN;
  needTakePnlCoin: BN;
  needTakePnlPc: BN;
  totalPnlPc: BN;
  totalPnlCoin: BN;
  poolTotalDepositPc: BN;
  poolTotalDepositCoin: BN;
  systemDecimalsValue: BN;
  poolCoinTokenAccount: PublicKey;
  poolPcTokenAccount: PublicKey;
  ammOpenOrders: PublicKey;
  serumMarket: PublicKey;
  serumProgramId: PublicKey;
  ammTargetOrders: PublicKey;
  poolWithdrawQueue: PublicKey;
  poolTempLpTokenAccount: PublicKey;
  ammOwner: PublicKey;
  pnlOwner: PublicKey;
  coinAccountAmount?: BN;
  pcAccountAmount?: BN;
  srmTokenAccount?: PublicKey;
  ammQuantities?: PublicKey;
  ammOrderbaseTokenTotal?: BN;
  ammOrderquoteTokenTotal?: BN;
}

export interface FarmInfo extends IFarmInfo {
  version: number;
  state: BN;
  nonce: BN;
  poolLpTokenAccountPubkey: PublicKey;
  poolRewardTokenAccountPubkey: PublicKey;
  owner: PublicKey;
  totalReward: BN;
  perShare: BN;
  perBlock: BN;
  lastBlock: BN;
  totalRewardB?: BN;
  perShareB?: BN;
  perBlockB?: BN;
  poolRewardTokenAccountPubkeyB?: PublicKey;
  poolLpTokenAccount?: TokenAccount;
  poolRewardTokenAccount?: TokenAccount;
  poolRewardTokenAccountB?: TokenAccount;
}

export interface FarmerInfo extends IFarmerInfo {
  farmVersion: number;
  rewardDebts: number[];
  mints: { stakedTokenMint: string; rewardAMint: string; rewardBMint?: string };
}
