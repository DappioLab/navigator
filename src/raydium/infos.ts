import {
  AccountInfo,
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import { getTokenAccount } from "../utils";
import { POOL_PROGRAM_ID_V4, FARM_PROGRAM_ID_V3, FARM_PROGRAM_ID_V5 } from "./ids";
import { POOL_LAYOUT_V4, FARMER_LAYOUT_V3_2, FARMER_LAYOUT_V5_2, FARM_LAYOUT_V3, FARM_LAYOUT_V5 } from "./layouts";
import { OpenOrders } from "@project-serum/serum";
import { _OPEN_ORDERS_LAYOUT_V2 } from "@project-serum/serum/lib/market";
import BN from "bn.js";
import { parseTokenAccount } from "../utils";
import { IPoolInfoWrapper, IFarmInfoWrapper, IInstancePool, IInstanceFarm } from "../types";
import { getBigNumber, TokenAmount } from "./utils";
import { AccountLayout, MintLayout } from "@solana/spl-token-v2";
import { FarmerInfo, FarmInfo, PoolInfo } from ".";

let infos: IInstancePool & IInstanceFarm;

infos = class InstanceRaydium {
  static async getAllPools(connection: Connection): Promise<PoolInfo[]> {
    let allPool: PoolInfo[] = [];
    //V4 pools
    const v4SizeFilter: DataSizeFilter = {
      dataSize: 752,
    };
    const v4Filters = [v4SizeFilter];
    const v4config: GetProgramAccountsConfig = { filters: v4Filters };
    const allV4AMMAccount = await connection.getProgramAccounts(POOL_PROGRAM_ID_V4, v4config);
    for (let v4Account of allV4AMMAccount) {
      let poolInfo = this.parsePool(v4Account.account.data, v4Account.pubkey);
      if (!(poolInfo.totalPnlCoin.isZero() || poolInfo.totalPnlPc.isZero()) && poolInfo.status.toNumber() != 4) {
        allPool.push(poolInfo);
      }
    }

    return allPool;
  }

  static async getAllPoolWrappers(connection: Connection): Promise<PoolInfoWrapper[]> {
    return (await this.getAllPools(connection)).map((poolInfo) => new PoolInfoWrapper(poolInfo));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<PoolInfo> {
    let pool = null as unknown as PoolInfo;
    const poolInfoAccount = await connection.getAccountInfo(poolId);

    let poolInfo = this.parsePool(poolInfoAccount?.data as Buffer, poolId);

    if (!(poolInfo.totalPnlCoin.isZero() || poolInfo.totalPnlPc.isZero()) && poolInfo.status.toNumber() != 4) {
      pool = poolInfo;
    }

    return pool;
  }

  static parsePool(data: Buffer, infoPubkey: PublicKey): PoolInfo {
    let poolData = Buffer.from(data);
    let rawPoolData = POOL_LAYOUT_V4.decode(poolData);
    let {
      status,
      nonce,
      orderNum,
      depth,
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
      minSeparateNumerator,
      minSeparateDenominator,
      tradeFeeNumerator,
      tradeFeeDenominator,
      pnlNumerator,
      pnlDenominator,
      swapFeeNumerator,
      swapFeeDenominator,
      needTakePnlCoin,
      needTakePnlPc,
      totalPnlPc,
      totalPnlCoin,
      poolTotalDepositPc,
      poolTotalDepositCoin,
      swapCoinInAmount,
      swapPcOutAmount,
      swapCoin2PcFee,
      swapPcInAmount,
      swapCoinOutAmount,
      swapPc2CoinFee,
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
    let allFarm: FarmInfo[] = [];
    const v1SizeFilter: DataSizeFilter = {
      dataSize: 200,
    };
    const v1Filters = [v1SizeFilter];
    const v1Config: GetProgramAccountsConfig = { filters: v1Filters };
    const allV1FarmAccount = await connection.getProgramAccounts(FARM_PROGRAM_ID_V3, v1Config);
    for (let v1Account of allV1FarmAccount) {
      let farm = this._parseFarmV3(v1Account.account.data, v1Account.pubkey);
      if (farm.state.toNumber() == 1) {
        allFarm.push(farm);
      }
    }
    const v5SizeFilter: DataSizeFilter = {
      dataSize: 224,
    };
    const v5Filters = [v5SizeFilter];
    const v5Config: GetProgramAccountsConfig = { filters: v5Filters };
    const allV5FarmAccount = await connection.getProgramAccounts(FARM_PROGRAM_ID_V5, v5Config);
    for (let v5Account of allV5FarmAccount) {
      let farm = this._parseFarmV5(v5Account.account.data, v5Account.pubkey, 5);
      if (farm.state.toNumber() == 1) {
        allFarm.push(farm);
      }
    }

    allFarm = await this._updateAllFarmToken(allFarm, connection);
    for (let index = 0; index < allFarm.length; index++) {
      if (allFarm[index].poolLpTokenAccount?.amount.isZero()) {
        allFarm.splice(index, 1);
        index--;
      }
    }
    return allFarm;
  }

  static async getAllFarmWrappers(connection: Connection): Promise<FarmInfoWrapper[]> {
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<FarmInfo> {
    const farmInfoAccount = await connection.getAccountInfo(farmId);
    const farm = this.parseFarm(farmInfoAccount?.data as Buffer, farmId);

    return farm;
  }

  static parseFarm(data: Buffer, farmId: PublicKey): FarmInfo {
    // v3 size = 200
    // v5 size = 224
    const version = data.length == 200 ? 3 : 5;
    const parsedFarm = version == 3 ? this._parseFarmV3(data, farmId) : this._parseFarmV5(data, farmId, version);

    let farm = null as unknown as FarmInfo;
    if (parsedFarm.state.toNumber() == 1) {
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
    let dataSizeFilter = (datasize: any): DataSizeFilter => {
      return { dataSize: datasize };
    };

    let filters_v3_2 = [memcmpFilter, dataSizeFilter(FARMER_LAYOUT_V3_2.span)];

    let filters_v5_2 = [memcmpFilter, dataSizeFilter(FARMER_LAYOUT_V5_2.span)];

    let allFarmersInV3_2 = await connection.getProgramAccounts(FARM_PROGRAM_ID_V3, {
      filters: filters_v3_2,
    });

    let allFarmersInV5_2 = await connection.getProgramAccounts(FARM_PROGRAM_ID_V5, { filters: filters_v5_2 });

    let farmerInfoV3_2 = await this._getFarmerInfos(connection, allFarmersInV3_2, FARMER_LAYOUT_V3_2, 3);

    let farmerInfoV5_2 = await this._getFarmerInfos(connection, allFarmersInV5_2, FARMER_LAYOUT_V5_2, 5);

    return [...farmerInfoV3_2, ...farmerInfoV5_2];
  }

  static async getFarmerId(farmId: PublicKey, userKey: PublicKey, version: number): Promise<PublicKey> {
    const programId = version === 3 ? FARM_PROGRAM_ID_V3 : FARM_PROGRAM_ID_V5;

    const [farmerId, _] = await PublicKey.findProgramAddress(
      [farmId.toBuffer(), userKey.toBuffer(), Buffer.from("staker_info_v2_associated_seed", "utf-8")],
      programId
    );

    return farmerId;
  }

  static async getFarmer(connection: Connection, farmerId: PublicKey, version: number): Promise<FarmerInfo> {
    const farmerAcccountInfo = (await connection.getAccountInfo(farmerId)) as AccountInfo<Buffer>;
    const info =
      farmerAcccountInfo &&
      (await this._getFarmer(
        connection,
        { pubkey: farmerId, account: farmerAcccountInfo },
        version === 3 ? FARMER_LAYOUT_V3_2 : FARMER_LAYOUT_V5_2,
        version as 3 | 5
      ));
    return info;
  }

  ////// Private methods

  private static _parseFarmV3(data: any, farmId: PublicKey): FarmInfo {
    let farmData = Buffer.from(data);
    let rawFarmData = FARM_LAYOUT_V3.decode(farmData);
    let {
      state,
      nonce,
      lpVault,
      rewardVaults,
      owner,
      feeOwner,
      feeY,
      feeX,
      totalRewards,
      perShareRewards,
      lastSlot,
      perSlotRewards,
    } = rawFarmData;

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

  private static _parseFarmV5(data: any, farmId: PublicKey, version: number): FarmInfo {
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
      option,
      rewardVaultB,
      totalRewardB,
      perShareRewardB,
      perSlotRewardB,
      lastSlot,
      owner,
    } = rawFarmData;

    return {
      farmId,
      version,
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

  private static async _updateAllFarmToken(farms: FarmInfo[], connection: Connection) {
    let allLPPubkey: PublicKey[] = [];
    let allAccountInfo: AccountInfo<Buffer>[] = [];
    for (let index = 0; index < farms.length; index++) {
      allLPPubkey.push(farms[index].poolLpTokenAccountPubkey);

      if (index % 99 == 98) {
        let accounts = (await connection.getMultipleAccountsInfo(allLPPubkey)) as AccountInfo<Buffer>[];
        allAccountInfo = allAccountInfo.concat(accounts);
        allLPPubkey = [];
      }
    }

    allAccountInfo = allAccountInfo.concat(
      (await connection.getMultipleAccountsInfo(allLPPubkey)) as AccountInfo<Buffer>[]
    );

    for (let index = 0; index < farms.length; index++) {
      if (allAccountInfo[index]?.data) {
        farms[index].poolLpTokenAccount = parseTokenAccount(
          allAccountInfo[index]?.data,
          farms[index].poolLpTokenAccountPubkey
        );
      }
    }

    return farms;
  }

  // Inner fucntions used by getFarmerInfos
  private static async _getFarmRelatedMints(connection: Connection, decoded: any, farmVersion: 3 | 5) {
    let farmIdPubkey = new PublicKey(decoded.id.toBase58());
    let farmAccInfo = await connection.getAccountInfo(farmIdPubkey);
    let farmInfo: FarmInfo =
      farmVersion === 3
        ? this._parseFarmV3(farmAccInfo?.data, farmIdPubkey)
        : this._parseFarmV5(farmAccInfo?.data, farmIdPubkey, farmVersion);
    let stakedTokenMint = (await getTokenAccount(connection, farmInfo.poolLpTokenAccountPubkey)).mint.toBase58();

    let rewardAMint = (await getTokenAccount(connection, farmInfo.poolRewardTokenAccountPubkey)).mint.toBase58();
    let rewardBMint =
      farmVersion !== 3
        ? (await getTokenAccount(connection, farmInfo.poolRewardTokenAccountPubkeyB!)).mint.toBase58()
        : undefined;
    return { stakedTokenMint, rewardAMint, rewardBMint };
  }

  private static async _getFarmer(
    connection: Connection,
    farmer: {
      pubkey: PublicKey;
      account: AccountInfo<Buffer>;
    },
    layout: any,
    farmVersion: 3 | 5
  ): Promise<FarmerInfo> {
    let decoded = layout.decode(farmer.account.data);
    let relatedMints = await this._getFarmRelatedMints(connection, decoded, farmVersion);

    return {
      farmerId: farmer.pubkey,
      farmId: new PublicKey(decoded.id),
      userKey: new PublicKey(decoded.owner),
      amount: decoded.deposited.toNumber(),
      farmVersion: farmVersion,
      mints: relatedMints,
      rewardDebts: decoded.rewardDebts.map((rewardDebt: any) => rewardDebt.toNumber()),
    };
  }

  // Get all farmers for certain user wallet.
  private static async _getFarmerInfos(
    connection: Connection,
    farmers: {
      pubkey: PublicKey;
      account: AccountInfo<Buffer>;
    }[],
    layout: any,
    farmVersion: 3 | 5
  ): Promise<FarmerInfo[]> {
    return await Promise.all(
      farmers.map(async (farmer) => {
        let decoded = layout.decode(farmer.account.data);
        let relatedMints = await this._getFarmRelatedMints(connection, decoded, farmVersion);

        return {
          farmerId: farmer.pubkey,
          farmId: new PublicKey(decoded.id),
          userKey: new PublicKey(decoded.owner),
          amount: decoded.deposited.toNumber(),
          farmVersion: farmVersion,
          mints: relatedMints,
          rewardDebts: decoded.rewardDebts.map((rewardDebt: any) => rewardDebt.toNumber()),
        };
      })
    );
  }
};

export { infos };

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: PoolInfo) {}

  // TODO:
  // - Make all functinos pure (which means the function will not mutate the poolInfo)
  // - use "get" as prefix instead of "calculate" or "update"

  async calculateSwapOutAmount(fromSide: string, amountIn: BN, connection: Connection) {
    let poolInfoWrapper = await this.updatePoolAmount(connection);
    if (fromSide == "coin") {
      let x1 = poolInfoWrapper.poolInfo.coinAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderbaseTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlCoin) as BN;
      let y1 = poolInfoWrapper.poolInfo.pcAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderquoteTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlPc) as BN;
      let k = x1.mul(y1);
      let x2 = x1.add(amountIn);
      let y2 = k.div(x2);
      let amountOut = y1.sub(y2);

      return amountOut;
    } else if (fromSide == "pc") {
      let x1 = poolInfoWrapper.poolInfo.pcAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderquoteTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlPc) as BN;
      let y1 = poolInfoWrapper.poolInfo.coinAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderbaseTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlCoin) as BN;
      let k = x1.mul(y1);
      let x2 = x1.add(amountIn);
      let y2 = k.div(x2);
      let amountOut = y1.sub(y2);

      return amountOut;
    }

    return new BN(0);
  }

  async updatePoolAmount(connection: Connection) {
    let accounts: PublicKey[] = [];
    accounts.push(this.poolInfo.poolPcTokenAccount);
    accounts.push(this.poolInfo.poolCoinTokenAccount);
    accounts.push(this.poolInfo.ammOpenOrders);
    let infos = (await connection.getMultipleAccountsInfo(accounts)) as AccountInfo<Buffer>[];

    let pc = parseTokenAccount(infos[0].data, accounts[0]);
    this.poolInfo.pcAccountAmount = pc.amount;
    let coin = parseTokenAccount(infos[1].data, accounts[1]);
    this.poolInfo.coinAccountAmount = coin.amount;
    let ammOrder = OpenOrders.fromAccountInfo(accounts[2], infos[2], this.poolInfo.serumProgramId);
    this.poolInfo.ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
    this.poolInfo.ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
    return this;
  }

  // TODO: Remove this function (duplicate with updatePoolAmount?)
  // export async function updateAllTokenAmount(
  //   pools: PoolInfo[],
  //   connection: Connection
  // ) {
  //   let accounts: PublicKey[] = [];
  //   let allAccountInfo: AccountInfo<Buffer>[] = [];
  //   for (let pool of pools) {
  //     accounts.push(pool.poolPcTokenAccount);
  //     accounts.push(pool.poolCoinTokenAccount);
  //     accounts.push(pool.ammOpenOrders);
  //     if (accounts.length > 96) {
  //       let infos = (await connection.getMultipleAccountsInfo(
  //         accounts
  //       )) as AccountInfo<Buffer>[];
  //       allAccountInfo = allAccountInfo.concat(infos);
  //       accounts = [];
  //     }
  //   }
  //   let infos = (await connection.getMultipleAccountsInfo(
  //     accounts
  //   )) as AccountInfo<Buffer>[];
  //   allAccountInfo = allAccountInfo.concat(infos);
  //   for (let index = 0; index < pools.length; index++) {
  //     let pc = parseTokenAccount(
  //       allAccountInfo[index * 3].data,
  //       pools[index].poolPcTokenAccount
  //     );
  //     pools[index].pcAccountAmount = pc.amount;
  //     let coin = parseTokenAccount(
  //       allAccountInfo[index * 3 + 1].data,
  //       pools[index].poolCoinTokenAccount
  //     );
  //     pools[index].coinAccountAmount = coin.amount;
  //     let ammOrder = OpenOrders.fromAccountInfo(
  //       pools[index].ammOpenOrders,
  //       allAccountInfo[index * 3 + 2],
  //       pools[index].serumProgramId
  //     );
  //     pools[index].ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
  //     pools[index].ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
  //   }
  //   return pools;
  // }

  async getPoolBalances(conn: Connection) {
    const parsedAmmId = await conn
      .getAccountInfo(this.poolInfo.poolId)
      .then((accountInfo) => POOL_LAYOUT_V4.decode(accountInfo?.data));
    const parsedAmmOpenOrders = await conn
      .getAccountInfo(this.poolInfo.ammOpenOrders)
      .then((accountInfo) => _OPEN_ORDERS_LAYOUT_V2.decode(accountInfo?.data));
    const [parsedPoolCoinTokenAccount, parsedPoolPcTokenAccount] = await conn
      .getMultipleAccountsInfo([this.poolInfo.poolCoinTokenAccount, this.poolInfo.poolPcTokenAccount])
      .then((accountInfos) => accountInfos.map((accountInfo) => AccountLayout.decode(accountInfo?.data as Buffer)));

    const swapFeeNumerator = getBigNumber(parsedAmmId.swapFeeNumerator);
    const swapFeeDenominator = getBigNumber(parsedAmmId.swapFeeDenominator);

    const coinDecimals = parsedAmmId.coinDecimals;
    const pcDecimals = parsedAmmId.pcDecimals;

    // Calculate coinBalance and pcBalance
    let coinBalance = new TokenAmount(
      Number(parsedPoolCoinTokenAccount.amount) +
        Number(parsedAmmOpenOrders.baseTokenTotal) -
        Number(parsedAmmId.needTakePnlCoin),
      coinDecimals
    );
    let pcBalance = new TokenAmount(
      Number(parsedPoolPcTokenAccount.amount) +
        Number(parsedAmmOpenOrders.quoteTokenTotal) -
        Number(parsedAmmId.needTakePnlPc),
      pcDecimals
    );

    return {
      coin: {
        balance: coinBalance,
        decimals: coinDecimals,
      },
      pc: {
        balance: pcBalance,
        decimals: pcDecimals,
      },
      fees: {
        numerator: swapFeeNumerator,
        denominator: swapFeeDenominator,
      },
    };
  }

  async getCoinAndPcAmount(conn: Connection, lpAmount: number) {
    const poolBalances = await this.getPoolBalances(conn);
    const coinBalance = poolBalances.coin.balance;
    const coinDecimals = poolBalances.coin.decimals;
    const pcBalance = poolBalances.pc.balance;
    const pcDecimals = poolBalances.pc.decimals;
    const lpSupply = await conn
      .getAccountInfo(this.poolInfo.lpMint)
      .then((accountInfo) => Number(MintLayout.decode(accountInfo?.data as Buffer).supply));

    const coinAmount = coinBalance.toWei().toNumber() * (lpAmount / lpSupply);
    const pcAmount = pcBalance.toWei().toNumber() * (lpAmount / lpSupply);

    return {
      coinAmount,
      pcAmount,
    };
  }

  async getLpAmount(
    conn: Connection,
    tokenAmount: number,
    tokenMint: PublicKey // the mint of tokenAmount
  ) {
    if (!tokenMint.equals(this.poolInfo.tokenAMint) && !tokenMint.equals(this.poolInfo.tokenBMint)) {
      throw new Error("Wrong token mint");
    }

    const poolBalances = await this.getPoolBalances(conn);
    const coinBalance = poolBalances.coin.balance;
    const pcBalance = poolBalances.pc.balance;
    const lpSupply = await conn
      .getAccountInfo(this.poolInfo.lpMint)
      .then((accountInfo) => Number(MintLayout.decode(accountInfo?.data as Buffer).supply));

    const balance = tokenMint.equals(this.poolInfo.tokenAMint) ? coinBalance : pcBalance;
    const sharePercent = tokenAmount / (balance.toWei().toNumber() + tokenAmount);

    return sharePercent * lpSupply;
  }

  async getLpPrice(conn: Connection, tokenAPrice: number, tokenBPrice: number) {
    const poolBalances = await this.getPoolBalances(conn);
    const coinBalance = poolBalances.coin.balance;
    const coinDecimals = poolBalances.coin.decimals;
    const pcBalance = poolBalances.pc.balance;
    const pcDecimals = poolBalances.pc.decimals;
    const [lpSupply, lpDecimals] = await conn.getAccountInfo(this.poolInfo.lpMint).then((accountInfo) => {
      const mintInfo = MintLayout.decode(accountInfo?.data as Buffer);
      const supply = Number(mintInfo.supply);
      const decimals = mintInfo.decimals;
      return [supply, decimals];
    });

    const coinPrice = tokenAPrice;
    const pcPrice = tokenBPrice;

    const lpPrice =
      lpSupply > 0
        ? (coinBalance.toEther().toNumber() * 10 ** lpDecimals * coinPrice +
            pcBalance.toEther().toNumber() * 10 ** lpDecimals * pcPrice) /
          lpSupply
        : 0;

    return lpPrice;
  }

  async getApr(conn: Connection, tradingVolumeIn24Hours: number, lpPrice: number) {
    const poolBalances = await this.getPoolBalances(conn);
    const feeNumerator = poolBalances.fees.numerator;
    const feeDenominator = poolBalances.fees.denominator;
    const feeRate =
      feeDenominator > 0 && feeNumerator > 0 && feeNumerator / feeDenominator > 0.0003
        ? feeNumerator / feeDenominator - 0.0003
        : 0; // 0.03% out of 0.25%(radium swap fee) will deposit into stake

    const [lpSupply, lpDecimals] = await conn.getAccountInfo(this.poolInfo.lpMint).then((accountInfo) => {
      const lpMintInfo = MintLayout.decode(accountInfo?.data as Buffer);
      const supply = Number(lpMintInfo.supply);
      const decimals = lpMintInfo.decimals;
      return [supply, decimals];
    });

    const lpValue = (lpSupply / 10 ** lpDecimals) * lpPrice;
    const apr = lpValue > 0 ? ((tradingVolumeIn24Hours * feeRate * 365) / lpValue) * 100 : 0;

    return apr;
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: FarmInfo) {}

  async updateAllTokenAccount(connection: Connection) {
    let pubkeys: PublicKey[] = [this.farmInfo.poolLpTokenAccountPubkey, this.farmInfo.poolRewardTokenAccountPubkey];
    if (this.farmInfo.poolRewardTokenAccountPubkeyB) {
      pubkeys.push(this.farmInfo.poolRewardTokenAccountPubkeyB);
    }
    let allToken = await connection.getMultipleAccountsInfo(pubkeys);
    this.farmInfo.poolLpTokenAccount = parseTokenAccount(allToken[0]?.data, this.farmInfo.poolLpTokenAccountPubkey);
    this.farmInfo.poolRewardTokenAccount = parseTokenAccount(
      allToken[1]?.data,
      this.farmInfo.poolRewardTokenAccountPubkey
    );
    if (this.farmInfo.poolRewardTokenAccountPubkeyB && allToken[2]) {
      try {
        this.farmInfo.poolRewardTokenAccountB = parseTokenAccount(
          allToken[2]?.data,
          this.farmInfo.poolRewardTokenAccountPubkeyB
        );
      } catch (e) {
        console.log("updateAllTokenAccount() failed at parseTokenAccount", e);
      }
    }
    return this;
  }

  async authority() {
    let seed = [this.farmInfo.farmId.toBuffer()];
    if (this.farmInfo.version > 3) {
      return await PublicKey.findProgramAddress(seed, FARM_PROGRAM_ID_V5);
    }
    return await PublicKey.findProgramAddress(seed, FARM_PROGRAM_ID_V3);
  }

  async getStakedAmount(conn: Connection) {
    await this.updateAllTokenAccount(conn);

    return this.farmInfo.poolLpTokenAccount?.amount ?? new BN(0);
  }

  async getApr(conn: Connection, lpPrice: number, rewardPrice: number, rewardPriceB?: number) {
    await this.updateAllTokenAccount(conn);
    const tokenMintList: PublicKey[] = [
      this.farmInfo.poolLpTokenAccount?.mint!,
      this.farmInfo.poolRewardTokenAccount?.mint!,
    ];
    if (this.farmInfo.poolRewardTokenAccountB) {
      tokenMintList.push(this.farmInfo.poolRewardTokenAccountB?.mint!);
    }
    const allData = await conn.getMultipleAccountsInfo(tokenMintList);

    const lpAmount = Number(this.farmInfo.poolLpTokenAccount?.amount);
    const lpDecimals = MintLayout.decode(allData[0]?.data as Buffer).decimals;
    const lpValue = lpAmount * lpPrice;

    const rewardDecimals = MintLayout.decode(allData[1]?.data as Buffer).decimals;
    const annualRewardAmount =
      (Number(this.farmInfo.perBlock) * (2 * 60 * 60 * 24 * 365)) / 10 ** (rewardDecimals - lpDecimals);

    const apr = lpValue > 0 ? Math.round(((annualRewardAmount * rewardPrice) / lpValue) * 10000) / 100 : 0;

    if (rewardPriceB != undefined && allData[2]) {
      const rewardBDecimals = MintLayout.decode(allData[2]?.data as Buffer).decimals;
      const annualRewardAmountB = this.farmInfo.perBlockB
        ? (Number(this.farmInfo.perBlockB) * (2 * 60 * 60 * 24 * 365)) / 10 ** (rewardBDecimals - lpDecimals)
        : 0;

      const aprB = lpValue > 0 ? Math.round(((annualRewardAmountB * rewardPriceB) / lpValue) * 10000) / 100 : 0;
      return [apr, aprB];
    }

    return [apr];
  }
}
