import { Connection, MemcmpFilter, GetProgramAccountsConfig, DataSizeFilter, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IPoolInfoWrapper, IFarmInfoWrapper, IInstancePool, IInstanceFarm } from "../types";
import { computeD, getTokenAccountAmount, normalizedTradeFee, N_COINS, ZERO } from "../utils";
import { ADMIN_KEY, QURARRY_MINE_PROGRAM_ID, WRAP_PROGRAM_ID, POOL_PROGRAM_ID, QUARRY_REWARDER } from "./ids";
import { POOL_LAYOUT, FARM_LAYOUT, FARMER_LAYOUT, WRAP_LAYOUT } from "./layouts";
import { MintLayout } from "@solana/spl-token-v2";
import { defaultWrap, FarmerInfo, FarmInfo, PoolInfo, WrapInfo } from ".";

/**
 * tradingFee and withdrawFee are in units of 6 decimals
 */

const DIGIT = new BN(10000000000);

let infos: IInstancePool & IInstanceFarm;

infos = class InstanceSaber {
  static async getAllPools(connection: Connection): Promise<PoolInfo[]> {
    const adminIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 75,
        bytes: ADMIN_KEY.toString(),
      },
    };
    const sizeFilter: DataSizeFilter = {
      dataSize: 395,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allSaberAccount = await connection.getProgramAccounts(POOL_PROGRAM_ID, config);
    let infoArray: PoolInfo[] = [];
    let wrapInfoArray = await this._getAllWraps(connection);

    // Dead Pools
    for (let account of allSaberAccount) {
      const poolId = account.pubkey;

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
      let saberAccountInfo = await this.parsePool(account.account.data, poolId, poolAuthority);
      if (saberAccountInfo.isPaused) {
        continue;
      }
      let mintAwrapped = await this._checkWrapped(saberAccountInfo.tokenAMint, wrapInfoArray);
      saberAccountInfo.mintAWrapped = mintAwrapped[0];
      if (mintAwrapped[0]) {
        saberAccountInfo.mintAWrapInfo = mintAwrapped[1];
      }
      let mintBwrapped = await this._checkWrapped(saberAccountInfo.tokenBMint, wrapInfoArray);
      saberAccountInfo.mintBWrapped = mintBwrapped[0];
      if (mintBwrapped[0]) {
        saberAccountInfo.mintBWrapInfo = mintBwrapped[1];
      }

      infoArray.push(saberAccountInfo);
    }

    return infoArray;
  }

  static async getAllPoolWrappers(connection: Connection): Promise<IPoolInfoWrapper[]> {
    return (await this.getAllPools(connection)).map((poolInfo) => new PoolInfoWrapper(poolInfo));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<PoolInfo> {
    // const adminIdMemcmp: MemcmpFilter = {
    //   memcmp: {
    //     offset: 75,
    //     bytes: ADMIN_KEY.toString(),
    //   },
    // };
    // const sizeFilter: DataSizeFilter = {
    //   dataSize: 395,
    // };
    // const filters = [adminIdMemcmp, sizeFilter];
    // const allFarmInfo = await this.getAllFarms(connection, QUARRY_REWARDER);

    const wrapInfoArray = await this._getAllWraps(connection);
    const saberAccount: any = await connection.getAccountInfo(poolId);
    const poolAuthority = await this._getPoolAuthority(poolId);
    const saberAccountInfo = this.parsePool(saberAccount.data, poolId, poolAuthority);
    const mintAwrapped = await this._checkWrapped(saberAccountInfo.tokenAMint, wrapInfoArray);

    saberAccountInfo.mintAWrapped = mintAwrapped[0];
    if (mintAwrapped[0]) {
      saberAccountInfo.mintAWrapInfo = mintAwrapped[1];
    }
    let mintBwrapped = await this._checkWrapped(saberAccountInfo.tokenBMint, wrapInfoArray);
    saberAccountInfo.mintBWrapped = mintBwrapped[0];
    if (mintBwrapped[0]) {
      saberAccountInfo.mintBWrapInfo = mintBwrapped[1];
    }
    saberAccountInfo.poolId = poolId;

    return saberAccountInfo;
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
    const allFarmAccount = await connection.getProgramAccounts(QURARRY_MINE_PROGRAM_ID, config);
    let allFarmInfo: FarmInfo[] = [];
    for (let account of allFarmAccount) {
      let currentFarmInfo = this.parseFarm(account.account.data, account.pubkey);
      allFarmInfo.push(currentFarmInfo);
    }
    return allFarmInfo;
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

  static async getFarmerId(farmId: PublicKey, userKey: PublicKey): Promise<PublicKey> {
    let [farmerId, _] = await this.getFarmerIdWithBump(farmId, userKey);
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
    let farmerId = await this.getFarmerId(userKey, farm.farmId);
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
    const allWrapAccount = await connection.getProgramAccounts(WRAP_PROGRAM_ID, config);
    let infoArray: WrapInfo[] = [];
    for (let account of allWrapAccount) {
      let wrapAccountInfo = this._parseWrap(account.account.data);
      wrapAccountInfo.wrapAuthority = account.pubkey;
      infoArray.push(wrapAccountInfo);
    }
    return infoArray;
  }

  private static _parseWrap(data: Buffer): WrapInfo {
    const dataBuffer = data as Buffer;
    const cutttedData = dataBuffer.slice(8);
    const decodedData = WRAP_LAYOUT.decode(cutttedData);
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

  private static async _checkWrapped(tokenMint: PublicKey, wrapInfoArray: WrapInfo[]): Promise<[boolean, WrapInfo]> {
    for (let info of wrapInfoArray) {
      if (info.wrappedTokenMint.equals(tokenMint)) {
        return [true, info];
      }
    }

    return [false, defaultWrap];
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
  // this.withdrawFee = withdrawFeeNumerator
  //   .mul(DIGIT)
  //   .div(withdrawFeeDenominator);
  // this.tradingFee = tradeFeeNumerator.mul(DIGIT).div(tradeFeeDenominator);
  async updateAmount(connection: Connection) {
    this.poolInfo.AtokenAccountAmount = await getTokenAccountAmount(connection, this.poolInfo.tokenAccountA);
    this.poolInfo.BtokenAccountAmount = await getTokenAccountAmount(connection, this.poolInfo.tokenAccountB);
  }
  async calculateDepositRecieve(connection: Connection, AtokenIn: BN, BtokenIN: BN) {
    if (!this.poolInfo.AtokenAccountAmount) {
      await this.updateAmount(connection);
    }
  }

  async getCoinAndPcAmount(conn: Connection, lpAmount: number) {
    await this.updateAmount(conn);

    const coinBalance = this.poolInfo.AtokenAccountAmount!;
    const pcBalance = this.poolInfo.BtokenAccountAmount!;
    const lpSupply = await conn
      .getAccountInfo(this.poolInfo.lpMint)
      .then((accountInfo) => new BN(Number(MintLayout.decode(accountInfo?.data as Buffer).supply)));

    const coinAmountBeforeFee = coinBalance.mul(new BN(lpAmount)).div(lpSupply);
    const coinFee = this.poolInfo.withdrawFee.eq(ZERO)
      ? ZERO
      : coinAmountBeforeFee.mul(this.poolInfo.withdrawFee).divRound(DIGIT);
    const pcAmountBeforeFee = pcBalance.mul(new BN(lpAmount)).div(lpSupply);
    const pcFee = this.poolInfo.withdrawFee.eq(ZERO)
      ? ZERO
      : pcAmountBeforeFee.mul(this.poolInfo.withdrawFee).divRound(DIGIT);
    const coinAmount = Number(coinAmountBeforeFee.sub(coinFee));
    const pcAmount = Number(pcAmountBeforeFee.sub(pcFee));

    return {
      coinAmount,
      pcAmount,
    };
  }

  async getLpAmount(
    conn: Connection,
    tokenAAmount: number,
    tokenAMint: PublicKey, // the mint of tokenA Amount
    tokenBAmount?: number,
    tokenBMint?: PublicKey // the mint of tokenB Amount
  ) {
    if (tokenAAmount === 0) {
      return 0;
    }
    await this.updateAmount(conn);
    const lpSupply = await conn
      .getAccountInfo(this.poolInfo.lpMint)
      .then((accountInfo) => new BN(Number(MintLayout.decode(accountInfo?.data as Buffer).supply)));

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

  async getLpPrice(conn: Connection, tokenAPrice: number, tokenBPrice: number) {
    await this.updateAmount(conn);
    const lpSupply = await conn
      .getAccountInfo(this.poolInfo.lpMint)
      .then((accountInfo) => new BN(Number(MintLayout.decode(accountInfo?.data as Buffer).supply)));
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

  async getApr(conn: Connection, tradingVolumeIn24Hours: number, lpPrice: number) {
    await this.updateAmount(conn);

    const [lpSupply, lpDecimals] = await conn.getAccountInfo(this.poolInfo.lpMint).then((accountInfo) => {
      const lpMintInfo = MintLayout.decode(accountInfo?.data as Buffer);
      const supply = Number(lpMintInfo.supply);
      const decimals = lpMintInfo.decimals;
      return [supply, decimals];
    });
    const lpValue = (lpSupply / 10 ** lpDecimals) * lpPrice;
    const tradingFee = Number(this.poolInfo.tradingFee) / 10e9;
    const apr = lpValue > 0 ? ((tradingVolumeIn24Hours * tradingFee * 365) / lpValue) * 100 : 0;

    return apr;
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: FarmInfo) {}

  getStakedAmount(): BN {
    return this.farmInfo.totalTokensDeposited;
  }

  getApr(lpPrice: number, rewardTokenPrice: number) {
    const lpAmount = Number(this.farmInfo.totalTokensDeposited.div(new BN(10).pow(this.farmInfo.tokenMintDecimals)));
    const lpValue = lpAmount * lpPrice;
    const annualRewardAmount = Number(this.farmInfo.annualRewardsRate.divn(10e5));
    const annualRewardValue = annualRewardAmount * rewardTokenPrice;

    const apr = lpValue > 0 ? Math.round((annualRewardValue / lpValue) * 10000) / 100 : 0;

    return apr;
  }
}
