import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IFarmerInfo, IFarmInfo, IPoolInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layouts";

export interface PoolInfo extends IPoolInfo {
  // poolId
  // tokenAMint
  // tokenBMint
  // lpMint

  // Decoded form account
  version: number;
  status: BN;
  nonce: BN;
  orderNum: BN;
  depth: BN;
  swapFeeNumerator: BN;
  swapFeeDenominator: BN;
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

  // Additioal attributes
  srmTokenAccount?: PublicKey;
  ammQuantities?: PublicKey;
  tokenAAmount?: bigint;
  tokenBAmount?: bigint;
  lpSupplyAmount?: bigint;
  lpDecemals?: bigint;
  ammOrderBaseTokenTotal?: bigint;
  ammOrderQuoteTokenTotal?: bigint;
}

export interface FarmInfo extends IFarmInfo {
  // farmId

  // Decoded form account
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

  // Additional attributes
  totalRewardB?: BN;
  perShareB?: BN;
  perBlockB?: BN;
  poolRewardTokenAccountPubkeyB?: PublicKey;
  poolLpTokenAccount?: TokenAccount;
  poolRewardTokenAccount?: TokenAccount;
  poolRewardTokenAccountB?: TokenAccount;
  poolLpDecimals?: bigint;
  poolRewardADecimals?: bigint;
  poolRewardBDecimals?: bigint;
}

export interface TokenAccount {
  key: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
}

export interface FarmerInfo extends IFarmerInfo {
  farmVersion: number;
  rewardDebts: number[];
  mints: { stakedTokenMint: string; rewardAMint: string; rewardBMint?: string };
}
