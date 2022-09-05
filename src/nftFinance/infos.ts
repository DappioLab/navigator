import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { INFTPoolInfo, INFTFarmInfo, IInstanceNFTPool, IInstanceNFTFarm, INFTRarityInfo } from "../types";
import { POOL_LAYOUT, FARM_LAYOUT, RARITY_LAYOUT } from "./layout";

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// TODO: Implement InstanceOrca

let infos: IInstanceNFTPool & IInstanceNFTFarm;

infos = class InstanceNFTFinance {
  static async getAllPools(connection: Connection): Promise<INFTPoolInfo[]> {
    return [];
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<INFTPoolInfo> {
    return {} as INFTPoolInfo;
  }

  static parsePool(data: Buffer, farmId: PublicKey): INFTPoolInfo {
    return {} as INFTPoolInfo;
  }

  static async getAllFarms(connection: Connection): Promise<INFTFarmInfo[]> {
    return [];
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<INFTFarmInfo> {
    return {} as INFTFarmInfo;
  }

  static parseFarm(data: Buffer, farmId: PublicKey): INFTFarmInfo {
    return {} as INFTFarmInfo;
  }
};

export { infos };

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

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

export async function getRarity(connection: Connection, rarityId: PublicKey): Promise<NFTRarityInfo> {
  const rarityAccountInfo = await connection.getAccountInfo(rarityId);
  const nftRarityInfo = parseRarity(rarityAccountInfo?.data, rarityId);

  return nftRarityInfo;
}

export async function getPool(connection: Connection, poolId: PublicKey): Promise<NFTPoolInfo> {
  const poolAccountInfo = await connection.getAccountInfo(poolId);
  const nftPoolInfo = parsePool(poolAccountInfo?.data, poolId);

  return nftPoolInfo;
}

export async function getFarm(connection: Connection, farmId: PublicKey): Promise<NFTFarmInfo> {
  const farmAccountInfo = await connection.getAccountInfo(farmId);
  const nftFarmInfo = parseFarm(farmAccountInfo?.data, farmId);

  return nftFarmInfo;
}

function parseRarity(data: any, rarityId: PublicKey): NFTRarityInfo {
  const decodedData = RARITY_LAYOUT.decode(data);
  const { discriminator, admin, collection, rarity, mintList } = decodedData;

  const collectionParsed = Buffer.from(collection).toString("utf-8").split("\x00")[0];

  const rarityParsed = Buffer.from(rarity).toString("utf-8").split("\x00")[0];

  return {
    rarityId,
    admin,
    collection: collectionParsed,
    rarity: rarityParsed,
    mintList,
  };
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
