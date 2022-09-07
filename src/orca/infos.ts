import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import BN from "bn.js";
import { IFarmerInfo, IFarmInfoWrapper, IInstanceFarm, IInstancePool, IPoolInfoWrapper } from "../types";
import { ORCA_FARM_PROGRAM_ID, ORCA_POOL_PROGRAM_ID } from "./ids";
import { FARMER_LAYOUT, FARM_LAYOUT, POOL_LAYOUT } from "./layouts";
import { MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import { utils } from "..";
import * as types from ".";

let infos: IInstancePool & IInstanceFarm;
infos = class InstanceOrca {
  static async getAllPools(connection: Connection): Promise<types.PoolInfo[]> {
    let allPools: types.PoolInfo[] = [];
    let accounts: {
      tokenAccountA: BN;
      tokenAccountB: BN;
      LPsupply: BN;
    }[] = [];

    let pubKeys: PublicKey[] = [];
    const sizeFilter: DataSizeFilter = {
      dataSize: 324,
    };

    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allOrcaPool = await connection.getProgramAccounts(ORCA_POOL_PROGRAM_ID, config);

    for (const accountInfo of allOrcaPool) {
      let poolData = await this.parsePool(accountInfo.account.data, accountInfo.pubkey);

      allPools.push(poolData);
      pubKeys.push(poolData.tokenAccountA);
      pubKeys.push(poolData.tokenAccountB);
      pubKeys.push(poolData.lpMint);
    }

    while (pubKeys.length > 0) {
      let pubKeysChunk = pubKeys.splice(0, pubKeys.length > 99 ? 99 : pubKeys.length);
      let amountInfos = await connection.getMultipleAccountsInfo(pubKeysChunk);
      for (let i = 0; i < amountInfos.length / 3; i++) {
        let tokenAAmount = utils.parseTokenAccount(amountInfos[i * 3]?.data, pubKeysChunk[i * 3]).amount;
        let tokenBAmount = utils.parseTokenAccount(amountInfos[i * 3 + 1]?.data, pubKeysChunk[i * 3 + 1]).amount;
        let lpSupply = new BN(Number(MintLayout.decode(amountInfos[i * 3 + 2]?.data as Buffer).supply));
        accounts.push({
          tokenAccountA: tokenAAmount,
          tokenAccountB: tokenBAmount,
          LPsupply: lpSupply,
        });
      }
    }

    return allPools
      .map((item, index) => {
        const { tokenAccountA, tokenAccountB, LPsupply } = accounts[index];
        let newItem = item;

        newItem = {
          ...newItem,
          tokenSupplyA: tokenAccountA,
          tokenSupplyB: tokenAccountB,
          lpSupply: LPsupply,
        };
        return newItem;
      })
      .filter((item) => item.lpSupply.cmpn(0));
  }

  static async getAllPoolWrappers(connection: Connection): Promise<PoolInfoWrapper[]> {
    return (await this.getAllPools(connection)).map((poolInfo) => new PoolInfoWrapper(poolInfo));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<types.PoolInfo> {
    let data = (await connection.getAccountInfo(poolId)) as AccountInfo<Buffer>;
    let pool = await this.parsePool(data.data, poolId);

    let accounts = [pool.tokenAccountA, pool.tokenAccountB, pool.lpMint];
    let balanceAccounts = (await connection.getMultipleAccountsInfo(accounts)) as AccountInfo<Buffer>[];
    let tokenAccountABalance = utils.parseTokenAccount(balanceAccounts[0].data, accounts[0]).amount;
    let tokenAccountBBalance = utils.parseTokenAccount(balanceAccounts[1].data, accounts[1]).amount;
    let lpMintBalance = new BN(Number(MintLayout.decode(balanceAccounts[2]?.data as Buffer).supply));

    pool.tokenSupplyA = tokenAccountABalance;
    pool.tokenSupplyB = tokenAccountBBalance;
    pool.lpSupply = lpMintBalance;
    return pool;
  }

  static parsePool(data: Buffer, infoPubkey: PublicKey): types.PoolInfo {
    const decodedData = POOL_LAYOUT.decode(data);
    let {
      version,
      isInitialized,
      nonce,
      tokenProgramId,
      tokenAccountA,
      tokenAccountB,
      LPmint,
      mintA,
      mintB,
      feeAccount,
    } = decodedData;

    return {
      poolId: infoPubkey,
      version: version,
      isInitialized: new BN(isInitialized),
      nonce: new BN(nonce),
      tokenProgramId: tokenProgramId,
      tokenAccountA: tokenAccountA,
      tokenAccountB: tokenAccountB,
      feeAccount: feeAccount,
      lpMint: LPmint,
      tokenAMint: mintA,
      tokenBMint: mintB,
      lpSupply: new BN(0),
      tokenSupplyA: new BN(0),
      tokenSupplyB: new BN(0),
    };
  }

  static async getAllFarms(connection: Connection, rewardMint?: PublicKey): Promise<types.FarmInfo[]> {
    const sizeFilter: DataSizeFilter = {
      dataSize: 283,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allOrcaFarm = await connection.getProgramAccounts(ORCA_FARM_PROGRAM_ID, config);

    return allOrcaFarm
      .map((item) => {
        let farmData = this.parseFarm(item.account.data, item.pubkey);
        return farmData;
      })
      .filter((item) => {
        return !item.emissionsPerSecondNumerator.cmpn(0);
      });
  }

  static async getAllFarmWrappers(connection: Connection): Promise<types.FarmInfoWrapper[]> {
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
    let data = (await connection.getAccountInfo(farmId)) as AccountInfo<Buffer>;
    return await this.parseFarm(data.data, farmId);
  }

  static parseFarm(data: Buffer, farmId: PublicKey): types.FarmInfo {
    const decodedData = FARM_LAYOUT.decode(data);

    let {
      isInitialized,
      accountType,
      nonce,
      tokenProgramId,
      emissionsAuthority,
      removeRewardsAuthority,
      baseTokenMint,
      baseTokenVault,
      rewardTokenVault,
      farmTokenMint,
      emissionsPerSecondNumerator,
      emissionsPerSecondDenominator,
      lastUpdatedTimestamp,
      cumulativeEmissionsPerFarmToken,
    } = decodedData;

    return {
      farmId,
      isInitialized: new BN(isInitialized),
      nonce: new BN(nonce),
      tokenProgramId: tokenProgramId,
      accountType: new BN(accountType),
      emissionsAuthority: emissionsAuthority,
      removeRewardsAuthority: removeRewardsAuthority,
      baseTokenMint: baseTokenMint,
      baseTokenVault: baseTokenVault,
      rewardTokenVault: rewardTokenVault,
      farmTokenMint: farmTokenMint,
      emissionsPerSecondNumerator: emissionsPerSecondNumerator,
      emissionsPerSecondDenominator: emissionsPerSecondDenominator,
      lastUpdatedTimestamp: lastUpdatedTimestamp,
      cumulativeEmissionsPerFarmToken: new BN(cumulativeEmissionsPerFarmToken, 10, "le"),
    };
  }

  static async getAllFarmers(connection: Connection, userKey: PublicKey): Promise<IFarmerInfo[]> {
    const sizeFilter: DataSizeFilter = {
      dataSize: 106,
    };
    const adminIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 34,
        bytes: userKey.toString(),
      },
    };

    const filters = [sizeFilter, adminIdMemcmp];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allOrcaPool = await connection.getProgramAccounts(ORCA_FARM_PROGRAM_ID, config);

    return allOrcaPool.map((item) => {
      let farmerInfo = this._parseFarmerInfo(item.account.data, item.pubkey);
      return farmerInfo;
    });
  }

  static async getFarmerId(farmId: PublicKey, userKey: PublicKey): Promise<PublicKey> {
    const [farmerId, _] = await PublicKey.findProgramAddress(
      [farmId.toBuffer(), userKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer()],
      ORCA_FARM_PROGRAM_ID
    );

    return farmerId;
  }

  static async getFarmer(connection: Connection, farmerId: PublicKey, version?: number): Promise<types.FarmerInfo> {
    let data = (await connection.getAccountInfo(farmerId)) as AccountInfo<Buffer>;
    return await this._parseFarmerInfo(data.data, farmerId);
  }

  private static _parseFarmerInfo(data: Buffer, pubkey: PublicKey): types.FarmerInfo {
    let decodedData = FARMER_LAYOUT.decode(data);
    let { isInitialized, accountType, globalFarm, owner, baseTokensConverted, cumulativeEmissionsCheckpoint } =
      decodedData;

    return {
      farmerId: pubkey,
      farmId: globalFarm,
      userKey: owner,
      amount: new BN(baseTokensConverted).toNumber(),
      isInitialized: new BN(isInitialized),
      accountType: new BN(accountType),
      cumulativeEmissionsCheckpoint: new BN(cumulativeEmissionsCheckpoint, 10, "le"),
    };
  }
};

export { infos };

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: types.PoolInfo) {}

  async calculateSwapOutAmount(fromSide: string, amountIn: BN) {
    if (fromSide == "coin") {
      let x1 = this.poolInfo.tokenSupplyA;
      let y1 = this.poolInfo.tokenSupplyB;
      let k = x1.mul(y1);
      let x2 = x1.add(amountIn);
      let y2 = k.div(x2);
      let amountOut = y1.sub(y2);

      return amountOut;
    } else if (fromSide == "pc") {
      let x1 = this.poolInfo.tokenSupplyB;
      let y1 = this.poolInfo.tokenSupplyA;
      let k = x1.mul(y1);
      let x2 = x1.add(amountIn);
      let y2 = k.div(x2);
      let amountOut = y1.sub(y2);

      return amountOut;
    }

    return new BN(0);
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: types.FarmInfo) {}
}
