import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IFarmInfo, IPoolInfo, IFarmerInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layouts";

export interface PoolInfo extends IPoolInfo {
  version: BN;
  isInitialized: BN;
  nonce: BN;
  tokenProgramId: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  feeAccount: PublicKey;
  tokenSupplyA: BN;
  tokenSupplyB: BN;
  lpSupply: BN;
}

export interface FarmInfo extends IFarmInfo {
  isInitialized: BN;
  accountType: BN;
  nonce: BN;
  tokenProgramId: PublicKey;
  emissionsAuthority: PublicKey;
  removeRewardsAuthority: PublicKey;
  baseTokenMint: PublicKey;
  baseTokenVault: PublicKey;
  rewardTokenVault: PublicKey;
  farmTokenMint: PublicKey;
  // authority: PublicKey;
  emissionsPerSecondNumerator: BN;
  emissionsPerSecondDenominator: BN;
  lastUpdatedTimestamp: BN;
  cumulativeEmissionsPerFarmToken: BN;
}

export interface FarmerInfo extends IFarmerInfo {
  isInitialized: BN;
  accountType: BN;
  cumulativeEmissionsCheckpoint: BN;
}
