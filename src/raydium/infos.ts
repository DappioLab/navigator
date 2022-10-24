import {
  AccountInfo,
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import { getMultipleAccounts, paginate } from "../utils";
import { POOL_PROGRAM_ID_V4, FARM_PROGRAM_ID_V3, FARM_PROGRAM_ID_V5 } from "./ids";
import { POOL_LAYOUT_V4, FARMER_LAYOUT_V3_2, FARMER_LAYOUT_V5_2, FARM_LAYOUT_V3, FARM_LAYOUT_V5 } from "./layouts";
import { MARKET_STATE_LAYOUT_V3, _OPEN_ORDERS_LAYOUT_V2 } from "@project-serum/serum/lib/market";
import BN from "bn.js";
import { IPoolInfoWrapper, IFarmInfoWrapper, IInstancePool, IInstanceFarm, PoolDirection, PageConfig } from "../types";
import { getBigNumber, getTokenAccount, TokenAmount } from "./utils";
import { AccountLayout, MintLayout, RawAccount, RawMint } from "@solana/spl-token-v2";
import { FarmerInfo, FarmInfo, PoolInfo } from ".";

let infos: IInstancePool & IInstanceFarm;

infos = class InstanceRaydium {
  static async getAllPools(connection: Connection, page?: PageConfig): Promise<PoolInfo[]> {
    let pools: PoolInfo[] = [];
    //V4 pools
    const v4SizeFilter: DataSizeFilter = {
      dataSize: 752,
    };
    const v4Filters = [v4SizeFilter];
    const v4config: GetProgramAccountsConfig = { filters: v4Filters };
    let allV4AMMAccount = await connection.getProgramAccounts(POOL_PROGRAM_ID_V4, v4config);

    let tokenAccountKeys: PublicKey[] = [];
    let mintAccountKeys: PublicKey[] = [];
    let openOrderKeys: PublicKey[] = [];
    let serumMarketKeys: PublicKey[] = [];
    let pagedAccounts = paginate(allV4AMMAccount, page);
    pagedAccounts
      .filter((accountInfo) => accountInfo)
      .forEach(({ pubkey, account }) => {
        let poolInfo = this.parsePool(account!.data, pubkey);

        if (!(poolInfo.totalPnlCoin.isZero() || poolInfo.totalPnlPc.isZero()) && Number(poolInfo.status) != 4) {
          // Insert keys to be fetched
          tokenAccountKeys.push(poolInfo.poolCoinTokenAccount);
          tokenAccountKeys.push(poolInfo.poolPcTokenAccount);
          mintAccountKeys.push(poolInfo.lpMint);
          openOrderKeys.push(poolInfo.ammOpenOrders);
          serumMarketKeys.push(poolInfo.serumMarket);

          pools.push(poolInfo);
        }
      });

    // Fetch accounts
    const tokenAccounts = await getMultipleAccounts(connection, tokenAccountKeys);
    const mintAccounts = await getMultipleAccounts(connection, mintAccountKeys);
    const openOrderAccounts = await getMultipleAccounts(connection, openOrderKeys);
    const serumMarketAccounts = await getMultipleAccounts(connection, serumMarketKeys);

    interface AdditionalInfoWrapper {
      tokenAmount?: bigint;
      lpSupplyAmount?: bigint;
      lpDecimal?: bigint;
      baseTokenTotal?: bigint;
      quoteTokenTotal?: bigint;
      marketEventQueue?: PublicKey;
    }
    let accountSet = new Map<PublicKey, AdditionalInfoWrapper>();

    // CAUTION: The order of 3 loops are dependent
    tokenAccounts.forEach((account) => {
      const parsedAccount = AccountLayout.decode(account.account!.data);
      accountSet.set(account.pubkey, {
        tokenAmount: parsedAccount.amount,
      });
    });

    mintAccounts.forEach((account) => {
      const parsedAccount = MintLayout.decode(account.account!.data);
      accountSet.set(account.pubkey, {
        lpDecimal: BigInt(parsedAccount.decimals),
        lpSupplyAmount: parsedAccount.supply,
      });
    });

    openOrderAccounts.forEach((account) => {
      const parsedAccount = _OPEN_ORDERS_LAYOUT_V2.decode(account.account!.data);
      accountSet.set(account.pubkey, {
        baseTokenTotal: BigInt(parsedAccount.baseTokenTotal),
        quoteTokenTotal: BigInt(parsedAccount.quoteTokenTotal),
      });
    });

    serumMarketAccounts.forEach((account) => {
      const parsedAccount = MARKET_STATE_LAYOUT_V3.decode(account.account!.data);
      accountSet.set(account.pubkey, {
        marketEventQueue: parsedAccount.eventQueue,
      });
    });

    pools.forEach((pool) => {
      pool.tokenAAmount = accountSet.get(pool.poolCoinTokenAccount)?.tokenAmount;
      pool.tokenBAmount = accountSet.get(pool.poolPcTokenAccount)?.tokenAmount;
      pool.lpSupplyAmount = accountSet.get(pool.lpMint)?.lpSupplyAmount;
      pool.lpDecimals = accountSet.get(pool.lpMint)?.lpDecimal;
      pool.ammOrderBaseTokenTotal = accountSet.get(pool.ammOpenOrders)?.baseTokenTotal;
      pool.ammOrderQuoteTokenTotal = accountSet.get(pool.ammOpenOrders)?.quoteTokenTotal;
      pool.marketEventQueue = accountSet.get(pool.serumMarket)?.marketEventQueue;
    });

    return pools;
  }

  static async getAllPoolWrappers(connection: Connection, page?: PageConfig): Promise<PoolInfoWrapper[]> {
    return (await this.getAllPools(connection, page)).map((poolInfo) => new PoolInfoWrapper(poolInfo));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<PoolInfo> {
    let pool = null as unknown as PoolInfo;
    const poolInfoAccount = await connection.getAccountInfo(poolId);

    let poolInfo = this.parsePool(poolInfoAccount?.data as Buffer, poolId);

    let accountKeys: PublicKey[] = [];

    if (!(poolInfo.totalPnlCoin.isZero() || poolInfo.totalPnlPc.isZero()) && Number(poolInfo.status) != 4) {
      accountKeys.push(poolInfo.poolCoinTokenAccount);
      accountKeys.push(poolInfo.poolPcTokenAccount);
      accountKeys.push(poolInfo.lpMint);
      accountKeys.push(poolInfo.ammOpenOrders);
      accountKeys.push(poolInfo.serumMarket);

      pool = poolInfo;
    }

    const additionalAccounts = await getMultipleAccounts(connection, accountKeys);

    // NOTICE: The index used to assign account data needs to be consistent to the order of public keys
    const tokenAAccountData = additionalAccounts[0];
    const tokenBAccountData = additionalAccounts[1];
    const mintAccountData = additionalAccounts[2];
    const openOrderData = additionalAccounts[3];
    const marketEventQueueData = additionalAccounts[4];

    const { supply, decimals } = MintLayout.decode(mintAccountData.account!.data);
    const { baseTokenTotal, quoteTokenTotal } = _OPEN_ORDERS_LAYOUT_V2.decode(openOrderData.account!.data);
    const marketEventQueue = MARKET_STATE_LAYOUT_V3.decode(marketEventQueueData.account!.data).eventQueue;

    pool.tokenAAmount = AccountLayout.decode(tokenAAccountData.account!.data).amount;
    pool.tokenBAmount = AccountLayout.decode(tokenBAccountData.account!.data).amount;
    pool.lpSupplyAmount = supply;
    pool.lpDecimals = BigInt(decimals);
    pool.ammOrderBaseTokenTotal = BigInt(baseTokenTotal);
    pool.ammOrderQuoteTokenTotal = BigInt(quoteTokenTotal);
    pool.marketEventQueue = marketEventQueue;

    return pool;
  }

  static async getPoolWrapper(connection: Connection, poolId: PublicKey): Promise<PoolInfoWrapper> {
    const pool = await this.getPool(connection, poolId);
    return new PoolInfoWrapper(pool);
  }

  static parsePool(data: Buffer, infoPubkey: PublicKey): PoolInfo {
    let poolData = Buffer.from(data);
    let rawPoolData = POOL_LAYOUT_V4.decode(poolData);
    let {
      status,
      nonce,
      orderNum,
      depth,
      swapFeeNumerator,
      swapFeeDenominator,
      coinDecimals,
      pcDecimals,
      state,
      resetFlag,
      minSize,
      volMaxCutRatio,
      amountWaveRatio,
      coinLotSize,
      pcLotSize,
      minPriceMultiplier,
      maxPriceMultiplier,
      systemDecimalsValue,
      needTakePnlCoin,
      needTakePnlPc,
      totalPnlPc,
      totalPnlCoin,
      poolTotalDepositPc,
      poolTotalDepositCoin,
      poolCoinTokenAccount,
      poolPcTokenAccount,
      coinMintAddress,
      pcMintAddress,
      lpMintAddress,
      ammOpenOrders,
      serumMarket,
      serumProgramId,
      ammTargetOrders,
      poolWithdrawQueue,
      poolTempLpTokenAccount,
      ammOwner,
      pnlOwner,
    } = rawPoolData;

    return {
      poolId: infoPubkey,
      version: 4,
      status,
      nonce,
      orderNum,
      depth,
      swapFeeNumerator,
      swapFeeDenominator,
      coinDecimals,
      pcDecimals,
      state,
      resetFlag,
      minSize,
      volMaxCutRatio,
      amountWaveRatio,
      coinLotSize,
      pcLotSize,
      minPriceMultiplier,
      maxPriceMultiplier,
      needTakePnlCoin,
      needTakePnlPc,
      totalPnlPc,
      totalPnlCoin,
      poolTotalDepositPc,
      poolTotalDepositCoin,
      systemDecimalsValue,
      poolCoinTokenAccount,
      poolPcTokenAccount,
      tokenAMint: coinMintAddress,
      tokenBMint: pcMintAddress,
      lpMint: lpMintAddress,
      ammOpenOrders,
      serumMarket,
      serumProgramId,
      ammTargetOrders,
      poolWithdrawQueue,
      poolTempLpTokenAccount,
      ammOwner,
      pnlOwner,
    };
  }

  static async getAllFarms(connection: Connection): Promise<FarmInfo[]> {
    // V3
    const sizeFilterV3: DataSizeFilter = {
      dataSize: 200,
    };
    const filtersV3 = [sizeFilterV3];
    const configV3: GetProgramAccountsConfig = { filters: filtersV3 };
    const farmsV3Accounts = await connection.getProgramAccounts(FARM_PROGRAM_ID_V3, configV3);
    const farmsV3 = farmsV3Accounts
      .map(({ pubkey, account }) => this._parseFarmV3(account.data, pubkey))
      .filter((farm) => Number(farm.state) === 1);

    // V5
    const sizeFilterV5: DataSizeFilter = {
      dataSize: 224,
    };
    const filtersV5 = [sizeFilterV5];
    const configV5: GetProgramAccountsConfig = { filters: filtersV5 };
    const farmsV5Accounts = await connection.getProgramAccounts(FARM_PROGRAM_ID_V5, configV5);
    const farmsV5 = farmsV5Accounts
      .map(({ pubkey, account }) => this._parseFarmV5(account.data, pubkey))
      .filter((farm) => Number(farm.state) === 1);

    let allFarms = [...farmsV3, ...farmsV5];

    let tokenAccountKeys: PublicKey[] = [];
    let mintAccountKeys: PublicKey[] = [];
    let accountSet = new Map<
      PublicKey,
      {
        token?: RawAccount;
        mint?: RawMint;
      }
    >();

    allFarms.forEach((farm) => {
      tokenAccountKeys.push(farm.poolLpTokenAccountPubkey);
      tokenAccountKeys.push(farm.poolRewardTokenAccountPubkey);
      if (farm.poolRewardTokenAccountPubkeyB) tokenAccountKeys.push(farm.poolRewardTokenAccountPubkeyB);
    });

    const tokenAccounts = await getMultipleAccounts(connection, tokenAccountKeys);

    tokenAccounts.forEach((account) => {
      const key = account.pubkey;
      const token = AccountLayout.decode(account.account!.data);

      accountSet.set(key, { token });

      // Store mint
      mintAccountKeys.push(token.mint);
    });

    const mintAccounts = await getMultipleAccounts(connection, mintAccountKeys);

    mintAccounts.forEach((account) => {
      const key = account.pubkey;
      const mint = MintLayout.decode(account.account!.data);

      accountSet.set(key, { mint });
    });

    // Assign:
    // - poolLpTokenAccountPubkey
    // - poolRewardTokenAccountPubkey
    // - poolRewardTokenAccountPubkeyB
    // - poolLpDecimals
    // - poolRewardADecimals
    // - poolRewardBDecimals
    allFarms.forEach((farm) => {
      const lpAccount = accountSet.get(farm.poolLpTokenAccountPubkey)?.token as RawAccount;
      farm.poolLpTokenAccount = {
        key: farm.poolLpTokenAccountPubkey,
        owner: lpAccount.owner as PublicKey,
        mint: lpAccount.mint as PublicKey,
        amount: lpAccount.amount,
      };

      const lpMint = accountSet.get(farm.poolLpTokenAccount.mint)?.mint as RawMint;
      farm.poolLpDecimals = BigInt(lpMint.decimals);

      const rewardAAccount = accountSet.get(farm.poolRewardTokenAccountPubkey)?.token as RawAccount;
      farm.poolRewardTokenAccount = {
        key: farm.poolRewardTokenAccountPubkey,
        owner: rewardAAccount.owner as PublicKey,
        mint: rewardAAccount.mint as PublicKey,
        amount: rewardAAccount.amount,
      };

      const rewardAMint = accountSet.get(farm.poolRewardTokenAccount.mint)?.mint as RawMint;
      farm.poolRewardADecimals = BigInt(rewardAMint.decimals);

      if (farm.poolRewardTokenAccountPubkeyB) {
        const rewardBAccount = accountSet.get(farm.poolRewardTokenAccountPubkeyB)?.token as RawAccount;
        farm.poolRewardTokenAccountB = {
          key: farm.poolRewardTokenAccountPubkeyB,
          owner: rewardBAccount.owner as PublicKey,
          mint: rewardBAccount.mint as PublicKey,
          amount: rewardBAccount.amount,
        };
        const rewardBMint = accountSet.get(farm.poolRewardTokenAccountB.mint)?.mint as RawMint;
        farm.poolRewardBDecimals = BigInt(rewardBMint.decimals);
      }
    });

    return allFarms;
  }

  static async getAllFarmWrappers(connection: Connection): Promise<FarmInfoWrapper[]> {
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<FarmInfo> {
    const farmInfoAccount = await connection.getAccountInfo(farmId);
    const farm = this.parseFarm(farmInfoAccount?.data as Buffer, farmId);

    let tokenAccountKeys: PublicKey[] = [];
    let mintAccountKeys: PublicKey[] = [];

    tokenAccountKeys.push(farm.poolLpTokenAccountPubkey);
    tokenAccountKeys.push(farm.poolRewardTokenAccountPubkey);
    if (farm.poolRewardTokenAccountPubkeyB) tokenAccountKeys.push(farm.poolRewardTokenAccountPubkeyB);

    const tokenAccounts = await getMultipleAccounts(connection, tokenAccountKeys);

    // NOTICE: The index used to assign account data needs to be consistent to the order of public keys

    const lpAccount = AccountLayout.decode(tokenAccounts[0].account!.data);
    const rewardAAccount = AccountLayout.decode(tokenAccounts[1].account!.data);
    mintAccountKeys.push(lpAccount.mint, rewardAAccount.mint);

    let rewardBAccount = {} as RawAccount;
    if (farm.poolRewardTokenAccountPubkeyB) {
      rewardBAccount = AccountLayout.decode(tokenAccounts[2].account!.data);

      // Store mints
      mintAccountKeys.push(rewardBAccount.mint);
    }

    const mintAccounts = await getMultipleAccounts(connection, mintAccountKeys);
    const lpMint = MintLayout.decode(mintAccounts[0].account!.data);
    const rewardAMint = MintLayout.decode(mintAccounts[1].account!.data);
    let rewardBMint = {} as RawMint;
    if (farm.poolRewardTokenAccountPubkeyB) {
      rewardBMint = MintLayout.decode(mintAccounts[2].account!.data);
    }

    // Assign:
    // - poolLpTokenAccountPubkey
    // - poolRewardTokenAccountPubkey
    // - poolRewardTokenAccountPubkeyB
    // - poolLpDecimals
    // - poolRewardADecimals
    // - poolRewardBDecimals
    farm.poolLpTokenAccount = {
      key: farm.poolLpTokenAccountPubkey,
      owner: lpAccount.owner as PublicKey,
      mint: lpAccount.mint as PublicKey,
      amount: lpAccount.amount,
    };
    farm.poolLpDecimals = BigInt(lpMint.decimals);
    farm.poolRewardTokenAccount = {
      key: farm.poolRewardTokenAccountPubkey,
      owner: rewardAAccount.owner as PublicKey,
      mint: rewardAAccount.mint as PublicKey,
      amount: rewardAAccount.amount,
    };
    farm.poolRewardADecimals = BigInt(rewardAMint.decimals);

    if (farm.poolRewardTokenAccountPubkeyB) {
      farm.poolRewardTokenAccountB = {
        key: farm.poolRewardTokenAccountPubkeyB,
        owner: rewardBAccount.owner as PublicKey,
        mint: rewardBAccount.mint as PublicKey,
        amount: rewardBAccount.amount,
      };
      farm.poolRewardBDecimals = BigInt(rewardBMint.decimals);
    }

    return farm;
  }

  static async getFarmWrapper(connection: Connection, farmId: PublicKey): Promise<FarmInfoWrapper> {
    const farm = await this.getFarm(connection, farmId);
    return new FarmInfoWrapper(farm);
  }

  static parseFarm(data: Buffer, farmId: PublicKey): FarmInfo {
    // v3 size = 200
    // v5 size = 224
    const version = data.length == 200 ? 3 : 5;
    const parsedFarm = version == 3 ? this._parseFarmV3(data, farmId) : this._parseFarmV5(data, farmId);

    let farm = null as unknown as FarmInfo;
    if (Number(parsedFarm.state) == 1) {
      farm = parsedFarm;
    }

    return farm;
  }

  static async getAllFarmers(connection: Connection, userKey: PublicKey): Promise<FarmerInfo[]> {
    let memcmpFilter: MemcmpFilter = {
      memcmp: {
        offset: 8 + 32,
        bytes: userKey.toString(),
      },
    };
    let dataSizeFilter = (dataSize: any): DataSizeFilter => {
      return { dataSize };
    };

    let filters_v3_2 = [memcmpFilter, dataSizeFilter(FARMER_LAYOUT_V3_2.span)];
    let allFarmersInV3_2 = await connection.getProgramAccounts(FARM_PROGRAM_ID_V3, { filters: filters_v3_2 });
    let filters_v5_2 = [memcmpFilter, dataSizeFilter(FARMER_LAYOUT_V5_2.span)];
    let allFarmersInV5_2 = await connection.getProgramAccounts(FARM_PROGRAM_ID_V5, { filters: filters_v5_2 });

    const allFarmers = [...allFarmersInV3_2, ...allFarmersInV5_2];
    const farmIds = allFarmers.map((farmerAccount) => {
      const isV3 = farmerAccount.account.data.length == FARMER_LAYOUT_V3_2.span ? true : false;
      let decoded = isV3
        ? FARMER_LAYOUT_V3_2.decode(farmerAccount.account.data)
        : FARMER_LAYOUT_V5_2.decode(farmerAccount.account.data);
      return new PublicKey(decoded.id.toBase58());
    });
    const farmInfo = (await getMultipleAccounts(connection, farmIds)).map((accountInfo) =>
      accountInfo.account?.data.length == FARM_LAYOUT_V3.span
        ? this._parseFarmV3(accountInfo.account?.data, accountInfo.pubkey)
        : this._parseFarmV5(accountInfo.account?.data, accountInfo.pubkey)
    );

    let tokenAccountKeys: PublicKey[] = [];
    farmInfo.forEach((farm) => {
      tokenAccountKeys.push(farm.poolLpTokenAccountPubkey);
      tokenAccountKeys.push(farm.poolRewardTokenAccountPubkey);
      if (farm.version === 5) {
        tokenAccountKeys.push(farm.poolRewardTokenAccountPubkeyB!);
      }
    });
    const tokenAccountMap = new Map<string, string>();
    const relatedMintsMap = new Map<
      string,
      {
        stakedTokenMint: string;
        rewardAMint: string;
        rewardBMint: string | undefined;
      }
    >();
    (await getMultipleAccounts(connection, tokenAccountKeys)).forEach((accountInfo) => {
      const tokenAccount = AccountLayout.decode(accountInfo.account?.data!);
      tokenAccountMap.set(accountInfo.pubkey.toBase58(), tokenAccount.mint.toBase58());
    });
    farmInfo.forEach((farm) => {
      relatedMintsMap.set(farm.farmId.toBase58(), {
        stakedTokenMint: tokenAccountMap.get(farm.poolLpTokenAccountPubkey.toBase58())!,
        rewardAMint: tokenAccountMap.get(farm.poolRewardTokenAccountPubkey.toBase58())!,
        rewardBMint:
          farm.poolRewardTokenAccountPubkeyB && tokenAccountMap.get(farm.poolRewardTokenAccountPubkeyB.toBase58()),
      });
    });

    const farmerInfo: FarmerInfo[] = allFarmers.map((farmer) => {
      const isV3 = farmer.account.data.length == FARMER_LAYOUT_V3_2.span ? true : false;
      let decoded = isV3
        ? FARMER_LAYOUT_V3_2.decode(farmer.account.data)
        : FARMER_LAYOUT_V5_2.decode(farmer.account.data);
      const farmId = new PublicKey(decoded.id);
      const relatedMints = relatedMintsMap.get(farmId.toBase58())!;
      return {
        farmerId: farmer.pubkey,
        farmId,
        userKey: new PublicKey(decoded.owner),
        amount: Number(decoded.deposited),
        farmVersion: isV3 ? 3 : 5,
        mints: relatedMints,
        rewardDebts: decoded.rewardDebts.map((rewardDebt: any) => Number(rewardDebt)),
      };
    });

    return farmerInfo;
  }

  static async getFarmerId(farmInfo: FarmInfo, userKey: PublicKey, version: number): Promise<PublicKey> {
    const programId = version === 3 ? FARM_PROGRAM_ID_V3 : FARM_PROGRAM_ID_V5;

    const [farmerId, _] = PublicKey.findProgramAddressSync(
      [farmInfo.farmId.toBuffer(), userKey.toBuffer(), Buffer.from("staker_info_v2_associated_seed", "utf-8")],
      programId
    );

    return farmerId;
  }

  static async getFarmer(connection: Connection, farmerId: PublicKey, version: number): Promise<FarmerInfo> {
    const farmerAccountInfo = await connection.getAccountInfo(farmerId);
    if (!farmerAccountInfo) throw "Error: Failed to get farmer.";
    const isV3 = farmerAccountInfo.data.length == FARMER_LAYOUT_V3_2.span ? true : false;

    const decoded = isV3
      ? FARMER_LAYOUT_V3_2.decode(farmerAccountInfo.data)
      : FARMER_LAYOUT_V5_2.decode(farmerAccountInfo.data);

    const farmId = new PublicKey(decoded.id.toBase58());
    const farmAccount = await connection.getAccountInfo(farmId);
    const farmInfo = isV3 ? this._parseFarmV3(farmAccount?.data, farmId) : this._parseFarmV5(farmAccount?.data, farmId);

    let tokenAccountKeys: PublicKey[] = [];
    tokenAccountKeys.push(farmInfo.poolLpTokenAccountPubkey);
    tokenAccountKeys.push(farmInfo.poolRewardTokenAccountPubkey);
    if (!isV3) {
      tokenAccountKeys.push(farmInfo.poolRewardTokenAccountPubkeyB!);
    }
    const tokenMints = (await getMultipleAccounts(connection, tokenAccountKeys)).map((accountInfo) => {
      const tokenAccount = AccountLayout.decode(accountInfo.account?.data!);
      return tokenAccount.mint.toBase58();
    });

    const farmer = {
      farmerId,
      farmId,
      userKey: new PublicKey(decoded.owner),
      amount: Number(decoded.deposited),
      farmVersion: isV3 ? 3 : 5,
      mints: {
        stakedTokenMint: tokenMints[0],
        rewardAMint: tokenMints[1],
        rewardBMint: isV3 ? undefined : tokenMints[2],
      },
      rewardDebts: decoded.rewardDebts.map((rewardDebt: any) => Number(rewardDebt)),
    };

    return farmer;
  }

  ////// Private methods

  private static _parseFarmV3(data: any, farmId: PublicKey): FarmInfo {
    let farmData = Buffer.from(data);
    let rawFarmData = FARM_LAYOUT_V3.decode(farmData);
    let { state, nonce, lpVault, rewardVaults, owner, totalRewards, perShareRewards, lastSlot, perSlotRewards } =
      rawFarmData;

    return {
      farmId,
      version: 3,
      state,
      nonce,
      poolLpTokenAccountPubkey: lpVault,
      poolRewardTokenAccountPubkey: rewardVaults[0],
      owner,
      totalReward: totalRewards[0],
      perShare: perShareRewards[0],
      perBlock: perSlotRewards[0],
      lastBlock: lastSlot,
    };
  }

  private static _parseFarmV5(data: any, farmId: PublicKey): FarmInfo {
    let farmData = Buffer.from(data);
    let rawFarmData = FARM_LAYOUT_V5.decode(farmData);
    let {
      state,
      nonce,
      lpVault,
      rewardVaultA,
      totalRewardA,
      perShareRewardA,
      perSlotRewardA,
      rewardVaultB,
      totalRewardB,
      perShareRewardB,
      perSlotRewardB,
      lastSlot,
      owner,
    } = rawFarmData;

    return {
      farmId,
      version: 5,
      state,
      nonce,
      poolLpTokenAccountPubkey: lpVault,
      poolRewardTokenAccountPubkey: rewardVaultA,
      owner,
      totalReward: totalRewardA,
      perShare: perShareRewardA,
      perBlock: perSlotRewardA,
      lastBlock: lastSlot,
      totalRewardB,
      perShareB: perShareRewardB,
      perBlockB: perSlotRewardB,
      poolRewardTokenAccountPubkeyB: rewardVaultB,
    };
  }
};

export { infos };

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: PoolInfo) {}

  getSwapOutAmount(fromSide: PoolDirection, amountIn: BN) {
    let amountOut = new BN(0);
    if (fromSide == PoolDirection.Obverse) {
      let x1 =
        (this.poolInfo.tokenAAmount as bigint) +
        (this.poolInfo.ammOrderBaseTokenTotal as bigint) -
        BigInt(Number(this.poolInfo.needTakePnlCoin));
      let y1 =
        (this.poolInfo.tokenBAmount as bigint) +
        (this.poolInfo.ammOrderQuoteTokenTotal as bigint) -
        BigInt(Number(this.poolInfo.needTakePnlPc));

      let k = x1 * y1;
      let x2 = x1 + BigInt(Number(amountIn));
      let y2 = k / x2;
      amountOut = new BN(Number(y1 - y2));
    } else {
      let x1 =
        (this.poolInfo.tokenBAmount as bigint) +
        (this.poolInfo.ammOrderQuoteTokenTotal as bigint) -
        BigInt(Number(this.poolInfo.needTakePnlPc));
      let y1 =
        (this.poolInfo.tokenAAmount as bigint) +
        (this.poolInfo.ammOrderBaseTokenTotal as bigint) -
        BigInt(Number(this.poolInfo.needTakePnlCoin));

      let k = x1 * y1;
      let x2 = x1 + BigInt(Number(amountIn));
      let y2 = k / x2;
      amountOut = new BN(Number(y1 - y2));
    }

    return new BN(Number(amountOut));
  }

  getTokenAmounts(lpAmount: number): { tokenAAmount: number; tokenBAmount: number } {
    const poolBalances = this._getPoolBalances();
    const tokenABalance = poolBalances.tokenA.balance;
    const tokenBBalance = poolBalances.tokenB.balance;
    const tokenAAmount = Number(tokenABalance.toWei()) * (lpAmount / Number(this.poolInfo.lpSupplyAmount));
    const tokenBAmount = Number(tokenBBalance.toWei()) * (lpAmount / Number(this.poolInfo.lpSupplyAmount));

    return {
      tokenAAmount,
      tokenBAmount,
    };
  }

  getLpAmount(
    tokenAmount: number,
    tokenMint: PublicKey // the mint of tokenAmount
  ): number {
    if (!tokenMint.equals(this.poolInfo.tokenAMint) && !tokenMint.equals(this.poolInfo.tokenBMint)) {
      throw new Error("Wrong token mint");
    }

    const poolBalances = this._getPoolBalances();
    const tokenABalance = poolBalances.tokenA.balance;
    const tokenBBalance = poolBalances.tokenB.balance;

    const balance = tokenMint.equals(this.poolInfo.tokenAMint) ? tokenABalance : tokenBBalance;
    const sharePercent = tokenAmount / (Number(balance.toWei()) + tokenAmount);

    return sharePercent * Number(this.poolInfo.lpSupplyAmount);
  }

  getLpPrice(tokenAPrice: number, tokenBPrice: number): number {
    const poolBalances = this._getPoolBalances();
    const tokenABalance = poolBalances.tokenA.balance;
    const tokenBBalance = poolBalances.tokenB.balance;
    const lpSupply = Number(this.poolInfo.lpSupplyAmount);
    const lpDecimals = Number(this.poolInfo.lpDecimals);

    const coinPrice = tokenAPrice;
    const pcPrice = tokenBPrice;

    const lpPrice =
      lpSupply > 0
        ? (Number(tokenABalance.toEther()) * 10 ** lpDecimals * coinPrice +
            Number(tokenBBalance.toEther()) * 10 ** lpDecimals * pcPrice) /
          lpSupply
        : 0;

    return lpPrice;
  }

  getApr(tradingVolumeIn24Hours: number, lpPrice: number): number {
    const poolBalances = this._getPoolBalances();
    const feeNumerator = poolBalances.fees.numerator;
    const feeDenominator = poolBalances.fees.denominator;
    const feeRate =
      feeDenominator > 0 && feeNumerator > 0 && feeNumerator / feeDenominator > 0.0003
        ? feeNumerator / feeDenominator - 0.0003
        : 0; // 0.03% out of 0.25%(radium swap fee) will deposit into stake

    const lpSupply = Number(this.poolInfo.lpSupplyAmount);
    const lpDecimals = Number(this.poolInfo.lpDecimals);

    const lpValue = (lpSupply / 10 ** lpDecimals) * lpPrice;
    const apr = lpValue > 0 ? ((tradingVolumeIn24Hours * feeRate * 365) / lpValue) * 100 : 0;

    return apr;
  }

  getTokenAAmount(tokenBAmount: bigint): bigint {
    const poolBalances = this._getPoolBalances();
    const coinBalance = BigInt(Number(poolBalances.tokenA.balance.toWei()));
    const pcBalance = BigInt(Number(poolBalances.tokenB.balance.toWei()));

    return (tokenBAmount * coinBalance) / pcBalance;
  }

  getTokenBAmount(tokenAAmount: bigint): bigint {
    const poolBalances = this._getPoolBalances();
    const coinBalance = BigInt(Number(poolBalances.tokenA.balance.toWei()));
    const pcBalance = BigInt(Number(poolBalances.tokenB.balance.toWei()));

    return (tokenAAmount * pcBalance) / coinBalance;
  }

  private _getPoolBalances() {
    const swapFeeNumerator = getBigNumber(this.poolInfo.swapFeeNumerator);
    const swapFeeDenominator = getBigNumber(this.poolInfo.swapFeeDenominator);

    // Calculate coinBalance and pcBalance
    let tokenABalance = new TokenAmount(
      Number(this.poolInfo.tokenAAmount) +
        Number(this.poolInfo.ammOrderBaseTokenTotal) -
        Number(this.poolInfo.needTakePnlCoin),
      Number(this.poolInfo.coinDecimals)
    );
    let tokenBBalance = new TokenAmount(
      Number(this.poolInfo.tokenBAmount) +
        Number(this.poolInfo.ammOrderQuoteTokenTotal) -
        Number(this.poolInfo.needTakePnlPc),
      Number(this.poolInfo.pcDecimals)
    );

    return {
      tokenA: {
        balance: tokenABalance,
        decimals: Number(this.poolInfo.coinDecimals),
      },
      tokenB: {
        balance: tokenBBalance,
        decimals: Number(this.poolInfo.pcDecimals),
      },
      fees: {
        numerator: swapFeeNumerator,
        denominator: swapFeeDenominator,
      },
    };
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: FarmInfo) {}

  getStakedAmount(): number {
    return Number(this.farmInfo.poolLpTokenAccount?.amount) ?? 0;
  }

  getAprs(lpPrice: number, rewardPrice: number, rewardPriceB?: number): number[] {
    const lpAmount = Number(this.farmInfo.poolLpTokenAccount?.amount);
    const lpDecimals = Number(this.farmInfo.poolLpDecimals);
    const lpValue = lpAmount * lpPrice;
    const rewardDecimals = Number(this.farmInfo.poolRewardADecimals);
    const annualRewardAmount =
      (Number(this.farmInfo.perBlock) * (2 * 60 * 60 * 24 * 365)) / 10 ** (rewardDecimals - lpDecimals);

    const apr = lpValue > 0 ? Math.round(((annualRewardAmount * rewardPrice) / lpValue) * 10000) / 100 : 0;

    if (rewardPriceB != undefined) {
      const rewardBDecimals = Number(this.farmInfo.poolRewardBDecimals);
      const annualRewardAmountB = this.farmInfo.perBlockB
        ? (Number(this.farmInfo.perBlockB) * (2 * 60 * 60 * 24 * 365)) / 10 ** (rewardBDecimals - lpDecimals)
        : 0;

      const aprB = lpValue > 0 ? Math.round(((annualRewardAmountB * rewardPriceB) / lpValue) * 10000) / 100 : 0;
      return [apr, aprB];
    }

    return [apr];
  }

  authority() {
    let seed = [this.farmInfo.farmId.toBuffer()];
    if (this.farmInfo.version > 3) {
      return PublicKey.findProgramAddressSync(seed, FARM_PROGRAM_ID_V5);
    }
    return PublicKey.findProgramAddressSync(seed, FARM_PROGRAM_ID_V3);
  }
}
