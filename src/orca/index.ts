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
  lpMint: PublicKey;
  lpDecimals: number;
  tradingAPR: number | null;
  doubleDipAPR: number | null;
  emissionAPR: number | null;
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
  baseTokenVaultAccountData: {
    mint: PublicKey;
    owner: PublicKey;
    amount: BN;
  } | null;
  baseTokenMintAccountData: {
    mint: PublicKey;
    supply: BN;
    decimals: number;
  } | null;
  rewardTokenVaultAccountData: {
    mint: PublicKey;
    owner: PublicKey;
    amount: BN;
  } | null;
  rewardTokenMintAccountData: {
    mint: PublicKey;
    supply: BN;
    decimals: number;
  } | null;
}

export interface FarmerInfo extends IFarmerInfo {
  isInitialized: BN;
  accountType: BN;
  cumulativeEmissionsCheckpoint: BN;
}
