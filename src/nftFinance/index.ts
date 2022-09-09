import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { INFTFarmInfo, INFTFarmerInfo, INFTPoolInfo, INFTRarityInfo, INFTLockerInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layout";
export * from "./utils";

export interface NFTRarityInfo extends INFTRarityInfo {
  adminKey: PublicKey;
  collection: string;
  rarity: string;
  mintList: PublicKey[];
}

export interface NFTPoolInfo extends INFTPoolInfo {
  adminKey: PublicKey;
  rarityId: PublicKey;
  proveTokenAuthority: PublicKey;
  proveTokenTreasury: PublicKey;
  totalStakedAmount: BN;
}

export interface NFTFarmInfo extends INFTFarmInfo {
  adminKey: PublicKey;
  proveTokenMint: PublicKey;
  rewardTokenPerSlot: BN;
  rewardVault: PublicKey;
  farmAuthority: PublicKey;
  farmAuthorityBump: BN;
  totalProveTokenDeposited: BN;
}

// NFTVault (deprecated)
export interface NFTLockerInfo extends INFTLockerInfo {
  // key => lockerId
  userKey: PublicKey; // user
  poolId: PublicKey;
  nftMint: PublicKey;
}

// Miner (deprecated)
export interface NFTFarmerInfo extends INFTFarmerInfo {
  // key => farmerId
  // owner => userKey
  farmId: PublicKey;
  farmerVault: PublicKey; // minerVault
  lastUpdateSlot: BN;
  unclaimedAmount: BN;
  depositedAmount: BN;
  farmerBump: BN; // minerBump
}
