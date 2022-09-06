import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { INFTFarmInfo, INFTMinerInfo, INFTPoolInfo, INFTRarityInfo, INFTVaultInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layout";
export * from "./utils";

export interface NFTRarityInfo extends INFTRarityInfo {
  admin: PublicKey;
  collection: string;
  rarity: string;
  mintList: PublicKey[];
}

export interface NFTPoolInfo extends INFTPoolInfo {
  admin: PublicKey;
  rarityInfo: PublicKey;
  proveTokenAuthority: PublicKey;
  proveTokenVault: PublicKey;
  totalStakedAmount: BN;
}

export interface NFTFarmInfo extends INFTFarmInfo {
  admin: PublicKey;
  proveTokenMint: PublicKey;
  rewardTokenPerSlot: BN;
  rewardVault: PublicKey;
  farmAuthority: PublicKey;
  farmAuthorityBump: BN;
  totalProveTokenDeposited: BN;
}

export interface AllInfo {
  rarityInfo: NFTRarityInfo;
  poolInfo: NFTPoolInfo;
  farmInfo: NFTFarmInfo;
}

// infoAndNftPair (deprecated)
export interface NFTInfo {
  allInfo: AllInfo;
  nftMint: PublicKey;
}

// NFTVault (deprecated)
export interface NFTVaultInfo extends INFTVaultInfo {
  // key (deprecated) => vaultId
  nftHolder: PublicKey; // user (deprecated)
  poolId: PublicKey;
  nftMint: PublicKey;
}

// Miner (deprecated)
export interface NFTMinerInfo extends INFTMinerInfo {
  // key (deprecated) => minerId
  // owner (deprecated) => userKey
  farmId: PublicKey;
  minerVault: PublicKey;
  lastUpdateSlot: BN;
  unclaimedAmount: BN;
  depositedAmount: BN;
  minerBump: BN;
}

// UserInfo
export interface UserNFTInfo {
  userKey: PublicKey; // wallet (deprecated)
  vaults: NFTVaultInfo[]; // staked (deprecated)
  miners: NFTMinerInfo[];
}
