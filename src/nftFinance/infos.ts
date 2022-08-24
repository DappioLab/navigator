import { getAccount } from "@solana/spl-token-v2";
import {
  Connection,
  PublicKey,
  GetProgramAccountsConfig,
  MemcmpFilter,
  DataSizeFilter,
} from "@solana/web3.js";
import BN from "bn.js";
import { INFTPoolInfo, INFTFarmInfo } from "../types";
import { NFT_STAKING_PROGRAM_ID, NFT_MINING_PROGRAM_ID } from "./ids";
import { POOL_LAYOUT, FARM_LAYOUT } from "./layout";

export interface NFTPoolInfo extends INFTPoolInfo {
  poolId: PublicKey;
  admin: PublicKey;
  proveTokenMint: PublicKey;
  rarityInfo: PublicKey;
  proveTokenAuthority: PublicKey;
  proveTokenVault: PublicKey;
  totalStakedAmount: BN;
}

export interface NFTFarmInfo extends INFTFarmInfo {
  farmId: PublicKey;
  admin: PublicKey;
  proveTokenMint: PublicKey;
  rewardTokenMint: PublicKey;
  rewardTokenPerSlot: BN;
  farmTokenMint: PublicKey;
  rewardVault: PublicKey;
  farmAuthority: PublicKey;
  farmAuthorityBump: BN;
  totalProveTokenDeposited: BN;
}

export async function getPool(
  connection: Connection,
  poolId: PublicKey
): Promise<NFTPoolInfo> {
  const poolAccountInfo = await connection.getAccountInfo(poolId);
  const nftPoolInfo = parsePool(poolAccountInfo?.data, poolId);

  return nftPoolInfo;
}

export async function getFarm(
  connection: Connection,
  farmId: PublicKey
): Promise<NFTFarmInfo> {
  const farmAccountInfo = await connection.getAccountInfo(farmId);
  const nftFarmInfo = parseFarm(farmAccountInfo?.data, farmId);

  return nftFarmInfo;
}

function parsePool(data: any, poolId: PublicKey): NFTPoolInfo {
  const decodedData = POOL_LAYOUT.decode(data);
  const {
    discriminator,
    admin,
    proveTokenAuthority,
    proveTokenVault,
    proveTokenMint,
    rarityInfo,
    mintListLength,
    totalLocked,
  } = decodedData;

  return {
    poolId,
    admin,
    proveTokenMint,
    rarityInfo,
    proveTokenAuthority,
    proveTokenVault,
    totalStakedAmount: totalLocked,
  };
}

function parseFarm(data: any, farmId: PublicKey): NFTFarmInfo {
  const decodedData = FARM_LAYOUT.decode(data);
  const {
    discriminator,
    admin,
    proveTokenMint,
    rewardTokenMint,
    farmTokenMint,
    rewardVault,
    farmAuthority,
    farmAuthorityBump,
    rewardTokenPerSlot,
    totalProveTokenDeposited,
  } = decodedData;

  return {
    farmId,
    admin,
    proveTokenMint,
    rewardTokenMint,
    farmTokenMint,
    rewardVault,
    farmAuthority,
    farmAuthorityBump,
    rewardTokenPerSlot,
    totalProveTokenDeposited,
  };
}
