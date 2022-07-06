import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { IFarmerInfo, IFarmInfo, IPoolInfo, IPoolInfoWrapper } from "../types";
import {
  computeD,
  getTokenAccountAmount,
  getTokenSupply,
  normalizedTradeFee,
  N_COINS,
  ZERO,
} from "../utils";
import {
  ADMIN_KEY,
  QURARRY_MINE_PROGRAM_ID,
  QUARRY_REWARDER,
  WRAP_PROGRAM_ID,
  POOL_PROGRAM_ID,
} from "./ids";
import {
  FARM_LAYOUT,
  MINER_LAYOUT,
  SWAPINFO_LAYOUT,
  WRAPINFO_LAYOUT,
} from "./layouts";
import { MintLayout } from "@solana/spl-token-v2";

export async function getAllPools(connection: Connection): Promise<PoolInfo[]> {
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
  const allSaberAccount = await connection.getProgramAccounts(
    POOL_PROGRAM_ID,
    config
  );
  let infoArray: PoolInfoWrapper[] = [];
  let wrapInfoArray = await getAllWraps(connection);

  // Dead Pools
  for (let account of allSaberAccount) {
    if (
      account.pubkey.toString() ==
        "LeekqF2NMKiFNtYD6qXJHZaHx4hUdj4UiPu4t8sz7uK" ||
      account.pubkey.toString() ==
        "2jQoGQRixdcfuRPt9Zui7pk6ivnrQv79mf8h13Tyoa9K" ||
      account.pubkey.toString() ==
        "SPaiZAYyJBQHaSjtxFBKtLtQiCuG328r1mTfmvvydR5" ||
      account.pubkey.toString() ==
        "HoNG9Z4jsA1qtkZhDRYBc67LF2cbusZahjyxXtXdKZgR" ||
      account.pubkey.toString() ==
        "4Fss9Dy3vAUBuQ4SyEZz4vcLxeQqoFLZjdXhEUr3wqz3"
    ) {
      continue;
    }
    let saberAccountInfo = await parseSwapInfoData(
      account.account.data,
      account.pubkey
    );
    if (saberAccountInfo.poolInfo.isPaused) {
      continue;
    }
    let mintAwrapped = await checkWrapped(
      saberAccountInfo.poolInfo.tokenAMint,
      wrapInfoArray
    );
    saberAccountInfo.poolInfo.mintAWrapped = mintAwrapped[0];
    if (mintAwrapped[0]) {
      saberAccountInfo.poolInfo.mintAWrapInfo = mintAwrapped[1];
    }
    let mintBwrapped = await checkWrapped(
      saberAccountInfo.poolInfo.tokenBMint,
      wrapInfoArray
    );
    saberAccountInfo.poolInfo.mintBWrapped = mintBwrapped[0];
    if (mintBwrapped[0]) {
      saberAccountInfo.poolInfo.mintBWrapInfo = mintBwrapped[1];
    }
    // let farmStarted = getFarm(connection, saberAccountInfo.poolInfo.lpMint);
    // if (farmStarted) {
    //   saberAccountInfo.poolInfo.isFarming = true;
    //   saberAccountInfo.poolInfo.farmingInfo = farmStarted[1];
    // }
    infoArray.push(saberAccountInfo);
  }

  return infoArray.map((poolInfoWapper) => poolInfoWapper.poolInfo);
}

export async function getPool(
  connection: Connection,
  poolInfoKey: PublicKey
): Promise<PoolInfo> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 75,
      bytes: ADMIN_KEY.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 395,
  };
  const filters = [adminIdMemcmp, sizeFilter];

  const wrapInfoArray = await getAllWraps(connection);
  const allFarmInfo = await getAllFarms(connection, QUARRY_REWARDER);
  const saberAccount: any = await connection.getAccountInfo(poolInfoKey);
  const saberAccountInfo = await parseSwapInfoData(
    saberAccount.data,
    poolInfoKey
  );
  const mintAwrapped = await checkWrapped(
    saberAccountInfo.poolInfo.tokenAMint,
    wrapInfoArray
  );

  saberAccountInfo.poolInfo.mintAWrapped = mintAwrapped[0];
  if (mintAwrapped[0]) {
    saberAccountInfo.poolInfo.mintAWrapInfo = mintAwrapped[1];
  }
  let mintBwrapped = await checkWrapped(
    saberAccountInfo.poolInfo.tokenBMint,
    wrapInfoArray
  );
  saberAccountInfo.poolInfo.mintBWrapped = mintBwrapped[0];
  if (mintBwrapped[0]) {
    saberAccountInfo.poolInfo.mintBWrapInfo = mintBwrapped[1];
  }
  saberAccountInfo.poolInfo.poolId = poolInfoKey;

  return saberAccountInfo.poolInfo;
}

export interface WrapInfo {
  wrapAuthority: PublicKey;
  decimal: BN;
  multiplyer: BN;
  underlyingWrappedTokenMint: PublicKey;
  underlyingTokenAccount: PublicKey;
  wrappedTokenMint: PublicKey;
}

export function parseWrapInfoData(data: any): WrapInfo {
  const dataBuffer = data as Buffer;
  const cutttedData = dataBuffer.slice(8);
  const decodedData = WRAPINFO_LAYOUT.decode(cutttedData);
  let {
    wrapAuthority,
    decimal,
    multiplyer,
    underlyingWrappedTokenMint,
    underlyingTokenAccount,
    wrappedTokenMint,
  } = decodedData;
  return {
    wrapAuthority,
    decimal,
    multiplyer,
    underlyingWrappedTokenMint,
    underlyingTokenAccount,
    wrappedTokenMint,
  };
}

export async function checkWrapped(
  tokenMint: PublicKey,
  wrapInfoArray: WrapInfo[]
): Promise<[boolean, WrapInfo]> {
  for (let info of wrapInfoArray) {
    if (info.wrappedTokenMint.equals(tokenMint)) {
      return [true, info];
    }
  }
  return [false, defaultWrapInfo()];
}

function defaultWrapInfo(): WrapInfo {
  return {
    wrapAuthority: PublicKey.default,
    decimal: new BN(0),
    multiplyer: new BN(0),
    underlyingWrappedTokenMint: PublicKey.default,
    underlyingTokenAccount: PublicKey.default,
    wrappedTokenMint: PublicKey.default,
  };
}

export async function getAllWraps(connection: Connection) {
  const sizeFilter: DataSizeFilter = {
    dataSize: 114,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allWrapAccount = await connection.getProgramAccounts(
    WRAP_PROGRAM_ID,
    config
  );
  let infoArray: WrapInfo[] = [];
  for (let account of allWrapAccount) {
    let wrapAccountInfo = parseWrapInfoData(account.account.data);
    wrapAccountInfo.wrapAuthority = account.pubkey;
    infoArray.push(wrapAccountInfo);
  }
  return infoArray;
}

export interface FarmInfo extends IFarmInfo {
  rewarderKey: PublicKey;
  tokenMintKey: PublicKey;
  bump: BN;
  index: BN;
  tokenMintDecimals: BN;
  famineTs: BN;
  lastUpdateTs: BN;
  rewardsPerTokenStored: BN;
  annualRewardsRate: BN;
  rewardsShare: BN;
  totalTokensDeposited: BN;
  numMiners: BN;
}

export class FarmInfoWrapper {
  constructor(public farmInfo: FarmInfo) {}

  getStakedAmount(): BN {
    return this.farmInfo.totalTokensDeposited;
  }

  getApr(lpPrice: number, rewardTokenPrice: number) {
    const lpAmount = Number(
      this.farmInfo.totalTokensDeposited.div(
        new BN(10).pow(this.farmInfo.tokenMintDecimals)
      )
    );
    const lpValue = lpAmount * lpPrice;
    const annualRewardAmount = Number(
      this.farmInfo.annualRewardsRate.divn(10e5)
    );
    const annualRewardValue = annualRewardAmount * rewardTokenPrice;

    const apr =
      lpValue > 0 ? Math.round((annualRewardValue / lpValue) * 10000) / 100 : 0;

    return apr;
  }
}

export function parseFarmInfo(data: any, farmPubkey: PublicKey): FarmInfo {
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
    farmId: farmPubkey,
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
    numMiners: new BN(numMiners),
  };
}

export async function getAllFarms(
  connection: Connection,
  rewarderKey: PublicKey
) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8,
      bytes: rewarderKey.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 140,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allFarmAccount = await connection.getProgramAccounts(
    QURARRY_MINE_PROGRAM_ID,
    config
  );
  let allFarmInfo: FarmInfo[] = [];
  for (let account of allFarmAccount) {
    let currentFarmInfo = parseFarmInfo(account.account.data, account.pubkey);
    allFarmInfo.push(currentFarmInfo);
  }
  return allFarmInfo;
}

export async function getFarm(
  connection: Connection,
  farmId: PublicKey
): Promise<FarmInfo> {
  let farm = null as unknown as FarmInfo;
  const farmInfoAccount = await connection.getAccountInfo(farmId);
  if (farmInfoAccount) {
    farm = parseFarmInfo(farmInfoAccount?.data, farmId);
  }
  return farm;
}

export function getFarmFromLpMint(
  allFarms: FarmInfo[],
  mintPubkey: PublicKey
): FarmInfo | null {
  const farm = allFarms.filter((f) => f.tokenMintKey.equals(mintPubkey));
  return farm.length > 0 ? farm[0] : null;
}

export function defaultFarm(): FarmInfo {
  return {
    farmId: PublicKey.default,
    rewarderKey: PublicKey.default,
    tokenMintKey: PublicKey.default,
    bump: new BN(0),
    index: new BN(0),
    tokenMintDecimals: new BN(0),
    famineTs: new BN(0),
    lastUpdateTs: new BN(0),
    rewardsPerTokenStored: new BN(0),
    annualRewardsRate: new BN(0),
    rewardsShare: new BN(0),
    totalTokensDeposited: new BN(0),
    numMiners: new BN(0),
  };
}

export async function getMinerKey(wallet: PublicKey, farmPubkey: PublicKey) {
  let [miner, _] = await getMinerKeyWithBump(wallet, farmPubkey);
  return miner;
}

export async function getMiner(
  conn: Connection,
  minerKey: PublicKey
): Promise<MinerInfo> {
  const miner = await conn
    .getAccountInfo(minerKey)
    .then((accountInfo) => parseMinerInfo(accountInfo?.data, minerKey));
  return miner;
}

export async function getMinerKeyWithBump(
  wallet: PublicKey,
  farmPubkey: PublicKey
) {
  let minerBytes = new Uint8Array(Buffer.from("Miner", "utf-8"));
  let miner = await PublicKey.findProgramAddress(
    [minerBytes, farmPubkey.toBuffer(), wallet.toBuffer()],
    QURARRY_MINE_PROGRAM_ID
  );
  return miner;
}

export async function minerCreated(
  wallet: PublicKey,
  info: FarmInfo,
  connection: Connection
) {
  let minerKey = await getMinerKey(wallet, info.farmId);
  let minerAccountInfo = await connection.getAccountInfo(minerKey);
  if (minerAccountInfo?.owner.equals(QURARRY_MINE_PROGRAM_ID)) {
    return true;
  }
  return false;
}

export interface PoolInfo extends IPoolInfo {
  authority: PublicKey;
  isInitialized: boolean;
  isPaused: boolean;
  nonce: BN;
  initialAmpFactor: BN;
  targetAmpFactor: BN;
  startRampTs: BN;
  stopRampTs: BN;
  futureAdminDeadline: BN;
  futureAdminKey: PublicKey;
  adminKey: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  AtokenAccountAmount?: BN;
  BtokenAccountAmount?: BN;
  mintAWrapped?: Boolean;
  mintAWrapInfo?: WrapInfo;
  mintBWrapped?: Boolean;
  mintBWrapInfo?: WrapInfo;
  adminFeeAccountA: PublicKey;
  adminFeeAccountB: PublicKey;
  tradingFee: BN;
  withdrawFee: BN;
}

const DIGIT = new BN(10000000000);

/**
 * tradingFee and withdrawFee are in units of 6 decimals
 */
export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: PoolInfo) {}
  // this.withdrawFee = withdrawFeeNumerator
  //   .mul(DIGIT)
  //   .div(withdrawFeeDenominator);
  // this.tradingFee = tradeFeeNumerator.mul(DIGIT).div(tradeFeeDenominator);
  async updateAmount(connection: Connection) {
    this.poolInfo.AtokenAccountAmount = await getTokenAccountAmount(
      connection,
      this.poolInfo.tokenAccountA
    );
    this.poolInfo.BtokenAccountAmount = await getTokenAccountAmount(
      connection,
      this.poolInfo.tokenAccountB
    );
  }
  async calculateDepositRecieve(
    connection: Connection,
    AtokenIn: BN,
    BtokenIN: BN
  ) {
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
      .then(
        (accountInfo) =>
          new BN(Number(MintLayout.decode(accountInfo?.data as Buffer).supply))
      );

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
      .then(
        (accountInfo) =>
          new BN(Number(MintLayout.decode(accountInfo?.data as Buffer).supply))
      );

    const amp = this.poolInfo.targetAmpFactor;
    const coinBalance = this.poolInfo.AtokenAccountAmount!;
    const pcBalance = this.poolInfo.BtokenAccountAmount!;

    if (!tokenBAmount || !tokenBMint) {
      tokenAAmount = 2 * tokenAAmount;
      tokenBAmount = 0;
    }

    const depositCoinAmount = tokenAMint.equals(this.poolInfo.tokenAMint)
      ? new BN(tokenAAmount)
      : new BN(tokenBAmount);
    const depositPcAmount = tokenAMint.equals(this.poolInfo.tokenBMint)
      ? new BN(tokenAAmount)
      : new BN(tokenBAmount);

    const d0 = computeD(amp, coinBalance, pcBalance);
    const d1 = computeD(
      amp,
      coinBalance.add(depositCoinAmount),
      pcBalance.add(depositPcAmount)
    );
    if (d1.lt(d0)) {
      throw new Error("New D cannot be less than previous D");
    }

    const oldBalances = [coinBalance, pcBalance];
    const newBalances = [
      coinBalance.add(depositCoinAmount),
      pcBalance.add(depositPcAmount),
    ];
    const adjustedBalances = newBalances.map((newBalance, i) => {
      const oldBalance = oldBalances[i] as BN;
      const idealBalance = d1.div(d0).mul(oldBalance);
      const difference = idealBalance.sub(newBalance);
      const diffAbs = difference.gt(ZERO) ? difference : difference.neg();
      const fee = normalizedTradeFee(
        this.poolInfo.tradingFee,
        N_COINS,
        diffAbs
      );

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
      .then(
        (accountInfo) =>
          new BN(Number(MintLayout.decode(accountInfo?.data as Buffer).supply))
      );
    if (lpSupply.eq(ZERO)) {
      return 0;
    }

    const amp = this.poolInfo.targetAmpFactor;
    const coinBalance = this.poolInfo.AtokenAccountAmount!;
    const pcBalance = this.poolInfo.BtokenAccountAmount!;

    const virtualPrice =
      Number(computeD(amp, coinBalance, pcBalance)) / Number(lpSupply);

    const min_price = Math.min(tokenAPrice, tokenBPrice);

    const lpPrice = min_price * virtualPrice;

    return lpPrice;
  }

  async getApr(
    conn: Connection,
    tradingVolumeIn24Hours: number,
    lpPrice: number
  ) {
    await this.updateAmount(conn);

    const [lpSupply, lpDecimals] = await conn
      .getAccountInfo(this.poolInfo.lpMint)
      .then((accountInfo) => {
        const lpMintInfo = MintLayout.decode(accountInfo?.data as Buffer);
        const supply = Number(lpMintInfo.supply);
        const decimals = lpMintInfo.decimals;
        return [supply, decimals];
      });
    const lpValue = (lpSupply / 10 ** lpDecimals) * lpPrice;
    const tradingFee = Number(this.poolInfo.tradingFee) / 10e9;
    const apr =
      lpValue > 0
        ? ((tradingVolumeIn24Hours * tradingFee * 365) / lpValue) * 100
        : 0;

    return apr;
  }
}

export async function parseSwapInfoData(
  data: any,
  pubkey: PublicKey
): Promise<PoolInfoWrapper> {
  const decodedData = SWAPINFO_LAYOUT.decode(data);
  let authority = (
    await PublicKey.findProgramAddress([pubkey.toBuffer()], POOL_PROGRAM_ID)
  )[0];
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

  const withdrawFee = withdrawFeeNumerator
    .mul(DIGIT)
    .div(withdrawFeeDenominator);
  const tradingFee = tradeFeeNumerator.mul(DIGIT).div(tradeFeeDenominator);

  let poolInfo = new PoolInfoWrapper({
    poolId: pubkey,
    authority,
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
  });

  return poolInfo;
}

export interface MinerInfo extends IFarmerInfo {
  // infoPubkey: PublicKey;
  // farmKey: PublicKey;
  // owner: PublicKey;
  // balance: BN;
  bump: BN;
  vault: PublicKey;
  rewardsEarned: BN;
  rewardsPerTokenPaid: BN;
  index: BN;
}

export function parseMinerInfo(data: any, miner: PublicKey): MinerInfo {
  let dataBuffer = data as Buffer;
  let infoData = dataBuffer.slice(8);
  let newMinerInfo = MINER_LAYOUT.decode(infoData);
  let {
    infoPubkey,
    farmKey,
    owner,
    bump,
    vault,
    rewardsEarned,
    rewardsPerTokenPaid,
    balance,
    index,
  } = newMinerInfo;

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

export async function getAllMiner(
  connection: Connection,
  wallet: PublicKey
): Promise<MinerInfo[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8 + 32,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 145,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allMinerAccount = await connection.getProgramAccounts(
    QURARRY_MINE_PROGRAM_ID,
    config
  );
  let allMinerInfo: MinerInfo[] = [];
  for (let account of allMinerAccount) {
    let currentFarmInfo = parseMinerInfo(account.account.data, account.pubkey);
    if (currentFarmInfo.amount == 0) {
      continue;
    }
    allMinerInfo.push(currentFarmInfo);
  }
  return allMinerInfo;
}

export const defaultMiner: MinerInfo = {
  farmerId: PublicKey.default,
  farmId: PublicKey.default,
  userKey: PublicKey.default,
  amount: new BN(0).toNumber(),
  bump: new BN(0),
  vault: PublicKey.default,
  rewardsEarned: new BN(0),
  rewardsPerTokenPaid: new BN(0),
  index: new BN(0),
};
