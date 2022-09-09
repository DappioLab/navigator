import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IFarmInfo, IPoolInfo, IFarmerInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layouts";

export interface IParsedPoolAndFarm extends PoolInfo {
  farm: FarmInfo | undefined;
  doubleDip: FarmInfo | undefined;
}

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
  lpDecimals: number;
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
  emissionsPerSecondNumerator: BN;
  emissionsPerSecondDenominator: BN;
  lastUpdatedTimestamp: BN;
  cumulativeEmissionsPerFarmToken: BN;
  baseTokenVaultAccountData: ITokenVaultInfo | undefined;
  baseTokenMintAccountData: IMintVaultInfo | undefined;
  rewardTokenVaultAccountData: ITokenVaultInfo | undefined;
  rewardTokenMintAccountData: IMintVaultInfo | undefined;
}

export interface ITokenVaultInfo {
  mint: PublicKey;
  owner: PublicKey;
  amount: BN;
}

export interface IMintVaultInfo {
  mint: PublicKey;
  supplyDividedByDecimals: BN;
  decimals: number;
}

export interface FarmerInfo extends IFarmerInfo {
  isInitialized: BN;
  accountType: BN;
  cumulativeEmissionsCheckpoint: BN;
}

export interface IOrcaAPI {
  poolAccount: string;
  apy: { week: number };
}
