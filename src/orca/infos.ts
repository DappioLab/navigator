import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import BN from "bn.js";
import { IFarmInfoWrapper, IInstanceFarm, IInstancePool, IPoolInfoWrapper } from "../types";
import { ORCA_FARM_PROGRAM_ID, ORCA_POOL_PROGRAM_ID } from "./ids";
import { FARMER_LAYOUT, FARM_LAYOUT, POOL_LAYOUT } from "./layouts";
import { MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import { utils } from "..";
import * as types from ".";
import { IServicesTokenInfo } from "../utils";
import axios from "axios";

let infos: IInstancePool & IInstanceFarm;
infos = class InstanceOrca {
  static async getAllPools(connection: Connection): Promise<types.PoolInfo[]> {
    let allPools: types.PoolInfo[] = [];
    let accounts: {
      tokenAccountA: BN;
      tokenAccountB: BN;
      LPsupply: BN;
      LPDecimals: number;
    }[] = [];

    let pubKeys: PublicKey[] = [];
    const sizeFilter: DataSizeFilter = {
      dataSize: 324,
    };

    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allOrcaPool = await connection.getProgramAccounts(ORCA_POOL_PROGRAM_ID, config);

    // const allAPIPools: any = await (await axios.get("https://api.orca.so/allPools")).data;

    for (const accountInfo of allOrcaPool) {
      let poolData = this.parsePool(accountInfo.account.data, accountInfo.pubkey);

      // let apr = null;
      // Object.keys(allAPIPools).map((item) => {
      //   if (allAPIPools[item].poolAccount === poolData.poolId.toBase58()) {
      //     apr = (allAPIPools[item].apy.week * 100).toFixed(2);
      //   }
      // });

      // poolData.tradingAPR = apr;
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
        let lpDecimals = utils.parseMintAccount(amountInfos[i * 3 + 2]?.data, pubKeysChunk[i * 3 + 2]).decimals;
        let lpSupply = new BN(Number(MintLayout.decode(amountInfos[i * 3 + 2]?.data as Buffer).supply));

        accounts.push({
          tokenAccountA: tokenAAmount,
          tokenAccountB: tokenBAmount,
          LPsupply: lpSupply,
          LPDecimals: lpDecimals,
        });
      }
    }

    return allPools
      .map((item, index) => {
        const { tokenAccountA, tokenAccountB, LPsupply, LPDecimals } = accounts[index];
        let newItem = item;

        newItem = {
          ...newItem,
          tokenSupplyA: tokenAccountA,
          tokenSupplyB: tokenAccountB,
          lpSupply: LPsupply,
          lpDecimals: LPDecimals,
        };
        return newItem;
      })
      .filter((item) => item.lpSupply.cmpn(0));
  }

  static async getAllPoolWrappers(connection: Connection): Promise<PoolInfoWrapper[]> {
    const allAPIPools: any = await (await axios.get("https://api.orca.so/allPools")).data;
    return (await this.getAllPools(connection)).map((poolInfo) => new PoolInfoWrapper(poolInfo, allAPIPools));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<types.PoolInfo> {
    let data = (await connection.getAccountInfo(poolId)) as AccountInfo<Buffer>;
    let pool = this.parsePool(data.data, poolId);

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
      LPDecimals,
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
      lpDecimals: LPDecimals,
      emissionAPR: null,
      doubleDipAPR: null,
    };
  }

  static async getAllFarms(connection: Connection, rewardMint?: PublicKey): Promise<types.FarmInfo[]> {
    const sizeFilter: DataSizeFilter = {
      dataSize: 283,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allOrcaFarm = await connection.getProgramAccounts(ORCA_FARM_PROGRAM_ID, config);

    let baseVaultPublicKeys: PublicKey[] = [];
    let baseTokenMintPublicKeys: PublicKey[] = [];
    let rewardTokenVaultPublicKeys: PublicKey[] = [];
    let rewardTokenMintPublicKeys: PublicKey[] = [];
    let farms: types.FarmInfo[] = [];

    allOrcaFarm.map((item) => {
      let farmData = this.parseFarm(item.account.data, item.pubkey);

      // Store keys needed
      baseVaultPublicKeys.push(farmData.baseTokenVault);
      baseTokenMintPublicKeys.push(farmData.baseTokenMint);
      rewardTokenVaultPublicKeys.push(farmData.rewardTokenVault);

      farms.push(farmData);
    });

    // Get base vault account info
    let baseVaultResult: PublicKey[] = [];
    for (var i = 0; i < baseVaultPublicKeys.length; i += 99) {
      baseVaultResult = baseVaultPublicKeys.slice(i, i + 99);
      let data = await connection.getMultipleAccountsInfo(baseVaultResult);
      for (let [index, item] of data.entries()) {
        let accountInfos = utils.parseTokenAccount(item?.data, baseVaultResult[index]);

        let farmData = farms.find((t) => t.baseTokenVault.equals(baseVaultResult[index]));
        farmData!.baseTokenVaultAccountData = accountInfos;
      }
    }

    // Get base mint account info
    let baseMintResult: PublicKey[] = [];
    for (var i = 0; i < baseTokenMintPublicKeys.length; i += 99) {
      baseMintResult = baseTokenMintPublicKeys.slice(i, i + 99);
      let data = await connection.getMultipleAccountsInfo(baseMintResult);
      for (let [index, item] of data.entries()) {
        let accountInfos = utils.parseMintAccount(item?.data, baseMintResult[index]);

        let farmData = farms.find((t) => t.baseTokenMint.equals(baseMintResult[index]));
        farmData!.baseTokenMintAccountData = accountInfos;
      }
    }

    // Get reward vault account info
    let rewardVaultResult: PublicKey[] = [];
    for (var i = 0; i < rewardTokenVaultPublicKeys.length; i += 99) {
      rewardVaultResult = rewardTokenVaultPublicKeys.slice(i, i + 99);
      let data = await connection.getMultipleAccountsInfo(rewardVaultResult);
      for (let [index, item] of data.entries()) {
        let accountInfos = utils.parseTokenAccount(item?.data, rewardVaultResult[index]);

        let farmData = farms.find((t) => t.rewardTokenVault.equals(rewardVaultResult[index]));

        // Reward Mint
        rewardTokenMintPublicKeys.push(accountInfos.mint);
        farmData!.rewardTokenVaultAccountData = accountInfos;
      }
    }

    // Get reward mint account info
    let rewardMintResult: PublicKey[] = [];
    let rewardTokenData: { mint: PublicKey; supply: BN; decimals: number }[] = [];
    for (let i = 0; i < rewardTokenMintPublicKeys.length; i += 99) {
      rewardMintResult = rewardTokenMintPublicKeys.slice(i, i + 99);
      let data = await connection.getMultipleAccountsInfo(rewardMintResult);
      for (let [index, item] of data.entries()) {
        let accountInfos = utils.parseMintAccount(item?.data, rewardMintResult[index]);

        rewardTokenData.push(accountInfos);
      }
    }

    // Map reward mint & reward vault
    for (let i = 0; i < farms.length; i++) {
      let data = rewardTokenData.find((t) => t.mint.equals(farms[i].rewardTokenVaultAccountData?.mint!));
      if (data) {
        farms[i].rewardTokenMintAccountData = data;
      }
    }

    return farms;
  }

  static async getAllFarmWrappers(connection: Connection): Promise<types.FarmInfoWrapper[]> {
    const tokenList = await utils.getTokenList();
    const farms = await this.getAllFarms(connection);
    const pools = await this.getAllPools(connection);
    const parsedData = this._getParsedPoolAndFarmAPR(farms, pools, tokenList);
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo, parsedData));
  }

  private static _getParsedPoolAndFarmAPR(
    farms: types.FarmInfo[],
    pools: types.PoolInfo[],
    tokenList: IServicesTokenInfo[]
  ): { poolId: PublicKey; farmId: PublicKey; apr: number; isEmission: boolean }[] {
    let arr: { poolId: PublicKey; farmId: PublicKey; apr: number; isEmission: boolean }[] = [];

    let parsedPools = pools.map((item) => {
      let doubleDip: types.FarmInfo | undefined = undefined;
      let farm: types.FarmInfo | undefined = undefined;
      let parsedPool: types.IParsedPoolAndFarm = { ...item, doubleDip, farm }; // PoolInfo with farm and double dip structure

      farm = farms.find((f) => f.baseTokenMint.equals(item.lpMint));
      if (farm) {
        doubleDip = farms.find((f) => f.baseTokenMint.equals(farm!.farmTokenMint));
      }
      parsedPool.farm = farm;
      parsedPool.doubleDip = doubleDip;
      return parsedPool;
    });

    parsedPools.map((item) => {
      let tokenA = tokenList.find((t) => t.mint === item.tokenAMint.toBase58())!;
      let tokenB = tokenList.find((t) => t.mint === item.tokenBMint.toBase58())!;

      if (!tokenA || !tokenB) {
        return;
      }

      let poolValueUSD =
        (Number(item.tokenSupplyA) / 10 ** tokenA.decimals) * tokenA?.price +
        (Number(item.tokenSupplyB) / 10 ** tokenB.decimals) * tokenB.price;

      let emissionAPR = 0;
      let doubleDipAPR = 0;

      if (item.farm) {
        let dailyEmission =
          (Number(item.farm.emissionsPerSecondNumerator) * 60 * 60 * 24) /
          Number(item.farm.emissionsPerSecondDenominator) /
          10 ** item.farm.rewardTokenMintAccountData!.decimals;

        let rewardToken = tokenList?.find((t) => t.mint === item.farm!.rewardTokenMintAccountData?.mint.toBase58());

        if (rewardToken && dailyEmission !== 0) {
          let rewardValueUSD = dailyEmission * 365 * rewardToken!.price;
          let stakeRate =
            Number(item.farm.baseTokenVaultAccountData!.amount) /
            10 ** Number(item.farm.baseTokenMintAccountData!.decimals) /
            (Number(item.lpSupply) / 10 ** item.lpDecimals);

          emissionAPR = (rewardValueUSD / poolValueUSD) * stakeRate * 100;
          item["emissionAPR"] = emissionAPR;
        }
      }
      if (item.farm && item.doubleDip) {
        let dailyEmission =
          (Number(item.doubleDip.emissionsPerSecondNumerator) * 60 * 60 * 24) /
          Number(item.doubleDip.emissionsPerSecondDenominator) /
          10 ** item.doubleDip.rewardTokenMintAccountData!.decimals;

        let rewardToken = tokenList?.find(
          (t) => t.mint === item?.doubleDip!.rewardTokenMintAccountData?.mint.toBase58()
        );

        if (rewardToken && dailyEmission !== 0) {
          let rewardValueUSD = dailyEmission * 365 * rewardToken!.price;

          let poolValueUSD =
            (Number(item.tokenSupplyA) / 10 ** tokenA.decimals) * tokenA?.price +
            (Number(item.tokenSupplyB) / 10 ** tokenB.decimals) * tokenB.price;

          let stakeRate =
            Number(item.doubleDip.baseTokenVaultAccountData!.amount) /
            10 ** Number(item.doubleDip.baseTokenMintAccountData!.decimals) /
            (Number(item.lpSupply) / 10 ** item.lpDecimals);

          doubleDipAPR = (rewardValueUSD / poolValueUSD) * stakeRate * 100;
          item["doubleDipAPR"] = doubleDipAPR;
        }
      }

      if (item.farm) {
        arr.push({
          farmId: item.farm?.farmId,
          poolId: item.poolId,
          apr: item.emissionAPR!,
          isEmission: true,
        });
      }

      if (item.doubleDip) {
        arr.push({
          farmId: item.doubleDip?.farmId,
          poolId: item.poolId,
          apr: item.doubleDipAPR!,
          isEmission: false,
        });
      }
      return item;
    });

    return arr;
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
    let data = (await connection.getAccountInfo(farmId)) as AccountInfo<Buffer>;
    return this.parseFarm(data.data, farmId);
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
      baseTokenMintAccountData: null,
      baseTokenVaultAccountData: null,
      rewardTokenMintAccountData: null,
      rewardTokenVaultAccountData: null,
    };
  }

  static async getAllFarmers(connection: Connection, userKey: PublicKey): Promise<types.FarmerInfo[]> {
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

  static async getFarmerId(farmInfo: types.FarmInfo, userKey: PublicKey): Promise<PublicKey> {
    const [farmerId, _] = await PublicKey.findProgramAddress(
      [farmInfo.farmId.toBuffer(), userKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer()],
      ORCA_FARM_PROGRAM_ID
    );

    return farmerId;
  }

  static async getFarmer(connection: Connection, farmerId: PublicKey, version?: number): Promise<types.FarmerInfo> {
    let data = (await connection.getAccountInfo(farmerId)) as AccountInfo<Buffer>;
    return this._parseFarmerInfo(data.data, farmerId);
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
  constructor(public poolInfo: types.PoolInfo, public allAPIPools: any) {}

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

  async getAuthority() {
    let authority = await PublicKey.findProgramAddress([this.poolInfo.poolId.toBuffer()], ORCA_POOL_PROGRAM_ID);
    return authority[0];
  }

  getApr() {
    let pool = Object.keys(this.allAPIPools)
      .map((item: string) => {
        return this.allAPIPools[item] as types.IOrcaAPI;
      })
      .find((item) => item.poolAccount === this.poolInfo.poolId.toBase58());

    if (pool) {
      return pool.apy.week * 100;
    } else {
      return 0;
    }
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(
    public farmInfo: types.FarmInfo,
    public parsedData: { poolId: PublicKey; farmId: PublicKey; apr: number; isEmission: boolean }[]
  ) {}

  async getAuthority() {
    let authority = await PublicKey.findProgramAddress([this.farmInfo.farmId.toBuffer()], ORCA_FARM_PROGRAM_ID);
    return authority[0];
  }

  getApr() {
    let data = this.parsedData.find((item) => item.farmId.equals(this.farmInfo.farmId) && item.apr);
    if (!data) {
      return null;
    }
    return data;
  }
}

export async function checkFarmerCreated(connection: Connection, farmInfo: types.FarmInfo, userKey: PublicKey) {
  let farmerId = await infos.getFarmerId(farmInfo, userKey);
  let farmerAccount = await connection.getAccountInfo(farmerId);
  return (farmerAccount?.data.length as number) > 0;
}
