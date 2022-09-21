import { Connection, MemcmpFilter, GetProgramAccountsConfig, DataSizeFilter, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IPoolInfoWrapper, IFarmInfoWrapper, IInstancePool, IInstanceFarm } from "../types";
import { getMultipleAccounts } from "../utils";
import { computeD, normalizedTradeFee, N_COINS, ZERO } from "./utils";
import { QURARRY_MINE_PROGRAM_ID, WRAP_PROGRAM_ID, POOL_PROGRAM_ID, QUARRY_REWARDER } from "./ids";
import { POOL_LAYOUT, FARM_LAYOUT, FARMER_LAYOUT, WRAP_LAYOUT } from "./layouts";
import { AccountLayout, MintLayout } from "@solana/spl-token-v2";
import { FarmerInfo, FarmInfo, PoolInfo, WrapInfo } from ".";

/**
 * tradingFee and withdrawFee are in units of 10 decimals
 */

const DIGIT = new BN(10000000000);

let infos: IInstancePool & IInstanceFarm;

infos = class InstanceSaber {
  static async getAllPools(connection: Connection): Promise<PoolInfo[]> {
    const sizeFilter: DataSizeFilter = {
      dataSize: 395,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const poolAccounts = await connection.getProgramAccounts(POOL_PROGRAM_ID, config);
    let pools: PoolInfo[] = [];
    let wrapInfos = await this._getAllWraps(connection);

    let tokenAccountKeys: PublicKey[] = [];
    let mintAccountKeys: PublicKey[] = [];

    // Skip Dead Pools
    for (let poolAccount of poolAccounts) {
      const poolId = poolAccount.pubkey;

      if (
        poolId.toString() == "LeekqF2NMKiFNtYD6qXJHZaHx4hUdj4UiPu4t8sz7uK" ||
        poolId.toString() == "2jQoGQRixdcfuRPt9Zui7pk6ivnrQv79mf8h13Tyoa9K" ||
        poolId.toString() == "SPaiZAYyJBQHaSjtxFBKtLtQiCuG328r1mTfmvvydR5" ||
        poolId.toString() == "HoNG9Z4jsA1qtkZhDRYBc67LF2cbusZahjyxXtXdKZgR" ||
        poolId.toString() == "4Fss9Dy3vAUBuQ4SyEZz4vcLxeQqoFLZjdXhEUr3wqz3"
      ) {
        continue;
      }

      const poolAuthority = await this._getPoolAuthority(poolId);
      let poolInfo = this.parsePool(poolAccount.account.data, poolId, poolAuthority);
      if (poolInfo.isPaused) {
        continue;
      }

      let wrap = wrapInfos.find((wrapInfo) => wrapInfo.wrappedTokenMint.equals(poolInfo.tokenAMint));
      poolInfo.mintAWrapped = Boolean(wrap);
      poolInfo.mintAWrapInfo = Boolean(wrap) ? wrap : undefined;

      wrap = wrapInfos.find((wrapInfo) => wrapInfo.wrappedTokenMint.equals(poolInfo.tokenBMint));
      poolInfo.mintBWrapped = Boolean(wrap);
      poolInfo.mintBWrapInfo = Boolean(wrap) ? wrap : undefined;

      tokenAccountKeys.push(poolInfo.tokenAccountA);
      tokenAccountKeys.push(poolInfo.tokenAccountB);
      mintAccountKeys.push(poolInfo.lpMint);

      pools.push(poolInfo);
    }

    const tokenAccounts = await getMultipleAccounts(connection, tokenAccountKeys);
    const mintAccounts = await getMultipleAccounts(connection, mintAccountKeys);

    interface AdditionalInfoWrapper {
      tokenAmount?: BN;
      lpSupplyAmount?: BN;
      lpDecimal?: number;
    }
    let accountSet = new Map<PublicKey, AdditionalInfoWrapper>();

    // CAUTION: The order of 2 loops are dependent
    tokenAccounts.forEach((account) => {
      const parsedAccount = AccountLayout.decode(account.account!.data);
      accountSet.set(account.pubkey, {
        tokenAmount: new BN(Number(parsedAccount.amount)),
      });
    });

    mintAccounts.forEach((account) => {
      const parsedAccount = MintLayout.decode(account.account!.data);
      accountSet.set(account.pubkey, {
        lpDecimal: parsedAccount.decimals,
        lpSupplyAmount: new BN(Number(parsedAccount.supply)),
      });
    });

    pools.forEach((pool) => {
      pool.AtokenAccountAmount = accountSet.get(pool.tokenAccountA)?.tokenAmount;
      pool.BtokenAccountAmount = accountSet.get(pool.tokenAccountB)?.tokenAmount;
      pool.lpSupply = accountSet.get(pool.lpMint)?.lpSupplyAmount;
      pool.lpDecimals = accountSet.get(pool.lpMint)?.lpDecimal;
    });

    return pools;
  }

  static async getAllPoolWrappers(connection: Connection): Promise<IPoolInfoWrapper[]> {
    return (await this.getAllPools(connection)).map((poolInfo) => new PoolInfoWrapper(poolInfo));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<PoolInfo> {
    const wrapInfos = await this._getAllWraps(connection);
    const poolAccount: any = await connection.getAccountInfo(poolId);
    const poolAuthority = await this._getPoolAuthority(poolId);
    const pool = this.parsePool(poolAccount.data, poolId, poolAuthority);
    pool.poolId = poolId;

    let wrap = wrapInfos.find((wrapInfo) => wrapInfo.wrappedTokenMint.equals(pool.tokenAMint));
    pool.mintAWrapped = Boolean(wrap);
    pool.mintAWrapInfo = Boolean(wrap) ? wrap : undefined;

    wrap = wrapInfos.find((wrapInfo) => wrapInfo.wrappedTokenMint.equals(pool.tokenBMint));
    pool.mintBWrapped = Boolean(wrap);
    pool.mintBWrapInfo = Boolean(wrap) ? wrap : undefined;

    let accountKeys: PublicKey[] = [];
    accountKeys.push(pool.tokenAccountA);
    accountKeys.push(pool.tokenAccountB);
    accountKeys.push(pool.lpMint);

    const additionalAccounts = await getMultipleAccounts(connection, accountKeys);
    // NOTICE: The index used to assign account data needs to be consistent to the order of public keys
    const tokenAAccountData = additionalAccounts[0];
    const tokenBAccountData = additionalAccounts[1];
    const mintAccountData = additionalAccounts[2];

    const { supply, decimals } = MintLayout.decode(mintAccountData.account!.data);

    pool.AtokenAccountAmount = new BN(Number(AccountLayout.decode(tokenAAccountData.account!.data).amount));
    pool.BtokenAccountAmount = new BN(Number(AccountLayout.decode(tokenBAccountData.account!.data).amount));
    pool.lpSupply = new BN(Number(supply));
    pool.lpDecimals = decimals;

    return pool;
  }

  static async getPoolWrapper(connection: Connection, poolId: PublicKey): Promise<PoolInfoWrapper> {
    const pool = await this.getPool(connection, poolId);
    return new PoolInfoWrapper(pool);
  }

  static parsePool(data: Buffer, poolId: PublicKey, poolAuthority?: PublicKey): PoolInfo {
    const decodedData = POOL_LAYOUT.decode(data);

    let {
      isInitialized,
      isPaused,
      nonce,
      initialAmpFactor,
      targetAmpFactor,
      startRampTs,
      stopRampTs,
      futureAdminDeadline,
      futureAdminKey,
      adminKey,
      tokenAccountA,
      tokenAccountB,
      poolMint,
      mintA,
      mintB,
      adminFeeAccountA,
      adminFeeAccountB,
      tradeFeeNumerator,
      tradeFeeDenominator,
      withdrawFeeNumerator,
      withdrawFeeDenominator,
    } = decodedData;

    const withdrawFee = withdrawFeeNumerator.mul(DIGIT).div(withdrawFeeDenominator);
    const tradingFee = tradeFeeNumerator.mul(DIGIT).div(tradeFeeDenominator);

    return {
      poolId,
      authority: poolAuthority as PublicKey,
      isInitialized,
      isPaused,
      nonce: new BN(nonce),
      initialAmpFactor: new BN(initialAmpFactor),
      targetAmpFactor: new BN(targetAmpFactor),
      startRampTs: new BN(startRampTs),
      stopRampTs: new BN(stopRampTs),
      futureAdminDeadline,
      futureAdminKey,
      adminKey,
      tokenAccountA,
      tokenAccountB,
      lpMint: poolMint,
      tokenAMint: mintA,
      tokenBMint: mintB,
      adminFeeAccountA,
      adminFeeAccountB,
      withdrawFee,
      tradingFee,
    };
  }

  static async getAllFarms(connection: Connection, rewardMint: PublicKey = QUARRY_REWARDER): Promise<FarmInfo[]> {
    const adminIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 8,
        bytes: rewardMint.toString(),
      },
    };
    const sizeFilter: DataSizeFilter = {
      dataSize: 140,
    };
    const filters = [adminIdMemcmp, sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const farmAccounts = await connection.getProgramAccounts(QURARRY_MINE_PROGRAM_ID, config);
    let farms: FarmInfo[] = farmAccounts.map((farmAccount) => {
      let farm = this.parseFarm(farmAccount.account.data, farmAccount.pubkey);
      return farm;
    });

    return farms;
  }

  static async getAllFarmWrappers(connection: Connection): Promise<FarmInfoWrapper[]> {
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<FarmInfo> {
    let farm = null as unknown as FarmInfo;
    const farmInfoAccount = await connection.getAccountInfo(farmId);
    if (farmInfoAccount) {
      farm = this.parseFarm(farmInfoAccount?.data, farmId);
    }
    return farm;
  }

  static async getFarmWrapper(connection: Connection, farmId: PublicKey): Promise<FarmInfoWrapper> {
    const farm = await this.getFarm(connection, farmId);
    return new FarmInfoWrapper(farm);
  }

  static getFarmFromLpMint(allFarms: FarmInfo[], mint: PublicKey): FarmInfo | null {
    const farm = allFarms.filter((f) => f.tokenMintKey.equals(mint));
    return farm.length > 0 ? farm[0] : null;
  }

  static parseFarm(data: any, farmId: PublicKey): FarmInfo {
    let dataBuffer = data as Buffer;
    let infoData = dataBuffer.slice(8);
    let newFarmInfo = FARM_LAYOUT.decode(infoData);
    let {
      rewarderKey,
      tokenMintKey,
      bump,
      index,
      tokenMintDecimals,
      famineTs,
      lastUpdateTs,
      rewardsPerTokenStored,
      annualRewardsRate,
      rewardsShare,
      totalTokensDeposited,
      numMiners,
    } = newFarmInfo;

    return {
      farmId,
      rewarderKey,
      tokenMintKey,
      bump: new BN(bump),
      index: new BN(index),
      tokenMintDecimals: new BN(tokenMintDecimals),
      famineTs: new BN(famineTs),
      lastUpdateTs: new BN(lastUpdateTs),
      rewardsPerTokenStored: new BN(rewardsPerTokenStored),
      annualRewardsRate: new BN(annualRewardsRate),
      rewardsShare: new BN(rewardsShare),
      totalTokensDeposited: new BN(totalTokensDeposited),
      numFarmers: new BN(numMiners),
    };
  }

  static async getAllFarmers(connection: Connection, userKey: PublicKey): Promise<FarmerInfo[]> {
    const adminIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 8 + 32,
        bytes: userKey.toString(),
      },
    };
    const sizeFilter: DataSizeFilter = {
      dataSize: 145,
    };
    const filters = [adminIdMemcmp, sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allFarmerAccount = await connection.getProgramAccounts(QURARRY_MINE_PROGRAM_ID, config);
    let allFarmerInfo: FarmerInfo[] = [];
    for (let account of allFarmerAccount) {
      let currentFarmInfo = this.parseFarmer(account.account.data, account.pubkey);
      if (currentFarmInfo.amount == 0) {
        continue;
      }
      allFarmerInfo.push(currentFarmInfo);
    }
    return allFarmerInfo;
  }

  static async getFarmerId(farmInfo: FarmInfo, userKey: PublicKey): Promise<PublicKey> {
    let [farmerId, _] = await this.getFarmerIdWithBump(farmInfo.farmId, userKey);
    return farmerId;
  }

  static async getFarmer(conn: Connection, farmerId: PublicKey): Promise<FarmerInfo> {
    const farmer = await conn
      .getAccountInfo(farmerId)
      .then((accountInfo) => this.parseFarmer(accountInfo?.data, farmerId));

    return farmer;
  }

  static parseFarmer(data: any, farmerId: PublicKey): FarmerInfo {
    let dataBuffer = data as Buffer;
    let infoData = dataBuffer.slice(8);
    let newFarmerInfo = FARMER_LAYOUT.decode(infoData);
    let { infoPubkey, farmKey, owner, bump, vault, rewardsEarned, rewardsPerTokenPaid, balance, index } = newFarmerInfo;

    return {
      farmerId: infoPubkey,
      farmId: farmKey,
      userKey: owner,
      amount: new BN(balance).toNumber(),
      bump: new BN(bump),
      vault,
      rewardsEarned: new BN(rewardsEarned),
      rewardsPerTokenPaid: new BN(rewardsPerTokenPaid),
      index: new BN(index),
    };
  }

  static async farmerCreated(connection: Connection, userKey: PublicKey, farm: FarmInfo) {
    let farmerId = await this.getFarmerId(farm, userKey);
    let farmerAccountInfo = await connection.getAccountInfo(farmerId);
    if (farmerAccountInfo?.owner.equals(QURARRY_MINE_PROGRAM_ID)) {
      return true;
    }
    return false;
  }

  // Private methods

  private static async _getAllWraps(connection: Connection): Promise<WrapInfo[]> {
    const sizeFilter: DataSizeFilter = {
      dataSize: 114,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const wrapAccounts = await connection.getProgramAccounts(WRAP_PROGRAM_ID, config);
    let wraps: WrapInfo[] = wrapAccounts.map((wrapAccount) => {
      let wrap = this._parseWrap(wrapAccount.account.data);
      wrap.wrapAuthority = wrapAccount.pubkey;
      return wrap;
    });

    return wraps;
  }

  private static _parseWrap(data: Buffer): WrapInfo {
    const dataBuffer = data as Buffer;
    const cutData = dataBuffer.slice(8);
    const decodedData = WRAP_LAYOUT.decode(cutData);
    let { wrapAuthority, decimal, multiplyer, underlyingWrappedTokenMint, underlyingTokenAccount, wrappedTokenMint } =
      decodedData;

    return {
      wrapAuthority,
      decimal,
      multiplyer,
      underlyingWrappedTokenMint,
      underlyingTokenAccount,
      wrappedTokenMint,
    };
  }

  private static async _getPoolAuthority(poolId: PublicKey): Promise<PublicKey> {
    const authority = (await PublicKey.findProgramAddress([poolId.toBuffer()], POOL_PROGRAM_ID))[0];

    return authority;
  }

  static async getFarmerIdWithBump(farmId: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]> {
    let farmerBytes = new Uint8Array(Buffer.from("Miner", "utf-8"));
    let farmer = await PublicKey.findProgramAddress(
      [farmerBytes, farmId.toBuffer(), userKey.toBuffer()],
      QURARRY_MINE_PROGRAM_ID
    );
    return farmer;
  }
};

export { infos };

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: PoolInfo) {}

  getTokenAmounts(lpAmount: number): { tokenAAmount: number; tokenBAmount: number } {
    const coinBalance = this.poolInfo.AtokenAccountAmount!;
    const pcBalance = this.poolInfo.BtokenAccountAmount!;
    const lpSupply = this.poolInfo.lpSupply!;
    const coinAmountBeforeFee = coinBalance.mul(new BN(lpAmount)).div(lpSupply);
    const coinFee = this.poolInfo.withdrawFee.eq(ZERO)
      ? ZERO
      : coinAmountBeforeFee.mul(this.poolInfo.withdrawFee).divRound(DIGIT);
    const pcAmountBeforeFee = pcBalance.mul(new BN(lpAmount)).div(lpSupply);
    const pcFee = this.poolInfo.withdrawFee.eq(ZERO)
      ? ZERO
      : pcAmountBeforeFee.mul(this.poolInfo.withdrawFee).divRound(DIGIT);
    const tokenAAmount = Number(coinAmountBeforeFee.sub(coinFee));
    const tokenBAmount = Number(pcAmountBeforeFee.sub(pcFee));

    return {
      tokenAAmount,
      tokenBAmount,
    };
  }

  getLpAmount(
    tokenAAmount: number,
    tokenAMint: PublicKey, // the mint of tokenA Amount
    tokenBAmount?: number,
    tokenBMint?: PublicKey // the mint of tokenB Amount
  ): number {
    if (tokenAAmount === 0) {
      return 0;
    }
    const lpSupply = this.poolInfo.lpSupply!;
    const amp = this.poolInfo.targetAmpFactor;
    const coinBalance = this.poolInfo.AtokenAccountAmount!;
    const pcBalance = this.poolInfo.BtokenAccountAmount!;

    if (!tokenBAmount || !tokenBMint) {
      tokenAAmount = 2 * tokenAAmount;
      tokenBAmount = 0;
    }

    const depositCoinAmount = tokenAMint.equals(this.poolInfo.tokenAMint) ? new BN(tokenAAmount) : new BN(tokenBAmount);
    const depositPcAmount = tokenAMint.equals(this.poolInfo.tokenBMint) ? new BN(tokenAAmount) : new BN(tokenBAmount);

    const d0 = computeD(amp, coinBalance, pcBalance);
    const d1 = computeD(amp, coinBalance.add(depositCoinAmount), pcBalance.add(depositPcAmount));
    if (d1.lt(d0)) {
      throw new Error("New D cannot be less than previous D");
    }

    const oldBalances = [coinBalance, pcBalance];
    const newBalances = [coinBalance.add(depositCoinAmount), pcBalance.add(depositPcAmount)];
    const adjustedBalances = newBalances.map((newBalance, i) => {
      const oldBalance = oldBalances[i] as BN;
      const idealBalance = d1.div(d0).mul(oldBalance);
      const difference = idealBalance.sub(newBalance);
      const diffAbs = difference.gt(ZERO) ? difference : difference.neg();
      const fee = normalizedTradeFee(this.poolInfo.tradingFee, N_COINS, diffAbs);

      return newBalance.sub(fee);
    }) as [BN, BN];

    const d2 = computeD(amp, adjustedBalances[0], adjustedBalances[1]);

    const lpAmount = Number(lpSupply.mul(d2.sub(d0)).div(d0));
    return lpAmount;
  }

  getLpPrice(tokenAPrice: number, tokenBPrice: number): number {
    const lpSupply = this.poolInfo.lpSupply!;
    if (lpSupply.eq(ZERO)) {
      return 0;
    }

    const amp = this.poolInfo.targetAmpFactor;
    const coinBalance = this.poolInfo.AtokenAccountAmount!;
    const pcBalance = this.poolInfo.BtokenAccountAmount!;

    const virtualPrice = Number(computeD(amp, coinBalance, pcBalance)) / Number(lpSupply);

    const min_price = Math.min(tokenAPrice, tokenBPrice);

    const lpPrice = min_price * virtualPrice;

    return lpPrice;
  }

  getApr(tradingVolumeIn24Hours: number, lpPrice: number): number {
    const lpSupply = Number(this.poolInfo.lpSupply!);
    const lpDecimals = this.poolInfo.lpDecimals!;
    const lpValue = (lpSupply / 10 ** lpDecimals) * lpPrice;
    const tradingFee = Number(this.poolInfo.tradingFee) / 10e9;
    const apr = lpValue > 0 ? ((tradingVolumeIn24Hours * tradingFee * 365) / lpValue) * 100 : 0;

    return apr;
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: FarmInfo) {}

  getStakedAmount(): number {
    // TODO
    return 0;
  }

  getAprs(lpPrice: number, rewardTokenPrice: number): number[] {
    const lpAmount = Number(this.farmInfo.totalTokensDeposited.div(new BN(10).pow(this.farmInfo.tokenMintDecimals)));
    const lpValue = lpAmount * lpPrice;
    const annualRewardAmount = Number(this.farmInfo.annualRewardsRate.divn(10e5));
    const annualRewardValue = annualRewardAmount * rewardTokenPrice;

    const apr = lpValue > 0 ? Math.round((annualRewardValue / lpValue) * 10000) / 100 : 0;

    return [apr];
  }
}
