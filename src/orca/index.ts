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

  // Additional Attributes
  tokenSupplyA?: bigint;
  tokenSupplyB?: bigint;
  lpSupply?: bigint;
  lpDecimals?: number;
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

  // Additional Attributes
  poolId?: PublicKey;
  tokenSupplyA?: bigint;
  tokenSupplyB?: bigint;
  lpSupply?: bigint;
  lpDecimals?: number;
  tokenAPrice?: number;
  tokenADecimals?: number;
  tokenBPrice?: number;
  tokenBDecimals?: number;
  rewardTokenPrice?: number;
  doubleDipEmissionsPerSecondNumerator?: BN;
  doubleDipEmissionsPerSecondDenominator?: BN;
  doubleDipRewardTokenMintAccountData?: IMintVaultInfo | undefined;
  doubleDipBaseTokenVaultAccountData?: ITokenVaultInfo | undefined;
  doubleDipBaseTokenMintAccountData?: IMintVaultInfo | undefined;
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
