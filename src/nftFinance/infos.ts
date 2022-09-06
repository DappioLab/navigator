import { Connection, DataSizeFilter, GetProgramAccountsConfig, MemcmpFilter, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  INFTPoolInfo,
  INFTFarmInfo,
  IInstanceNFTPool,
  IInstanceNFTFarm,
  INFTRarityInfo,
  INFTVaultInfo,
  INFTMinerInfo,
} from "../types";
import { NFT_MINING_PROGRAM_ID, NFT_RARITY_PROGRAM_ID, NFT_STAKING_PROGRAM_ID } from "./ids";
import { find } from "lodash";
import { POOL_LAYOUT, FARM_LAYOUT, RARITY_LAYOUT, NFT_VAULT_LAYOUT, MINER_LAYOUT } from "./layout";

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// TODO: Implement InstanceNFTFinance

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

const RARITY_LAYOUT_SPAN = 16460;
const POOL_LAYOUT_SPAN = 184;
const FARM_LAYOUT_SPAN = 217;
const NFT_VAULT_LAYOUT_SPAN = 104;
const MINER_LAYOUT_SPAN = 129;

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

// fetchAll (deprecated)
export async function getAllInfos(connection: Connection, adminAddress?: PublicKey): Promise<AllInfo[]> {
  const rarityMap = new Map<string, number>();
  const farmMap = new Map<string, number>();
  const allRarityInfos = await getAllRarities(connection, adminAddress);
  const allPoolInfos = await getAllPools(connection, adminAddress);
  const allFarmInfos = await getAllFarms(connection, adminAddress);
  allRarityInfos.map((rarityInfo, index) => {
    rarityMap.set(rarityInfo.rarityId.toString(), index);
  });
  allFarmInfos.map((farmInfo, index) => {
    farmMap.set(farmInfo.proveTokenMint.toString(), index);
  });

  const allInfos: AllInfo[] = [];
  for (let poolInfo of allPoolInfos) {
    const rarityId = poolInfo.rarityInfo.toString();
    const proveTokenMint = poolInfo.proveTokenMint.toString();
    const rarityIndex = rarityMap.get(rarityId);
    const farmIndex = farmMap.get(proveTokenMint);
    if (rarityIndex != undefined && farmIndex != undefined) {
      const rarityInfo = allRarityInfos[rarityIndex];
      const farmInfo = allFarmInfos[farmIndex];
      allInfos.push({ rarityInfo, poolInfo, farmInfo });
    }
  }

  return allInfos;
}

export async function getAllRarities(connection: Connection, adminAddress?: PublicKey): Promise<NFTRarityInfo[]> {
  let filters: (MemcmpFilter | DataSizeFilter)[] = [];

  const dataSizeFilters: DataSizeFilter = {
    dataSize: RARITY_LAYOUT_SPAN,
  };
  filters = [dataSizeFilters];

  let adminIdMemcmp: MemcmpFilter;
  if (adminAddress != null && adminAddress != undefined) {
    adminIdMemcmp = {
      memcmp: {
        offset: 8,
        bytes: adminAddress.toString(),
      },
    };
    filters.push(adminIdMemcmp);
  }

  const config: GetProgramAccountsConfig = { filters: filters };
  const allRarityAccounts = await connection.getProgramAccounts(NFT_RARITY_PROGRAM_ID, config);

  const allNFTRarityInfos: NFTRarityInfo[] = [];
  allRarityAccounts.map((rarityAccount) => {
    const nftRarityInfo = parseRarity(rarityAccount.account.data, rarityAccount.pubkey);
    allNFTRarityInfos.push(nftRarityInfo);
  });

  return allNFTRarityInfos;
}

export async function getRarity(connection: Connection, rarityId: PublicKey): Promise<NFTRarityInfo> {
  const rarityAccountInfo = await connection.getAccountInfo(rarityId);
  const nftRarityInfo = parseRarity(rarityAccountInfo?.data, rarityId);

  return nftRarityInfo;
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

export async function getAllPools(connection: Connection, adminAddress?: PublicKey): Promise<NFTPoolInfo[]> {
  let filters: (MemcmpFilter | DataSizeFilter)[] = [];

  const dataSizeFilters: DataSizeFilter = {
    dataSize: POOL_LAYOUT_SPAN,
  };
  filters = [dataSizeFilters];

  let adminIdMemcmp: MemcmpFilter;
  if (adminAddress != null && adminAddress != undefined) {
    adminIdMemcmp = {
      memcmp: {
        offset: 8,
        bytes: adminAddress.toString(),
      },
    };
    filters.push(adminIdMemcmp);
  }

  const config: GetProgramAccountsConfig = { filters: filters };
  const allPoolAccounts = await connection.getProgramAccounts(NFT_STAKING_PROGRAM_ID, config);

  const allNFTPoolInfos: NFTPoolInfo[] = [];
  allPoolAccounts.map((poolAccount) => {
    const nftPoolInfo = parsePool(poolAccount.account.data, poolAccount.pubkey);
    allNFTPoolInfos.push(nftPoolInfo);
  });

  return allNFTPoolInfos;
}

export async function getPool(connection: Connection, poolId: PublicKey): Promise<NFTPoolInfo> {
  const poolAccountInfo = await connection.getAccountInfo(poolId);
  const nftPoolInfo = parsePool(poolAccountInfo?.data, poolId);

  return nftPoolInfo;
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

export async function getAllFarms(connection: Connection, adminAddress?: PublicKey): Promise<NFTFarmInfo[]> {
  let filters: (MemcmpFilter | DataSizeFilter)[] = [];

  const dataSizeFilters: DataSizeFilter = {
    dataSize: FARM_LAYOUT_SPAN,
  };
  filters = [dataSizeFilters];

  let adminIdMemcmp: MemcmpFilter;
  if (adminAddress != null && adminAddress != undefined) {
    adminIdMemcmp = {
      memcmp: {
        offset: 8,
        bytes: adminAddress.toString(),
      },
    };
    filters.push(adminIdMemcmp);
  }

  const config: GetProgramAccountsConfig = { filters: filters };
  const allFarmAccounts = await connection.getProgramAccounts(NFT_MINING_PROGRAM_ID, config);

  const allNFTFarmInfos: NFTFarmInfo[] = [];
  allFarmAccounts.map((farmAccount) => {
    const nftFarmInfo = parseFarm(farmAccount.account.data, farmAccount.pubkey);
    allNFTFarmInfos.push(nftFarmInfo);
  });

  return allNFTFarmInfos;
}

export async function getFarm(connection: Connection, farmId: PublicKey): Promise<NFTFarmInfo> {
  const farmAccountInfo = await connection.getAccountInfo(farmId);
  const nftFarmInfo = parseFarm(farmAccountInfo?.data, farmId);

  return nftFarmInfo;
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

export async function getAllNFTVaults(connection: Connection, userKey?: PublicKey): Promise<NFTVaultInfo[]> {
  let filters: (MemcmpFilter | DataSizeFilter)[] = [];

  const dataSizeFilters: DataSizeFilter = {
    dataSize: NFT_VAULT_LAYOUT_SPAN,
  };
  filters = [dataSizeFilters];

  let nftHolderMemcmp: MemcmpFilter;
  if (userKey != null && userKey != undefined) {
    nftHolderMemcmp = {
      memcmp: {
        offset: 8,
        bytes: userKey.toString(),
      },
    };
    filters.push(nftHolderMemcmp);
  }

  const config: GetProgramAccountsConfig = { filters: filters };
  const allNFTVaultAccounts = await connection.getProgramAccounts(NFT_STAKING_PROGRAM_ID, config);

  const allNFTVaultInfos: NFTVaultInfo[] = [];
  allNFTVaultAccounts.map((nftVaultAccount) => {
    const nftVaultInfo = parseNFTMiner(nftVaultAccount.account.data, nftVaultAccount.pubkey);
    allNFTVaultInfos.push(nftVaultInfo);
  });

  return allNFTVaultInfos;
}

export async function getNFTVault(connection: Connection, vaultId: PublicKey): Promise<NFTVaultInfo> {
  const nftVaultAccountInfo = await connection.getAccountInfo(vaultId);
  const nftVaultInfo = parseNFTMiner(nftVaultAccountInfo?.data, vaultId);

  return nftVaultInfo;
}

function parseNFTMiner(data: any, vaultId: PublicKey): NFTVaultInfo {
  const decodedData = NFT_VAULT_LAYOUT.decode(data);
  const { discriminator, user, poolInfo, nftMint } = decodedData;

  return {
    vaultId,
    nftHolder: user,
    poolId: poolInfo,
    nftMint,
  };
}

export async function getAllNFTMiners(connection: Connection, userKey?: PublicKey): Promise<NFTMinerInfo[]> {
  let filters: (MemcmpFilter | DataSizeFilter)[] = [];

  const dataSizeFilters: DataSizeFilter = {
    dataSize: MINER_LAYOUT_SPAN,
  };
  filters = [dataSizeFilters];

  let nftHolderMemcmp: MemcmpFilter;
  if (userKey != null && userKey != undefined) {
    nftHolderMemcmp = {
      memcmp: {
        offset: 8,
        bytes: userKey.toString(),
      },
    };
    filters.push(nftHolderMemcmp);
  }

  const config: GetProgramAccountsConfig = { filters: filters };
  const allNFTMinerAccounts = await connection.getProgramAccounts(NFT_MINING_PROGRAM_ID, config);

  const allNFTMinerInfos: NFTMinerInfo[] = [];
  allNFTMinerAccounts.map((nftMinerAccount) => {
    const nftMinerInfo = parseMiner(nftMinerAccount.account.data, nftMinerAccount.pubkey);
    allNFTMinerInfos.push(nftMinerInfo);
  });

  return allNFTMinerInfos;
}

export async function getNFTMiner(connection: Connection, minerId: PublicKey): Promise<NFTMinerInfo> {
  const nftMinerAccountInfo = await connection.getAccountInfo(minerId);
  const nftMinerInfo = parseMiner(nftMinerAccountInfo?.data, minerId);

  return nftMinerInfo;
}

function parseMiner(data: any, minerId: PublicKey): NFTMinerInfo {
  const decodedData = MINER_LAYOUT.decode(data);
  const { discriminator, owner, farmInfo, minerVault, lastUpdateSlot, unclaimedAmount, depositedAmount, minerBump } =
    decodedData;

  return {
    minerId,
    userKey: owner,
    farmId: farmInfo,
    minerVault,
    lastUpdateSlot,
    unclaimedAmount,
    depositedAmount,
    minerBump,
  };
}

// fetchUser (deprecated)
export async function getUserNFTInfo(connection: Connection, userKey: PublicKey): Promise<UserNFTInfo> {
  const allNFTVaults = await getAllNFTVaults(connection, userKey);
  const allNFTMiners = await getAllNFTMiners(connection, userKey);

  return {
    userKey,
    vaults: allNFTVaults,
    miners: allNFTMiners,
  };
}

export function getStakedAmount(allInfos: AllInfo[], collection: string = "", rarity: string = "") {
  let staked = 0;
  for (let allInfo of allInfos) {
    if (allInfo.rarityInfo.collection == collection || collection == "") {
      if (allInfo.rarityInfo.rarity == rarity || rarity == "") {
        staked += Number(allInfo.poolInfo.totalStakedAmount);
      }
    }
  }
  return staked;
}

export async function getNFTUUnclaimedAmount(
  allInfos: AllInfo[],
  userInfo: UserNFTInfo,
  connection: Connection,
  collection: string = "",
  rarity: string = ""
) {
  const currentSlot = await connection.getSlot();
  const allInfoMap = new Map<string, number>();
  allInfos.map((allInfo, index) => {
    allInfoMap.set(allInfo.farmInfo.farmId.toString(), index);
  });

  let totalUnclaimAmount = 0;
  for (let miner of userInfo.miners) {
    const allInfoIndex = allInfoMap.get(miner.farmId.toString());
    if (allInfoIndex != undefined) {
      const allInfo = allInfos[allInfoIndex];
      if (
        (collection == "" || allInfo.rarityInfo.collection == collection) &&
        (rarity == "" || allInfo.rarityInfo.rarity == rarity)
      ) {
        const rewardTokenPerSlot = Number(allInfo.farmInfo.rewardTokenPerSlot);
        const unclaimedAmount = Number(miner.unclaimedAmount);
        const depositedAmount = Number(miner.depositedAmount);
        const lastUpdateSlot = Number(miner.lastUpdateSlot);

        totalUnclaimAmount += unclaimedAmount + (currentSlot - lastUpdateSlot) * rewardTokenPerSlot * depositedAmount;
      }
    }
  }
  return totalUnclaimAmount;
}

// infoAndNftMatcher (deprecated)
export function filterAllInfosByNFTMint(allInfos: AllInfo[], nftMints: PublicKey[]): NFTInfo[] {
  let nftInfos: NFTInfo[] = [];
  for (let nftMint of nftMints) {
    for (let allInfo of allInfos) {
      if (find(allInfo.rarityInfo.mintList, (allowedMint) => allowedMint.equals(nftMint))) {
        nftInfos.push({
          allInfo: allInfo,
          nftMint: nftMint,
        });
        break;
      }
    }
  }

  return nftInfos;
}

// getAllInfoFromPoolInfoKey (deprecated)
export function filterAllInfosByPoolId(allInfos: AllInfo[], poolId: PublicKey): AllInfo {
  let targetInfo: AllInfo = defaultAllInfo();
  for (let allInfo of allInfos) {
    if (allInfo.poolInfo.poolId.equals(poolId)) {
      return allInfo;
    }
  }
  return targetInfo;
}

// getFarmInfosFromFarmInfoKeys (deprecated)
export function filterFarmInfosByFarmIds(allInfos: AllInfo[], farmIds: PublicKey[]) {
  const allInfoMap = new Map<string, number>();
  allInfos.map((allInfo, index) => {
    allInfoMap.set(allInfo.farmInfo.farmId.toString(), index);
  });

  let farmInfos: NFTFarmInfo[] = [];
  for (let farmId of farmIds) {
    const allInfoIndex = allInfoMap.get(farmId.toString());
    if (allInfoIndex != undefined) {
      farmInfos.push(allInfos[allInfoIndex].farmInfo);
    }
  }

  return farmInfos;
}

// default objects
export function defaultAllInfo(): AllInfo {
  return {
    rarityInfo: defaultRarityInfo(),
    poolInfo: defaultPoolInfo(),
    farmInfo: defaultFarmInfo(),
  };
}

export function defaultRarityInfo(): NFTRarityInfo {
  return {
    rarityId: PublicKey.default,
    admin: PublicKey.default,
    collection: "",
    rarity: "",
    mintList: [],
  };
}

export function defaultPoolInfo(): NFTPoolInfo {
  return {
    poolId: PublicKey.default,
    proveTokenMint: PublicKey.default,
    admin: PublicKey.default,
    rarityInfo: PublicKey.default,
    proveTokenAuthority: PublicKey.default,
    proveTokenVault: PublicKey.default,
    totalStakedAmount: new BN(0),
  };
}

export function defaultFarmInfo(): NFTFarmInfo {
  return {
    farmId: PublicKey.default,
    farmTokenMint: PublicKey.default,
    rewardTokenMint: PublicKey.default,
    admin: PublicKey.default,
    proveTokenMint: PublicKey.default,
    rewardTokenPerSlot: new BN(0),
    rewardVault: PublicKey.default,
    farmAuthority: PublicKey.default,
    farmAuthorityBump: new BN(0),
    totalProveTokenDeposited: new BN(0),
  };
}
