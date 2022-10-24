import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import BN from "bn.js";
import { IFarmInfoWrapper, IInstanceFarm, IInstancePool, IPoolInfoWrapper, PageConfig, PoolDirection } from "../types";
import { ORCA_FARM_PROGRAM_ID, ORCA_POOL_PROGRAM_ID } from "./ids";
import { FARMER_LAYOUT, FARM_LAYOUT, POOL_LAYOUT } from "./layouts";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import * as types from ".";
import { getTokenList, getMultipleAccounts, paginate } from "../utils";
import axios from "axios";

let infos: IInstancePool & IInstanceFarm;
infos = class InstanceOrca {
  static async getAllPools(connection: Connection, page?: PageConfig): Promise<types.PoolInfo[]> {
    let allPools: types.PoolInfo[] = [];
    let accounts: {
      tokenAAmount: bigint;
      tokenBAmount: bigint;
      lpSupply: bigint;
      lpDecimals: number;
    }[] = [];

    let pubKeys: PublicKey[] = [];
    const sizeFilter: DataSizeFilter = {
      dataSize: 324,
    };

    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    let allOrcaPool = await connection.getProgramAccounts(ORCA_POOL_PROGRAM_ID, config);

    let pagedAccounts = paginate(allOrcaPool, page);

    pagedAccounts
      .filter((accountInfo) => accountInfo)
      .forEach((accountInfo) => {
        let poolData = this.parsePool(accountInfo.account!.data, accountInfo.pubkey);
        allPools.push(poolData);
        pubKeys.push(poolData.tokenAccountA);
        pubKeys.push(poolData.tokenAccountB);
        pubKeys.push(poolData.lpMint);
      });

    let amountInfos = await getMultipleAccounts(connection, pubKeys);
    for (let i = 0; i < amountInfos.length / 3; i++) {
      let tokenAAmount = AccountLayout.decode(amountInfos[i * 3].account!.data).amount;
      let tokenBAmount = AccountLayout.decode(amountInfos[i * 3 + 1].account!.data).amount;
      let lpSupply = MintLayout.decode(amountInfos[i * 3 + 2].account?.data as Buffer).supply;
      let lpDecimals = MintLayout.decode(amountInfos[i * 3 + 2].account?.data as Buffer).decimals;

      accounts.push({
        tokenAAmount,
        tokenBAmount,
        lpSupply,
        lpDecimals,
      });
    }

    return allPools
      .map((item, index) => {
        const { tokenAAmount, tokenBAmount, lpSupply, lpDecimals } = accounts[index];
        let newItem = item;

        newItem = {
          ...newItem,
          tokenSupplyA: tokenAAmount,
          tokenSupplyB: tokenBAmount,
          lpSupply,
          lpDecimals,
        };

        return newItem;
      })
      .filter((item) => (item.lpSupply as bigint) > 0);
  }

  static async getAllPoolWrappers(connection: Connection, page?: PageConfig): Promise<PoolInfoWrapper[]> {
    const allAPIPools: { [key: string]: types.IOrcaAPI } = await (await axios.get("https://api.orca.so/allPools")).data;
    return (await this.getAllPools(connection, page)).map((poolInfo) => new PoolInfoWrapper(poolInfo, allAPIPools));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<types.PoolInfo> {
    const poolInfoAccount = await connection.getAccountInfo(poolId);
    let pool = this.parsePool(poolInfoAccount?.data as Buffer, poolId);

    let accounts = [pool.tokenAccountA, pool.tokenAccountB, pool.lpMint];
    let balanceAccounts = await getMultipleAccounts(connection, accounts);
    let tokenAccountABalance = AccountLayout.decode(balanceAccounts[0].account?.data as Buffer).amount;
    let tokenAccountBBalance = AccountLayout.decode(balanceAccounts[1].account?.data as Buffer).amount;
    let lpMintBalance = MintLayout.decode(balanceAccounts[2].account?.data as Buffer).supply;
    let lpDecimals = MintLayout.decode(balanceAccounts[2].account?.data as Buffer).decimals;

    pool.tokenSupplyA = tokenAccountABalance;
    pool.tokenSupplyB = tokenAccountBBalance;
    pool.lpSupply = lpMintBalance;
    pool.lpDecimals = lpDecimals;

    return pool;
  }

  static async getPoolWrapper(connection: Connection, poolId: PublicKey): Promise<PoolInfoWrapper> {
    const pool = await this.getPool(connection, poolId);
    const allAPIPools: { [key: string]: types.IOrcaAPI } = await (await axios.get("https://api.orca.so/allPools")).data;
    return new PoolInfoWrapper(pool, allAPIPools);
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
    };
  }

  static async getAllFarms(connection: Connection, rewardMint?: PublicKey): Promise<types.FarmInfo[]> {
    const sizeFilter: DataSizeFilter = {
      dataSize: 283,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allOrcaFarm = await connection.getProgramAccounts(ORCA_FARM_PROGRAM_ID, config);
    let baseMintPublicKeys: PublicKey[] = [];
    let rewardMintPublicKeys: PublicKey[] = [];
    let tokenPublicKeys: PublicKey[] = [];
    let farms: types.FarmInfo[] = [];

    allOrcaFarm.forEach((item) => {
      let farmData = this.parseFarm(item.account.data, item.pubkey);
      baseMintPublicKeys.push(farmData.baseTokenMint);
      tokenPublicKeys.push(farmData.baseTokenVault);
      tokenPublicKeys.push(farmData.rewardTokenVault);
      farms.push(farmData);
    });

    let tokenAccountSet = new Map<string, types.ITokenVaultInfo>();
    let mintAccountSet = new Map<string, types.IMintVaultInfo>();

    let tokenAccounts = await getMultipleAccounts(connection, tokenPublicKeys);
    tokenAccounts.forEach((account) => {
      const key = account.pubkey;
      const token = AccountLayout.decode(account.account!.data);
      let obj: types.ITokenVaultInfo = { mint: token.mint, amount: new BN(Number(token.amount)), owner: token.owner };
      tokenAccountSet.set(key.toString(), obj);
      rewardMintPublicKeys.push(token.mint);
    });

    const mintPublicKeys = [...baseMintPublicKeys, ...rewardMintPublicKeys];
    let mintAccounts = await getMultipleAccounts(connection, mintPublicKeys);

    mintAccounts.forEach((account) => {
      const key = account.pubkey;
      const mintData = MintLayout.decode(account.account!.data);
      let { supply, decimals } = mintData;
      let supplyDividedByDecimals = new BN(Number(supply) / 10 ** decimals);
      let obj = { mint: key, supplyDividedByDecimals, decimals };
      mintAccountSet.set(key.toString(), obj);
    });

    farms.forEach((farm) => {
      farm.baseTokenMintAccountData = mintAccountSet.get(farm.baseTokenMint.toString());
      farm.baseTokenVaultAccountData = tokenAccountSet.get(farm.baseTokenVault.toString());
      farm.rewardTokenVaultAccountData = tokenAccountSet.get(farm.rewardTokenVault.toString());

      const rewardMint = tokenAccountSet.get(farm.rewardTokenVault.toString())!.mint;
      farm.rewardTokenMintAccountData = mintAccountSet.get(rewardMint.toString());
    });

    // store additional attributes for calculate apr
    const tokenList = await getTokenList();
    const pools = await this.getAllPools(connection);

    const farmSet = new Map<string, types.FarmInfo>();
    const poolSet = new Map<string, types.PoolInfo>();

    farms.forEach((farm) => {
      farmSet.set(farm.baseTokenMint.toString(), farm);
    });
    pools.forEach((pool) => {
      poolSet.set(pool.lpMint.toString(), pool);
    });

    return farms.map((farm) => {
      farm.isDoubleDip = false;

      const pool = poolSet.get(farm.baseTokenMint.toString());
      if (pool) {
        let tokenA = tokenList.find((t) => t.mint === pool.tokenAMint.toBase58());
        let tokenB = tokenList.find((t) => t.mint === pool.tokenBMint.toBase58());
        let rewardToken = tokenList.find((t) => t.mint === farm.rewardTokenMintAccountData?.mint.toBase58());
        farm.tokenAPrice = tokenA?.price;
        farm.tokenADecimals = tokenA?.decimals;
        farm.tokenBPrice = tokenB?.price;
        farm.tokenBDecimals = tokenB?.decimals;
        farm.rewardTokenPrice = rewardToken?.price;

        farm.poolId = pool.poolId;
        farm.tokenSupplyA = pool.tokenSupplyA;
        farm.tokenSupplyB = pool.tokenSupplyB;
        farm.lpSupply = pool.lpSupply;
        farm.lpDecimals = pool.lpDecimals;

        const doubleDip = farmSet.get(farm.farmTokenMint.toString());
        if (doubleDip) {
          rewardToken = tokenList.find((t) => t.mint === doubleDip.rewardTokenMintAccountData?.mint.toBase58());
          farm.isDoubleDip = true;
          farm.doubleDipRewardTokenPrice = rewardToken?.price;
          farm.doubleDipEmissionsPerSecondNumerator = doubleDip.emissionsPerSecondNumerator;
          farm.doubleDipEmissionsPerSecondDenominator = doubleDip.emissionsPerSecondDenominator;
          farm.doubleDipBaseTokenMintAccountData = doubleDip.baseTokenMintAccountData;
          farm.doubleDipBaseTokenVaultAccountData = doubleDip.baseTokenVaultAccountData;
          farm.doubleDipRewardTokenMintAccountData = doubleDip.rewardTokenMintAccountData;
        }
      }

      return farm;
    });
  }

  static async getAllFarmWrappers(connection: Connection): Promise<types.FarmInfoWrapper[]> {
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
    let data = (await connection.getAccountInfo(farmId)) as AccountInfo<Buffer>;
    return this.parseFarm(data.data, farmId);
  }

  static async getFarmWrapper(connection: Connection, farmId: PublicKey): Promise<FarmInfoWrapper> {
    const farm = await this.getFarm(connection, farmId);

    return new FarmInfoWrapper(farm);
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
      baseTokenMintAccountData: undefined,
      baseTokenVaultAccountData: undefined,
      rewardTokenMintAccountData: undefined,
      rewardTokenVaultAccountData: undefined,
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
    const [farmerId, _] = PublicKey.findProgramAddressSync(
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
      amount: Number(new BN(baseTokensConverted)),
      isInitialized: new BN(isInitialized),
      accountType: new BN(accountType),
      cumulativeEmissionsCheckpoint: new BN(cumulativeEmissionsCheckpoint, 10, "le"),
    };
  }
};

export { infos };

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: types.PoolInfo, public allAPIPools?: { [key: string]: types.IOrcaAPI }) {}

  getSwapOutAmount(fromSide: PoolDirection, amountIn: BN) {
    let amountOut = new BN(0);
    if (fromSide == PoolDirection.Obverse) {
      let x1 = this.poolInfo.tokenSupplyA as bigint;
      let y1 = this.poolInfo.tokenSupplyB as bigint;
      let k = x1 * y1;
      let x2 = x1 + BigInt(Number(amountIn));
      let y2 = k / x2;
      amountOut = new BN(Number(y1 - y2));
    } else {
      let x1 = this.poolInfo.tokenSupplyB as bigint;
      let y1 = this.poolInfo.tokenSupplyA as bigint;
      let k = x1 * y1;
      let x2 = x1 + BigInt(Number(amountIn));
      let y2 = k / x2;
      amountOut = new BN(Number(y1 - y2));
    }

    return amountOut;
  }

  getTokenAmounts(lpAmount: number): { tokenAAmount: number; tokenBAmount: number } {
    let tokenAAmount = Number(
      (Number(new BN(lpAmount.toString())) * Number(new BN(this.poolInfo.tokenSupplyA!.toString()))) /
        Number(new BN(this.poolInfo.lpSupply!.toString()))
    );
    let tokenBAmount = Number(
      (Number(new BN(lpAmount.toString())) * Number(new BN(this.poolInfo.tokenSupplyB!.toString()))) /
        Number(new BN(this.poolInfo.lpSupply!.toString()))
    );
    return { tokenAAmount: tokenAAmount, tokenBAmount: tokenBAmount };
  }

  getLpAmount(tokenAmount: number, tokenMint: PublicKey): number {
    // TODO
    return 0;
  }

  getLpPrice(tokenAPrice: number, tokenBPrice: number): number {
    return 0;
  }

  // getApr(tradingVolumeIn24Hours: number, lpPrice: number): number;

  getApr() {
    if (!this.allAPIPools) {
      return 0;
    }
    let pool = Object.keys(this.allAPIPools)
      .map((item: string) => {
        return this.allAPIPools![item] as types.IOrcaAPI;
      })
      .find((item) => item.poolAccount === this.poolInfo.poolId.toBase58());

    return pool ? pool.apy.week * 100 : 0;
  }

  getAuthority() {
    let authority = PublicKey.findProgramAddressSync([this.poolInfo.poolId.toBuffer()], ORCA_POOL_PROGRAM_ID);
    return authority[0];
  }
  getSingleSideRemoveLPAmount(toSide: PublicKey, amountIn: BN) {
    if (toSide.equals(this.poolInfo.tokenAMint)) {
      return (
        (Number(amountIn) * Number(new BN(this.poolInfo.tokenSupplyA!.toString()))) /
        Number(new BN(this.poolInfo.lpSupply!.toString()))
      );
    }
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: types.FarmInfo) {}

  getStakedAmount(): number {
    // TODO
    return 0;
  }

  getAprs(_x: number, _y: number, _z: number, doubleDip?: boolean): number[] {
    let apr = 0;
    let rewardTokenPrice = this.farmInfo.rewardTokenPrice;
    let emissionsPerSecondNumerator = this.farmInfo.emissionsPerSecondNumerator;
    let emissionsPerSecondDenominator = this.farmInfo.emissionsPerSecondDenominator;
    let rewardTokenMintAccountData = this.farmInfo.rewardTokenMintAccountData!;
    let baseTokenVaultAccountData = this.farmInfo.baseTokenVaultAccountData!;
    let baseTokenMintAccountData = this.farmInfo.baseTokenMintAccountData!;

    if (doubleDip) {
      if (this.farmInfo.isDoubleDip) {
        rewardTokenPrice = this.farmInfo.doubleDipRewardTokenPrice;
        emissionsPerSecondNumerator = this.farmInfo.doubleDipEmissionsPerSecondNumerator!;
        emissionsPerSecondDenominator = this.farmInfo.doubleDipEmissionsPerSecondDenominator!;
        rewardTokenMintAccountData = this.farmInfo.doubleDipRewardTokenMintAccountData!;
        baseTokenVaultAccountData = this.farmInfo.doubleDipBaseTokenVaultAccountData!;
        baseTokenMintAccountData = this.farmInfo.doubleDipBaseTokenMintAccountData!;
      } else {
        return [apr];
      }
    }

    if (
      !this.farmInfo.tokenAPrice ||
      !this.farmInfo.tokenBPrice ||
      !rewardTokenPrice ||
      !rewardTokenMintAccountData ||
      !baseTokenVaultAccountData ||
      !baseTokenMintAccountData ||
      Number(emissionsPerSecondDenominator) === 0 ||
      Number(this.farmInfo.lpSupply) === 0
    ) {
      return [apr];
    }

    let dailyEmission =
      (Number(emissionsPerSecondNumerator) * 60 * 60 * 24) /
      Number(emissionsPerSecondDenominator) /
      10 ** rewardTokenMintAccountData!.decimals;

    if (dailyEmission !== 0) {
      let rewardValueUSD = dailyEmission * 365 * rewardTokenPrice;

      let poolValueUSD =
        (Number(this.farmInfo.tokenSupplyA) / 10 ** this.farmInfo.tokenADecimals!) * this.farmInfo.tokenAPrice! +
        (Number(this.farmInfo.tokenSupplyB) / 10 ** this.farmInfo.tokenBDecimals!) * this.farmInfo.tokenBPrice!;

      let stakeRate =
        Number(baseTokenVaultAccountData!.amount) /
        10 ** Number(baseTokenMintAccountData!.decimals) /
        (Number(this.farmInfo.lpSupply) / 10 ** this.farmInfo.lpDecimals!);

      apr = (rewardValueUSD / poolValueUSD) * stakeRate * 100;
    }

    return [apr];
  }

  getAuthority() {
    let authority = PublicKey.findProgramAddressSync([this.farmInfo.farmId.toBuffer()], ORCA_FARM_PROGRAM_ID);
    return authority[0];
  }
}

export async function checkFarmerCreated(connection: Connection, farmInfo: types.FarmInfo, userKey: PublicKey) {
  let farmerId = await infos.getFarmerId(farmInfo, userKey);
  let farmerAccount = await connection.getAccountInfo(farmerId);
  return (farmerAccount?.data.length as number) > 0;
}
