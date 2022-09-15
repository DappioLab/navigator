import {
  AccountInfo,
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import { getMultipleAccounts } from "../utils";
import { POOL_PROGRAM_ID_V4, FARM_PROGRAM_ID_V3, FARM_PROGRAM_ID_V5 } from "./ids";
import { POOL_LAYOUT_V4, FARMER_LAYOUT_V3_2, FARMER_LAYOUT_V5_2, FARM_LAYOUT_V3, FARM_LAYOUT_V5 } from "./layouts";
import { _OPEN_ORDERS_LAYOUT_V2 } from "@project-serum/serum/lib/market";
import BN from "bn.js";
import { IPoolInfoWrapper, IFarmInfoWrapper, IInstancePool, IInstanceFarm } from "../types";
import { getBigNumber, getTokenAccount, TokenAmount } from "./utils";
import { AccountLayout, MintLayout, RawAccount, RawMint } from "@solana/spl-token-v2";
import { FarmerInfo, FarmInfo, PoolInfo } from ".";

let infos: IInstancePool & IInstanceFarm;

infos = class InstanceRaydium {
  static async getAllPools(connection: Connection): Promise<PoolInfo[]> {
    let pools: PoolInfo[] = [];
    //V4 pools
    const v4SizeFilter: DataSizeFilter = {
      dataSize: 752,
    };
    const v4Filters = [v4SizeFilter];
    const v4config: GetProgramAccountsConfig = { filters: v4Filters };
    const allV4AMMAccount = await connection.getProgramAccounts(POOL_PROGRAM_ID_V4, v4config);

    let tokenAccountKeys: PublicKey[] = [];
    let mintAccountKeys: PublicKey[] = [];
    let openOrderKeys: PublicKey[] = [];

    for (let { pubkey, account } of allV4AMMAccount) {
      let poolInfo = this.parsePool(account.data, pubkey);

      if (!(poolInfo.totalPnlCoin.isZero() || poolInfo.totalPnlPc.isZero()) && poolInfo.status.toNumber() != 4) {
        // Insert keys to be fetched
        tokenAccountKeys.push(poolInfo.poolCoinTokenAccount);
        tokenAccountKeys.push(poolInfo.poolPcTokenAccount);
        mintAccountKeys.push(poolInfo.lpMint);
        openOrderKeys.push(poolInfo.ammOpenOrders);

        pools.push(poolInfo);
      }
    }

    // Fetch accounts
    const tokenAccounts = await getMultipleAccounts(connection, tokenAccountKeys);
    const mintAccounts = await getMultipleAccounts(connection, mintAccountKeys);
    const openOrderAccounts = await getMultipleAccounts(connection, openOrderKeys);

    interface AdditionalInfoWrapper {
      tokenAmount?: bigint;
      lpSupplyAmount?: bigint;
      lpDecimal?: bigint;
      baseTokenTotal?: bigint;
      quoteTokenTotal?: bigint;
    }
    let accountSet = new Map<PublicKey, AdditionalInfoWrapper>();

    // CAUTION: The order of 3 loops are dependent
    tokenAccounts.forEach((account, index) => {
      const parsedAccount = AccountLayout.decode(account!.data);
      accountSet.set(tokenAccountKeys[index], {
        tokenAmount: parsedAccount.amount,
      });
    });

    mintAccounts.forEach((account, index) => {
      const parsedAccount = MintLayout.decode(account!.data);
      accountSet.set(mintAccountKeys[index], {
        lpDecimal: BigInt(parsedAccount.decimals),
        lpSupplyAmount: parsedAccount.supply,
      });
    });

    openOrderAccounts.forEach((account, index) => {
      const parsedAccount = _OPEN_ORDERS_LAYOUT_V2.decode(account!.data);
      accountSet.set(openOrderKeys[index], {
        baseTokenTotal: BigInt(parsedAccount.baseTokenTotal),
        quoteTokenTotal: BigInt(parsedAccount.quoteTokenTotal),
      });
    });

    pools.forEach((pool) => {
      pool.tokenAAmount = accountSet.get(pool.poolCoinTokenAccount)?.tokenAmount;
      pool.tokenBAmount = accountSet.get(pool.poolPcTokenAccount)?.tokenAmount;
      pool.lpSupplyAmount = accountSet.get(pool.lpMint)?.lpSupplyAmount;
      pool.lpDecimals = accountSet.get(pool.lpMint)?.lpDecimal;
      pool.ammOrderBaseTokenTotal = accountSet.get(pool.ammOpenOrders)?.baseTokenTotal;
      pool.ammOrderQuoteTokenTotal = accountSet.get(pool.ammOpenOrders)?.quoteTokenTotal;
    });

    return pools;
  }

  static async getAllPoolWrappers(connection: Connection): Promise<PoolInfoWrapper[]> {
    return (await this.getAllPools(connection)).map((poolInfo) => new PoolInfoWrapper(poolInfo));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<PoolInfo> {
    let pool = null as unknown as PoolInfo;
    const poolInfoAccount = await connection.getAccountInfo(poolId);

    let poolInfo = this.parsePool(poolInfoAccount?.data as Buffer, poolId);

    let accountKeys: PublicKey[] = [];

    if (!(poolInfo.totalPnlCoin.isZero() || poolInfo.totalPnlPc.isZero()) && poolInfo.status.toNumber() != 4) {
      accountKeys.push(poolInfo.poolCoinTokenAccount);
      accountKeys.push(poolInfo.poolPcTokenAccount);
      accountKeys.push(poolInfo.lpMint);
      accountKeys.push(poolInfo.ammOpenOrders);

      pool = poolInfo;
    }

    const additionalAccounts = await getMultipleAccounts(connection, accountKeys);

    // NOTICE: The index used to assign acccount data needs to be consistent to the order of public keys
    const tokenAAccountData = additionalAccounts[0];
    const tokenBAccountData = additionalAccounts[1];
    const mintAccountData = additionalAccounts[2];
    const openOrderData = additionalAccounts[3];

    const { supply, decimals } = MintLayout.decode(mintAccountData!.data);
    const { baseTokenTotal, quoteTokenTotal } = _OPEN_ORDERS_LAYOUT_V2.decode(openOrderData!.data);

    pool.tokenAAmount = AccountLayout.decode(tokenAAccountData!.data).amount;
    pool.tokenBAmount = AccountLayout.decode(tokenBAccountData!.data).amount;
    pool.lpSupplyAmount = supply;
    pool.lpDecimals = BigInt(decimals);
    pool.ammOrderBaseTokenTotal = BigInt(baseTokenTotal);
    pool.ammOrderQuoteTokenTotal = BigInt(quoteTokenTotal);

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
      .filter((farm) => farm.state.toNumber() === 1);

    // V5
    const sizeFilterV5: DataSizeFilter = {
      dataSize: 224,
    };
    const filtersV5 = [sizeFilterV5];
    const configV5: GetProgramAccountsConfig = { filters: filtersV5 };
    const farmsV5Accounts = await connection.getProgramAccounts(FARM_PROGRAM_ID_V5, configV5);
    const farmsV5 = farmsV5Accounts
      .map(({ pubkey, account }) => this._parseFarmV5(account.data, pubkey, 5))
      .filter((farm) => farm.state.toNumber() === 1);

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

    tokenAccounts.forEach((account, index) => {
      const key = tokenAccountKeys[index];
      const token = AccountLayout.decode(account!.data);

      accountSet.set(key, { token });

      // Store mint
      mintAccountKeys.push(token.mint);
    });

    const mintAccounts = await getMultipleAccounts(connection, mintAccountKeys);

    mintAccounts.forEach((account, index) => {
      const key = mintAccountKeys[index];
      const mint = MintLayout.decode(account!.data);

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

    // NOTICE: The index used to assign acccount data needs to be consistent to the order of public keys

    const lpAccount = AccountLayout.decode(tokenAccounts[0]!.data);
    const rewardAAccount = AccountLayout.decode(tokenAccounts[1]!.data);
    mintAccountKeys.push(lpAccount.mint, rewardAAccount.mint);

    let rewardBAccount = {} as RawAccount;
    if (farm.poolRewardTokenAccountPubkeyB) {
      rewardBAccount = AccountLayout.decode(tokenAccounts[2]!.data);

      // Store mints
      mintAccountKeys.push(rewardBAccount.mint);
    }

    const mintAccounts = await getMultipleAccounts(connection, mintAccountKeys);
    const lpMint = MintLayout.decode(mintAccounts[0]!.data);
    const rewardAMint = MintLayout.decode(mintAccounts[1]!.data);
    let rewardBMint = {} as RawMint;
    if (farm.poolRewardTokenAccountPubkeyB) {
      rewardBMint = MintLayout.decode(mintAccounts[2]!.data);
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
    let dataSizeFilter = (dataSize: any): DataSizeFilter => {
      return { dataSize };
    };

    let filters_v3_2 = [memcmpFilter, dataSizeFilter(FARMER_LAYOUT_V3_2.span)];
    let allFarmersInV3_2 = await connection.getProgramAccounts(FARM_PROGRAM_ID_V3, { filters: filters_v3_2 });
    let farmerInfoV3_2 = await this._getFarmerInfos(connection, allFarmersInV3_2, FARMER_LAYOUT_V3_2, 3);

    let filters_v5_2 = [memcmpFilter, dataSizeFilter(FARMER_LAYOUT_V5_2.span)];
    let allFarmersInV5_2 = await connection.getProgramAccounts(FARM_PROGRAM_ID_V5, { filters: filters_v5_2 });
    let farmerInfoV5_2 = await this._getFarmerInfos(connection, allFarmersInV5_2, FARMER_LAYOUT_V5_2, 5);

    return [...farmerInfoV3_2, ...farmerInfoV5_2];
  }

  static async getFarmerId(farmInfo: FarmInfo, userKey: PublicKey, version: number): Promise<PublicKey> {
    const programId = version === 3 ? FARM_PROGRAM_ID_V3 : FARM_PROGRAM_ID_V5;

    const [farmerId, _] = await PublicKey.findProgramAddress(
      [farmInfo.farmId.toBuffer(), userKey.toBuffer(), Buffer.from("staker_info_v2_associated_seed", "utf-8")],
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

  async getSwapOutAmount(fromSide: string, amountIn: BN) {
    if (fromSide == "coin") {
      let x1 =
        (this.poolInfo.tokenAAmount as bigint) +
        (this.poolInfo.ammOrderBaseTokenTotal as bigint) -
        BigInt(this.poolInfo.needTakePnlCoin.toNumber());
      let y1 =
        (this.poolInfo.tokenBAmount as bigint) +
        (this.poolInfo.ammOrderQuoteTokenTotal as bigint) -
        BigInt(this.poolInfo.needTakePnlPc.toNumber());

      let k = x1 * y1;
      let x2 = x1 + BigInt(amountIn.toNumber());
      let y2 = k / x2;
      let amountOut = y1 - y2;

      return new BN(Number(amountOut));
    } else if (fromSide == "pc") {
      let x1 =
        (this.poolInfo.tokenBAmount as bigint) +
        (this.poolInfo.ammOrderQuoteTokenTotal as bigint) -
        BigInt(this.poolInfo.needTakePnlPc.toNumber());
      let y1 =
        (this.poolInfo.tokenAAmount as bigint) +
        (this.poolInfo.ammOrderBaseTokenTotal as bigint) -
        BigInt(this.poolInfo.needTakePnlCoin.toNumber());

      let k = x1 * y1;
      let x2 = x1 + BigInt(amountIn.toNumber());
      let y2 = k / x2;
      let amountOut = y1 - y2;

      return new BN(Number(amountOut));
    }

    return new BN(0);
  }

  async getPoolBalances() {
    const swapFeeNumerator = getBigNumber(this.poolInfo.swapFeeNumerator);
    const swapFeeDenominator = getBigNumber(this.poolInfo.swapFeeDenominator);

    // Calculate coinBalance and pcBalance
    let coinBalance = new TokenAmount(
      Number(this.poolInfo.tokenAAmount) +
        Number(this.poolInfo.ammOrderBaseTokenTotal) -
        Number(this.poolInfo.needTakePnlCoin),
      this.poolInfo.coinDecimals.toNumber()
    );
    let pcBalance = new TokenAmount(
      Number(this.poolInfo.tokenBAmount) +
        Number(this.poolInfo.ammOrderQuoteTokenTotal) -
        Number(this.poolInfo.needTakePnlPc),
      this.poolInfo.pcDecimals.toNumber()
    );

    return {
      coin: {
        balance: coinBalance,
        decimals: this.poolInfo.coinDecimals.toNumber(),
      },
      pc: {
        balance: pcBalance,
        decimals: this.poolInfo.pcDecimals.toNumber(),
      },
      fees: {
        numerator: swapFeeNumerator,
        denominator: swapFeeDenominator,
      },
    };
  }

  async getCoinAndPcAmount(lpAmount: number) {
    const poolBalances = await this.getPoolBalances();
    const coinBalance = poolBalances.coin.balance;
    const pcBalance = poolBalances.pc.balance;
    const coinAmount = coinBalance.toWei().toNumber() * (lpAmount / Number(this.poolInfo.lpSupplyAmount));
    const pcAmount = pcBalance.toWei().toNumber() * (lpAmount / Number(this.poolInfo.lpSupplyAmount));

    return {
      coinAmount,
      pcAmount,
    };
  }

  async getLpAmount(
    tokenAmount: number,
    tokenMint: PublicKey // the mint of tokenAmount
  ) {
    if (!tokenMint.equals(this.poolInfo.tokenAMint) && !tokenMint.equals(this.poolInfo.tokenBMint)) {
      throw new Error("Wrong token mint");
    }

    const poolBalances = await this.getPoolBalances();
    const coinBalance = poolBalances.coin.balance;
    const pcBalance = poolBalances.pc.balance;

    const balance = tokenMint.equals(this.poolInfo.tokenAMint) ? coinBalance : pcBalance;
    const sharePercent = tokenAmount / (balance.toWei().toNumber() + tokenAmount);

    return sharePercent * Number(this.poolInfo.lpSupplyAmount);
  }

  async getLpPrice(tokenAPrice: number, tokenBPrice: number) {
    const poolBalances = await this.getPoolBalances();
    const coinBalance = poolBalances.coin.balance;
    const pcBalance = poolBalances.pc.balance;
    const lpSupply = Number(this.poolInfo.lpSupplyAmount);
    const lpDecimals = Number(this.poolInfo.lpDecimals);

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

  async getApr(tradingVolumeIn24Hours: number, lpPrice: number) {
    const poolBalances = await this.getPoolBalances();
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
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: FarmInfo) {}

  async authority() {
    let seed = [this.farmInfo.farmId.toBuffer()];
    if (this.farmInfo.version > 3) {
      return await PublicKey.findProgramAddress(seed, FARM_PROGRAM_ID_V5);
    }
    return await PublicKey.findProgramAddress(seed, FARM_PROGRAM_ID_V3);
  }

  async getStakedAmount(conn: Connection) {
    return this.farmInfo.poolLpTokenAccount?.amount ?? new BN(0);
  }

  async getApr(conn: Connection, lpPrice: number, rewardPrice: number, rewardPriceB?: number) {
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
}
