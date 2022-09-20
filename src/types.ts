import { Connection, PublicKey } from "@solana/web3.js";

export interface IPoolInfo {
  poolId: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  lpMint: PublicKey;
}

export interface INFTRarityInfo {
  rarityId: PublicKey;
}

export interface INFTPoolInfo {
  poolId: PublicKey;
  proveTokenMint: PublicKey;
}

export interface INFTFarmInfo {
  farmId: PublicKey;
  farmTokenMint: PublicKey;
  rewardTokenMint: PublicKey;
}

export interface INFTLockerInfo {
  lockerId: PublicKey;
  userKey: PublicKey;
}

export interface INFTFarmerInfo {
  farmerId: PublicKey;
  userKey: PublicKey;
}

// TODO
export interface IFarmInfo {
  farmId: PublicKey;
}

export interface IFarmerInfo {
  farmerId: PublicKey;
  userKey: PublicKey;
  farmId?: PublicKey;
  amount?: number;
}

export interface IVaultInfo {
  vaultId: PublicKey;
  shareMint: PublicKey;
}

// TODO
export interface IDepositorInfo {
  depositorId: PublicKey;
  userKey: PublicKey;
}

export interface IWithdrawerInfo {
  withdrawerId: PublicKey;
  userKey: PublicKey;
}

// TODO
export interface IReserveInfo {
  reserveId: PublicKey;
}

export interface IObligationInfo {
  obligationId: PublicKey;
  userKey: PublicKey;
  reserveId?: PublicKey;
}

// TODO: Util methods
export interface IPoolInfoWrapper {
  poolInfo: IPoolInfo;
}

// TODO: Util methods
export interface IFarmInfoWrapper {
  farmInfo: IFarmInfo;
}

// TODO: Util methods
export interface IReserveInfoWrapper {
  reserveInfo: IReserveInfo;
}

// TODO: Util methods
export interface IVaultInfoWrapper {
  vaultInfo: IVaultInfo;
}

export interface IInstancePool {
  getAllPools(connection: Connection): Promise<IPoolInfo[]>;
  getAllPoolWrappers(connection: Connection): Promise<IPoolInfoWrapper[]>;
  getPool(connection: Connection, poolId: PublicKey): Promise<IPoolInfo>;
  getPoolWrapper(connection: Connection, poolId: PublicKey): Promise<IPoolInfoWrapper>;
  parsePool(data: Buffer, farmId: PublicKey): IPoolInfo;
}

export interface IInstanceFarm {
  getAllFarms(connection: Connection, rewardMint?: PublicKey): Promise<IFarmInfo[]>;
  getAllFarmWrappers(connection: Connection, rewardMint?: PublicKey): Promise<IFarmInfoWrapper[]>;
  getFarm(connection: Connection, farmId: PublicKey): Promise<IFarmInfo>;
  getFarmWrapper(connection: Connection, farmId: PublicKey): Promise<IFarmInfoWrapper>;
  parseFarm(data: Buffer, farmId: PublicKey): IFarmInfo;
  getAllFarmers(connection: Connection, userKey: PublicKey): Promise<IFarmerInfo[]>;
  getFarmerId(farmInfo: IFarmInfo, userKey: PublicKey, version?: number): Promise<PublicKey>;
  getFarmer(connection: Connection, farmerId: PublicKey, version?: number): Promise<IFarmerInfo>;

  // Optional Methods
  getFarmerIdWithBump?(farmId: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]>;
}

export interface IInstanceMoneyMarket {
  getAllReserves(connection: Connection, marketId?: PublicKey): Promise<IReserveInfo[]>;
  getAllReserveWrappers(connection: Connection, marketId?: PublicKey): Promise<IReserveInfoWrapper[]>;
  getReserve(connection: Connection, reserveId: PublicKey): Promise<IReserveInfo>;
  parseReserve(data: Buffer, reserveId: PublicKey): IReserveInfo;

  // Optional Methods
  getAllObligations?(connection: Connection, userKey: PublicKey): Promise<IObligationInfo[]>;
  getObligation?(connection: Connection, obligationId: PublicKey): Promise<IObligationInfo>;
  parseObligation?(data: Buffer, obligationId: PublicKey): IObligationInfo;
  getObligationId?(marketId: PublicKey, userKey: PublicKey): Promise<PublicKey>;
}

export interface IInstanceNFTRarity {
  getAllRarities(connection: Connection): Promise<INFTRarityInfo[]>;
  // TODO: Add wrapper for NFTRarityInfo
  // getAllRarityWrappers(connection: Connection): Promise<INFTRarityInfoWrapper[]>;
  getRarity(connection: Connection, rarityId: PublicKey): Promise<INFTRarityInfo>;
  parseRarity(data: Buffer, rarityId: PublicKey): INFTRarityInfo;
}

export interface IInstanceNFTPool {
  getAllPools(connection: Connection): Promise<INFTPoolInfo[]>;
  // TODO: Add wrapper for NFTPoolInfo
  // getAllPoolWrappers(connection: Connection): Promise<INFTPoolInfoWrapper[]>;
  getPool(connection: Connection, poolId: PublicKey): Promise<INFTPoolInfo>;
  parsePool(data: Buffer, farmId: PublicKey): INFTPoolInfo;
  getAllNFTLockers(connection: Connection): Promise<INFTLockerInfo[]>;
  // TODO: Add wrapper for NFTLockerInfo
  // getAllNFTLockerWrappers(connection: Connection): Promise<INFTLockerInfoWrapper[]>;
  getNFTLocker(connection: Connection, lockerId: PublicKey): Promise<INFTLockerInfo>;
  parseNFTLocker(data: Buffer, lockerId: PublicKey): INFTLockerInfo;
}

export interface IInstanceNFTFarm {
  getAllFarms(connection: Connection): Promise<INFTFarmInfo[]>;
  // TODO: Add wrapper for NFTFarmInfo
  // getAllFarmWrappers(connection: Connection): Promise<INFTFarmInfoWrapper[]>;
  getFarm(connection: Connection, farmId: PublicKey): Promise<INFTFarmInfo>;
  parseFarm(data: Buffer, farmId: PublicKey): INFTFarmInfo;
  getAllNFTFarmers(connection: Connection): Promise<INFTFarmerInfo[]>;
  // TODO: Add wrapper for NFTFarmerInfo
  // getAllNFTFarmerWrappers(connection: Connection): Promise<INFTFarmerInfoWrapper[]>;
  getNFTFarmer(connection: Connection, farmerId: PublicKey): Promise<INFTFarmerInfo>;
  parseNFTFarmer(data: Buffer, farmerId: PublicKey): INFTFarmerInfo;
}

export interface IInstanceVault {
  getAllVaults(connection: Connection): Promise<IVaultInfo[]>;
  // TODO: Add wrapper for VaultInfo
  getAllVaultWrappers(connection: Connection): Promise<IVaultInfoWrapper[]>;
  getVault(connection: Connection, vaultId: PublicKey): Promise<IVaultInfo>;
  parseVault(data: Buffer, vaultId: PublicKey): IVaultInfo;
  getAllDepositors(connection: Connection, userKey: PublicKey): Promise<IDepositorInfo[]>;
  getDepositor(connection: Connection, depositorId: PublicKey, userKey?: PublicKey): Promise<IDepositorInfo>;
  getDepositorId(vaultId: PublicKey, userKey: PublicKey, programId?: PublicKey): PublicKey;
  getDepositorIdWithBump?(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId?: PublicKey
  ): { pda: PublicKey; bump: number };
  parseDepositor(data: Buffer, depositorId: PublicKey): IDepositorInfo;

  getWithdrawerId?(vaultId: PublicKey, userKey: PublicKey, programId?: PublicKey): PublicKey;
  getWithdrawer?(connection: Connection, withdrawerId: PublicKey, userKey?: PublicKey): Promise<IWithdrawerInfo>;
  parseWithdrawer?(data: Buffer, withdrawerId: PublicKey): IWithdrawerInfo;
  getAllWithdrawers?(connection: Connection, userKey: PublicKey): Promise<IWithdrawerInfo[]>;
}
