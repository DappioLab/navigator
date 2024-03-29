import { Connection, DataSizeFilter, GetProgramAccountsConfig, MemcmpFilter, PublicKey } from "@solana/web3.js";
import { IInstanceNFTPool, IInstanceNFTFarm, IInstanceNFTRarity } from "../types";
import { NFT_MINING_PROGRAM_ID, NFT_RARITY_PROGRAM_ID, NFT_STAKING_PROGRAM_ID } from "./ids";
import { POOL_LAYOUT, FARM_LAYOUT, RARITY_LAYOUT, NFT_LOCKER_LAYOUT, FARMER_LAYOUT } from "./layout";
import { NFTRarityInfo, NFTPoolInfo, NFTFarmInfo, NFTLockerInfo, NFTFarmerInfo } from ".";

const RARITY_LAYOUT_SPAN = 16460;

let infos: IInstanceNFTRarity & IInstanceNFTPool & IInstanceNFTFarm;

infos = class InstanceNFTFinance {
  static async getAllRarities(connection: Connection, adminKey?: PublicKey): Promise<NFTRarityInfo[]> {
    let filters: (MemcmpFilter | DataSizeFilter)[] = [];

    const dataSizeFilters: DataSizeFilter = {
      dataSize: RARITY_LAYOUT_SPAN,
    };
    filters = [dataSizeFilters];

    let adminIdMemcmp: MemcmpFilter;
    if (adminKey) {
      adminIdMemcmp = {
        memcmp: {
          offset: 8,
          bytes: adminKey.toString(),
        },
      };
      filters.push(adminIdMemcmp);
    }

    const config: GetProgramAccountsConfig = { filters };
    const allRarityAccounts = await connection.getProgramAccounts(NFT_RARITY_PROGRAM_ID, config);

    const allNFTRarityInfos: NFTRarityInfo[] = allRarityAccounts.map((rarityAccount) => {
      const nftRarityInfo = this.parseRarity(rarityAccount.account.data, rarityAccount.pubkey);
      return nftRarityInfo;
    });

    return allNFTRarityInfos;
  }

  static async getRarity(connection: Connection, rarityId: PublicKey): Promise<NFTRarityInfo> {
    const rarityAccountInfo = await connection.getAccountInfo(rarityId);
    const nftRarityInfo = this.parseRarity(rarityAccountInfo?.data as Buffer, rarityId);

    return nftRarityInfo;
  }

  static parseRarity(data: Buffer, rarityId: PublicKey): NFTRarityInfo {
    const decodedData = RARITY_LAYOUT.decode(data);
    const { discriminator, adminKey, collection, rarity, mintList } = decodedData;

    const collectionParsed = Buffer.from(collection).toString("utf-8").split("\x00")[0];

    const rarityParsed = Buffer.from(rarity).toString("utf-8").split("\x00")[0];

    return {
      rarityId,
      adminKey,
      collection: collectionParsed,
      rarity: rarityParsed,
      mintList,
    };
  }

  static async getAllPools(connection: Connection, adminKey?: PublicKey): Promise<NFTPoolInfo[]> {
    let filters: (MemcmpFilter | DataSizeFilter)[] = [];

    const dataSizeFilters: DataSizeFilter = {
      dataSize: POOL_LAYOUT.span,
    };
    filters = [dataSizeFilters];

    let adminIdMemcmp: MemcmpFilter;
    if (adminKey) {
      adminIdMemcmp = {
        memcmp: {
          offset: 8,
          bytes: adminKey.toString(),
        },
      };
      filters.push(adminIdMemcmp);
    }

    const config: GetProgramAccountsConfig = { filters };
    const allPoolAccounts = await connection.getProgramAccounts(NFT_STAKING_PROGRAM_ID, config);

    const allNFTPoolInfos: NFTPoolInfo[] = allPoolAccounts.map((poolAccount) => {
      const nftPoolInfo = this.parsePool(poolAccount.account.data, poolAccount.pubkey);
      return nftPoolInfo;
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
      adminKey,
      proveTokenAuthority,
      proveTokenTreasury,
      proveTokenMint,
      rarityId,
      mintListLength,
      totalStakedAmount,
    } = decodedData;

    return {
      poolId,
      adminKey,
      proveTokenMint,
      rarityId,
      proveTokenAuthority,
      proveTokenTreasury,
      totalStakedAmount,
    };
  }

  static async getAllFarms(connection: Connection, adminKey?: PublicKey): Promise<NFTFarmInfo[]> {
    let filters: (MemcmpFilter | DataSizeFilter)[] = [];

    const dataSizeFilters: DataSizeFilter = {
      dataSize: FARM_LAYOUT.span,
    };
    filters = [dataSizeFilters];

    let adminIdMemcmp: MemcmpFilter;
    if (adminKey) {
      adminIdMemcmp = {
        memcmp: {
          offset: 8,
          bytes: adminKey.toString(),
        },
      };
      filters.push(adminIdMemcmp);
    }

    const config: GetProgramAccountsConfig = { filters };
    const allFarmAccounts = await connection.getProgramAccounts(NFT_MINING_PROGRAM_ID, config);

    const allNFTFarmInfos: NFTFarmInfo[] = allFarmAccounts.map((farmAccount) => {
      const nftFarmInfo = this.parseFarm(farmAccount.account.data, farmAccount.pubkey);
      return nftFarmInfo;
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
      adminKey,
      proveTokenMint,
      rewardTokenMint,
      farmTokenMint,
      rewardTreasury,
      farmAuthority,
      farmAuthorityBump,
      rewardTokenPerSlot,
      totalProveTokenDeposited,
    } = decodedData;

    return {
      farmId,
      adminKey,
      proveTokenMint,
      rewardTokenMint,
      farmTokenMint,
      rewardTreasury,
      farmAuthority,
      farmAuthorityBump,
      rewardTokenPerSlot,
      totalProveTokenDeposited,
    };
  }

  static async getAllNFTLockers(connection: Connection, userKey?: PublicKey): Promise<NFTLockerInfo[]> {
    let filters: (MemcmpFilter | DataSizeFilter)[] = [];

    const dataSizeFilters: DataSizeFilter = {
      dataSize: NFT_LOCKER_LAYOUT.span,
    };
    filters = [dataSizeFilters];

    let nftHolderMemcmp: MemcmpFilter;
    if (userKey) {
      nftHolderMemcmp = {
        memcmp: {
          offset: 8,
          bytes: userKey.toString(),
        },
      };
      filters.push(nftHolderMemcmp);
    }

    const config: GetProgramAccountsConfig = { filters };
    const allNFTLockerAccounts = await connection.getProgramAccounts(NFT_STAKING_PROGRAM_ID, config);

    const allNFTLockerInfos: NFTLockerInfo[] = allNFTLockerAccounts.map((nftLockerAccount) => {
      const nftLockerInfo = this.parseNFTLocker(nftLockerAccount.account.data, nftLockerAccount.pubkey);
      return nftLockerInfo;
    });

    return allNFTLockerInfos;
  }

  static async getNFTLocker(connection: Connection, lockerId: PublicKey): Promise<NFTLockerInfo> {
    const nftLockerAccountInfo = await connection.getAccountInfo(lockerId);
    const nftLockerInfo = this.parseNFTLocker(nftLockerAccountInfo?.data as Buffer, lockerId);

    return nftLockerInfo;
  }

  static parseNFTLocker(data: Buffer, lockerId: PublicKey): NFTLockerInfo {
    const decodedData = NFT_LOCKER_LAYOUT.decode(data);
    const { discriminator, userKey, poolId, nftMint } = decodedData;

    return {
      lockerId,
      userKey,
      poolId,
      nftMint,
    };
  }

  static async getAllNFTFarmers(connection: Connection, userKey?: PublicKey): Promise<NFTFarmerInfo[]> {
    let filters: (MemcmpFilter | DataSizeFilter)[] = [];

    const dataSizeFilters: DataSizeFilter = {
      dataSize: FARMER_LAYOUT.span,
    };
    filters = [dataSizeFilters];

    let nftHolderMemcmp: MemcmpFilter;
    if (userKey) {
      nftHolderMemcmp = {
        memcmp: {
          offset: 8,
          bytes: userKey.toString(),
        },
      };
      filters.push(nftHolderMemcmp);
    }

    const config: GetProgramAccountsConfig = { filters };
    const allNFTFarmerAccounts = await connection.getProgramAccounts(NFT_MINING_PROGRAM_ID, config);

    const allNFTFarmerInfos: NFTFarmerInfo[] = allNFTFarmerAccounts.map((nftFarmerAccount) => {
      const nftFarmerInfo = this.parseNFTFarmer(nftFarmerAccount.account.data, nftFarmerAccount.pubkey);
      return nftFarmerInfo;
    });

    return allNFTFarmerInfos;
  }

  static async getNFTFarmer(connection: Connection, farmerId: PublicKey): Promise<NFTFarmerInfo> {
    const nftFarmerAccountInfo = await connection.getAccountInfo(farmerId);
    const nftFarmerInfo = this.parseNFTFarmer(nftFarmerAccountInfo?.data as Buffer, farmerId);

    return nftFarmerInfo;
  }

  static parseNFTFarmer(data: Buffer, farmerId: PublicKey): NFTFarmerInfo {
    const decodedData = FARMER_LAYOUT.decode(data);
    const {
      discriminator,
      userKey,
      farmId,
      proveTokenAta,
      lastUpdateSlot,
      unclaimedAmount,
      depositedAmount,
      farmerBump,
    } = decodedData;

    return {
      farmerId,
      userKey,
      farmId,
      proveTokenAta,
      lastUpdateSlot,
      unclaimedAmount,
      depositedAmount,
      farmerBump,
    };
  }
};

export { infos };
