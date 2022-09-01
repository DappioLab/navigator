import { Connection, PublicKey } from "@solana/web3.js";

export interface IPoolInfo {
  poolId: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  lpMint: PublicKey;
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

export interface IInstancePool {
  getAllPools(connection: Connection): Promise<IPoolInfo[]>;
  getPool(connection: Connection, poolId: PublicKey): Promise<IPoolInfo>;
  parsePool(data: Buffer, farmId: PublicKey): IPoolInfo;
}

export interface IInstanceFarm {
  getAllFarms(
    connection: Connection,
    rewardMint?: PublicKey
  ): Promise<IFarmInfo[]>;
  getFarm(connection: Connection, farmId: PublicKey): Promise<IFarmInfo>;
  parseFarm(data: Buffer, farmId: PublicKey): IFarmInfo;
  getAllFarmers(
    connection: Connection,
    userKey: PublicKey
  ): Promise<IFarmerInfo[]>;
  getFarmer(
    connection: Connection,
    farmerId: PublicKey,
    version?: number
  ): Promise<IFarmerInfo>;
}

export interface IInstanceMoneyMarket {
  getAllReserves(
    connection: Connection,
    marketId?: PublicKey
  ): Promise<IReserveInfo[]>;
  getReserve(
    connection: Connection,
    reserveId: PublicKey
  ): Promise<IReserveInfo>;
  parseReserve(data: Buffer, reserveId: PublicKey): IReserveInfo;
  getAllObligations(
    connection: Connection,
    userKey: PublicKey
  ): Promise<IObligationInfo[]>;
  getObligation(
    connection: Connection,
    obligationId: PublicKey,
    version?: number
  ): Promise<IObligationInfo>;
  parseObligation(data: Buffer, obligationId: PublicKey): IObligationInfo;
}

/// Example

// const protocolInstance: IInstancePool & IInstanceFarm = class ProtocolInstance {
//   static async getAllPools(): Promise<IPoolInfo[]> {
//     return [];
//   }

//   static async getPool(): Promise<IPoolInfo> {
//     return {} as IPoolInfo;
//   }

//   static async getAllFarms(): Promise<IFarmInfo[]> {
//     return [];
//   }

//   static async getFarm(): Promise<IFarmInfo> {
//     return {} as IFarmInfo;
//   }
// };
