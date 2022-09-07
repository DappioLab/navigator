import { Connection, DataSizeFilter, GetProgramAccountsConfig, MemcmpFilter, PublicKey } from "@solana/web3.js";
import { IInstanceNFTPool, IInstanceNFTFarm, IInstanceNFTVault, IInstanceNFTFarmer } from "../types";
import { NFT_MINING_PROGRAM_ID, NFT_RARITY_PROGRAM_ID, NFT_STAKING_PROGRAM_ID } from "./ids";
import { POOL_LAYOUT, FARM_LAYOUT, RARITY_LAYOUT, NFT_VAULT_LAYOUT, FARMER_LAYOUT } from "./layout";
import { NFTRarityInfo, NFTPoolInfo, NFTFarmInfo, AllInfo, NFTVaultInfo, NFTFarmerInfo, UserNFTInfo } from ".";

const RARITY_LAYOUT_SPAN = 16460;
const POOL_LAYOUT_SPAN = 184;
const FARM_LAYOUT_SPAN = 217;
const NFT_VAULT_LAYOUT_SPAN = 104;
const FARMER_LAYOUT_SPAN = 129;

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// TODO: Implement InstanceNFTFinance

let infos: IInstanceNFTPool & IInstanceNFTFarm & IInstanceNFTVault & IInstanceNFTFarmer;

infos = class InstanceNFTFinance {
  // fetchAll (deprecated)
  static async getAllInfos(connection: Connection, adminAddress?: PublicKey): Promise<AllInfo[]> {
    const rarityMap = new Map<string, number>();
    const farmMap = new Map<string, number>();
    const allRarityInfos = await this.getAllRarities(connection, adminAddress);
    const allPoolInfos = await this.getAllPools(connection, adminAddress);
    const allFarmInfos = await this.getAllFarms(connection, adminAddress);
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

  // fetchUser (deprecated)
  static async getUserNFTInfo(connection: Connection, userKey: PublicKey): Promise<UserNFTInfo> {
    const allNFTVaults = await this.getAllNFTVaults(connection, userKey);
    const allNFTFarmers = await this.getAllNFTFarmers(connection, userKey);

    return {
      userKey,
      vaults: allNFTVaults,
      farmers: allNFTFarmers,
    };
  }

  static async getAllRarities(connection: Connection, adminAddress?: PublicKey): Promise<NFTRarityInfo[]> {
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
      const nftRarityInfo = this.parseRarity(rarityAccount.account.data, rarityAccount.pubkey);
      allNFTRarityInfos.push(nftRarityInfo);
    });

    return allNFTRarityInfos;
  }

  static async getRarity(connection: Connection, rarityId: PublicKey): Promise<NFTRarityInfo> {
    const rarityAccountInfo = await connection.getAccountInfo(rarityId);
    const nftRarityInfo = this.parseRarity(rarityAccountInfo?.data as Buffer, rarityId);

    return nftRarityInfo;
  }

  static parseRarity(data: any, rarityId: PublicKey): NFTRarityInfo {
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

  static async getAllPools(connection: Connection, adminAddress?: PublicKey): Promise<NFTPoolInfo[]> {
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
      const nftPoolInfo = this.parsePool(poolAccount.account.data, poolAccount.pubkey);
      allNFTPoolInfos.push(nftPoolInfo);
    });

    return allNFTPoolInfos;
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<NFTPoolInfo> {
    const poolAccountInfo = await connection.getAccountInfo(poolId);
    const nftPoolInfo = this.parsePool(poolAccountInfo?.data as Buffer, poolId);

    return nftPoolInfo;
  }

  static parsePool(data: Buffer, poolId: PublicKey): NFTPoolInfo {
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

  static async getAllFarms(connection: Connection, adminAddress?: PublicKey): Promise<NFTFarmInfo[]> {
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
      const nftFarmInfo = this.parseFarm(farmAccount.account.data, farmAccount.pubkey);
      allNFTFarmInfos.push(nftFarmInfo);
    });

    return allNFTFarmInfos;
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<NFTFarmInfo> {
    const farmAccountInfo = await connection.getAccountInfo(farmId);
    const nftFarmInfo = this.parseFarm(farmAccountInfo?.data as Buffer, farmId);

    return nftFarmInfo;
  }

  static parseFarm(data: Buffer, farmId: PublicKey): NFTFarmInfo {
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

  static async getAllNFTVaults(connection: Connection, userKey?: PublicKey): Promise<NFTVaultInfo[]> {
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
      const nftVaultInfo = this.parseNFTVault(nftVaultAccount.account.data, nftVaultAccount.pubkey);
      allNFTVaultInfos.push(nftVaultInfo);
    });

    return allNFTVaultInfos;
  }

  static async getNFTVault(connection: Connection, vaultId: PublicKey): Promise<NFTVaultInfo> {
    const nftVaultAccountInfo = await connection.getAccountInfo(vaultId);
    const nftVaultInfo = this.parseNFTVault(nftVaultAccountInfo?.data as Buffer, vaultId);

    return nftVaultInfo;
  }

  static parseNFTVault(data: any, vaultId: PublicKey): NFTVaultInfo {
    const decodedData = NFT_VAULT_LAYOUT.decode(data);
    const { discriminator, user, poolInfo, nftMint } = decodedData;

    return {
      vaultId,
      nftHolder: user,
      poolId: poolInfo,
      nftMint,
    };
  }

  static async getAllNFTFarmers(connection: Connection, userKey?: PublicKey): Promise<NFTFarmerInfo[]> {
    let filters: (MemcmpFilter | DataSizeFilter)[] = [];

    const dataSizeFilters: DataSizeFilter = {
      dataSize: FARMER_LAYOUT_SPAN,
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
    const allNFTFarmerAccounts = await connection.getProgramAccounts(NFT_MINING_PROGRAM_ID, config);

    const allNFTFarmerInfos: NFTFarmerInfo[] = [];
    allNFTFarmerAccounts.map((nftFarmerAccount) => {
      const nftFarmerInfo = this.parseNFTFarmer(nftFarmerAccount.account.data, nftFarmerAccount.pubkey);
      allNFTFarmerInfos.push(nftFarmerInfo);
    });

    return allNFTFarmerInfos;
  }

  static async getNFTFarmer(connection: Connection, farmerId: PublicKey): Promise<NFTFarmerInfo> {
    const nftFarmerAccountInfo = await connection.getAccountInfo(farmerId);
    const nftFarmerInfo = this.parseNFTFarmer(nftFarmerAccountInfo?.data as Buffer, farmerId);

    return nftFarmerInfo;
  }

  static parseNFTFarmer(data: any, farmerId: PublicKey): NFTFarmerInfo {
    const decodedData = FARMER_LAYOUT.decode(data);
    const {
      discriminator,
      owner,
      farmInfo,
      farmerVault,
      lastUpdateSlot,
      unclaimedAmount,
      depositedAmount,
      farmerBump,
    } = decodedData;

    return {
      farmerId,
      userKey: owner,
      farmId: farmInfo,
      farmerVault,
      lastUpdateSlot,
      unclaimedAmount,
      depositedAmount,
      farmerBump,
    };
  }
};

export { infos };

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
