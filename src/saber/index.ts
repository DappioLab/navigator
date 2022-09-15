import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IFarmerInfo, IFarmInfo, IPoolInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layouts";

export interface PoolInfo extends IPoolInfo {
  authority: PublicKey;
  isInitialized: boolean;
  isPaused: boolean;
  nonce: BN;
  initialAmpFactor: BN;
  targetAmpFactor: BN;
  startRampTs: BN;
  stopRampTs: BN;
  futureAdminDeadline: BN;
  futureAdminKey: PublicKey;
  adminKey: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  adminFeeAccountA: PublicKey;
  adminFeeAccountB: PublicKey;
  tradingFee: BN;
  withdrawFee: BN;

  // Additional Attributes
  mintAWrapped?: Boolean;
  mintAWrapInfo?: WrapInfo;
  mintBWrapped?: Boolean;
  mintBWrapInfo?: WrapInfo;
  lpSupply?: BN;
  lpDecimals?: number;
  AtokenAccountAmount?: BN;
  BtokenAccountAmount?: BN;
}

export interface FarmInfo extends IFarmInfo {
  rewarderKey: PublicKey;
  tokenMintKey: PublicKey;
  bump: BN;
  index: BN;
  tokenMintDecimals: BN;
  famineTs: BN;
  lastUpdateTs: BN;
  rewardsPerTokenStored: BN;
  annualRewardsRate: BN;
  rewardsShare: BN;
  totalTokensDeposited: BN;
  numFarmers: BN;
}

export interface FarmerInfo extends IFarmerInfo {
  // infoPubkey: PublicKey;
  // farmKey: PublicKey;
  // owner: PublicKey;
  // balance: BN;
  bump: BN;
  vault: PublicKey;
  rewardsEarned: BN;
  rewardsPerTokenPaid: BN;
  index: BN;
}

export interface WrapInfo {
  wrapAuthority: PublicKey;
  decimal: BN;
  multiplyer: BN;
  underlyingWrappedTokenMint: PublicKey;
  underlyingTokenAccount: PublicKey;
  wrappedTokenMint: PublicKey;
}

export const defaultFarm: FarmInfo = {
  farmId: PublicKey.default,
  rewarderKey: PublicKey.default,
  tokenMintKey: PublicKey.default,
  bump: new BN(0),
  index: new BN(0),
  tokenMintDecimals: new BN(0),
  famineTs: new BN(0),
  lastUpdateTs: new BN(0),
  rewardsPerTokenStored: new BN(0),
  annualRewardsRate: new BN(0),
  rewardsShare: new BN(0),
  totalTokensDeposited: new BN(0),
  numFarmers: new BN(0),
};

export const defaultFarmer: FarmerInfo = {
  farmerId: PublicKey.default,
  farmId: PublicKey.default,
  userKey: PublicKey.default,
  amount: new BN(0).toNumber(),
  bump: new BN(0),
  vault: PublicKey.default,
  rewardsEarned: new BN(0),
  rewardsPerTokenPaid: new BN(0),
  index: new BN(0),
};

export const defaultWrap: WrapInfo = {
  wrapAuthority: PublicKey.default,
  decimal: new BN(0),
  multiplyer: new BN(0),
  underlyingWrappedTokenMint: PublicKey.default,
  underlyingTokenAccount: PublicKey.default,
  wrappedTokenMint: PublicKey.default,
};
