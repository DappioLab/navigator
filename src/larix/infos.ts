import {
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { LARIX_MARKET_ID, LARIX_PROGRAM_ID } from "./ids";
import {
  FARM_LAYOUT,
  MINER_INDEX_LAYOUT,
  MINER_LAYOUT,
  RESERVE_LAYOUT,
} from "./layouts";

export const RESERVE_LAYOUT_SPAN = 873;

export interface ReserveInfo {
  reserveId: PublicKey; //*
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
  farm: FarmInfo; //*
}

interface ReserveConfig {
  optimalUtilizationRate: BN;
  loanToValueRatio: BN;
  liquidationBonus: BN;
  liquidationThreshold: BN;
  minBorrowRate: BN;
  optimalBorrowRate: BN;
  maxBorrowRate: BN;
  fees: ReserveFees;
}

interface ReserveCollateral {
  reserveTokenMint: PublicKey;
  mintTotalSupply: BN;
  supplyPubkey: PublicKey;
}

export interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

interface ReserveLiquidity {
  mintPubkey: PublicKey;
  mintDecimals: BN;
  supplyPubkey: PublicKey;
  feeReceiver: PublicKey;
  OraclePubkey: PublicKey;
  larixOraclePubkey: PublicKey;
  availableAmount: BN;
  borrowedAmountWads: BN;
  cumulativeBorrowRateWads: BN;
  marketPrice: BN;
  ownerUnclaimed: BN;
}

interface ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
}

export interface FarmInfo {
  unCollSupply: PublicKey;
  lTokenMiningIndex: BN;
  totalMiningSpeed: BN;
  kinkUtilRate: BN;
}

export function parseReserveData(data: any, pubkey: PublicKey): ReserveInfo {
  let dataBuffer = data as Buffer;
  let lengh = dataBuffer.length;
  let farmData = dataBuffer.slice(lengh - 249 - FARM_LAYOUT.span);
  const decodedData = RESERVE_LAYOUT.decode(data);
  const farmDecodedData = FARM_LAYOUT.decode(farmData);
  let { version, lastUpdate, lendingMarket, liquidity, collateral, config } =
    decodedData;
  let { unCollSupply, lTokenMiningIndex, totalMiningSpeed, kinkUtilRate } =
    farmDecodedData;

  return {
    reserveId: pubkey,
    version,
    lastUpdate,
    lendingMarket,
    liquidity,
    collateral,
    config,
    farm: {
      unCollSupply,
      lTokenMiningIndex,
      totalMiningSpeed,
      kinkUtilRate,
    },
  };
}

export class ReserveInfoWrapper {
  constructor(public reserveInfo: ReserveInfo) {}

  supplyTokenMint() {
    return this.reserveInfo.liquidity.mintPubkey;
  }

  supplyTokenDecimal() {
    return this.reserveInfo.liquidity.mintDecimals;
  }

  reserveTokenMint() {
    return this.reserveInfo.collateral.reserveTokenMint;
  }

  reserveTokenDecimal() {
    return this.reserveInfo.liquidity.mintDecimals;
  }

  reserveTokenSupply() {
    return this.reserveInfo.collateral.mintTotalSupply;
  }

  supplyAmount() {
    let borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(
      new BN(`1${"".padEnd(18, "0")}`)
    );

    let availableAmount = this.reserveInfo.liquidity.availableAmount;

    return borrowedAmount.add(availableAmount);
  }

  // supplyLimit() {
  //   return this.reserveInfo.config.depositLimit;
  // }

  isMining() {
    this.reserveInfo.farm.kinkUtilRate.gt(new BN(0));
  }

  supplyApy() {
    let UtilizationRatio =
      Math.trunc(this.calculateUtilizationRatio() * 100) / 100;
    let borrowAPY = this.calculateBorrowAPY() as number;
    let apy = (UtilizationRatio * borrowAPY * 998) / 1000;
  }

  miningApy() {
    return 0;
  }

  calculateUtilizationRatio() {
    let decimal = new BN(this.reserveInfo.liquidity.mintDecimals);
    const borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(
      new BN(`1${"".padEnd(18, "0")}`)
    );
    const totalAmount =
      this.reserveInfo.liquidity.availableAmount.add(borrowedAmount);
    const currentUtilization =
      borrowedAmount.toNumber() / totalAmount.toNumber();
    return currentUtilization;
  }

  calculateBorrowAPY() {
    const currentUtilization = this.calculateUtilizationRatio();
    const optimalUtilization =
      new BN(this.reserveInfo.config.optimalUtilizationRate).toNumber() / 100;
    let borrowAPY;
    if (optimalUtilization === 1.0 || currentUtilization < optimalUtilization) {
      const normalizedFactor = currentUtilization / optimalUtilization;
      const optimalBorrowRate =
        new BN(this.reserveInfo.config.optimalBorrowRate).toNumber() / 100;
      const minBorrowRate =
        new BN(this.reserveInfo.config.minBorrowRate).toNumber() / 100;
      borrowAPY =
        normalizedFactor * (optimalBorrowRate - minBorrowRate) + minBorrowRate;
    } else {
      const normalizedFactor =
        (currentUtilization - optimalUtilization) / (1 - optimalUtilization);
      const optimalBorrowRate =
        new BN(this.reserveInfo.config.optimalBorrowRate).toNumber() / 100;
      const maxBorrowRate =
        new BN(this.reserveInfo.config.maxBorrowRate).toNumber() / 100;
      borrowAPY =
        normalizedFactor * (maxBorrowRate - optimalBorrowRate) +
        optimalBorrowRate;
    }

    return borrowAPY;
  }
}

export async function getAllReserveWrappers(connection: Connection) {
  const allReserves = await getAllReserves(connection);
  let reserveInfoWrappers = [] as ReserveInfoWrapper[];

  for (let reservesMeta of allReserves) {
    const newinfo = new ReserveInfoWrapper(reservesMeta);
    reserveInfoWrappers.push(newinfo);
  }

  return reserveInfoWrappers;
}

async function getAllReserves(connection: Connection) {
  const programIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 10,
      //offset 10byte
      bytes: LARIX_MARKET_ID.toString(),
    },
  };
  const dataSizeFilters: DataSizeFilter = {
    dataSize: RESERVE_LAYOUT_SPAN,
  };

  const filters = [programIdMemcmp, dataSizeFilters];

  const config: GetProgramAccountsConfig = { filters: filters };
  const reserveAccounts = await connection.getProgramAccounts(
    LARIX_PROGRAM_ID,
    config
  );

  let reserves = [] as ReserveInfo[];
  for (let account of reserveAccounts) {
    let info = parseReserveData(account.account.data, account.pubkey);
    reserves.push(info);
  }

  return reserves;
}

export interface MinerInfo {
  farmerId: PublicKey;
  version: BN;
  owner: PublicKey;
  lendingMarket: PublicKey;
  reservesLen: BN;
  unclaimedMine: BN;
  indexs: MinerIndex[];
}

export interface MinerIndex {
  reserve: PublicKey;
  unCollLTokenAmount: BN;
  index: BN;
}

export function parseMinerInfo(data: any, miner: PublicKey) {
  let dataBuffer = data as Buffer;
  let infoData = dataBuffer;
  let indexData = dataBuffer.slice(MINER_LAYOUT.span);
  let newMinerInfo = MINER_LAYOUT.decode(infoData);
  let { version, owner, lendingMarket, reservesLen, unclaimedMine } =
    newMinerInfo;
  let indexs: MinerIndex[] = [];
  for (let i = 0; i < new BN(reservesLen).toNumber(); i++) {
    let currentIndexData = indexData.slice(i * MINER_INDEX_LAYOUT.span);
    let decodedIndex = MINER_INDEX_LAYOUT.decode(currentIndexData);
    let { reserve, unCollLTokenAmount, index } = decodedIndex;
    indexs.push({
      reserve,
      unCollLTokenAmount,
      index,
    });
  }

  return {
    farmerId: miner,
    version: new BN(version),
    owner,
    lendingMarket,
    reservesLen: new BN(reservesLen),
    unclaimedMine: new BN(unclaimedMine),
    indexs,
  };
}

export async function getMiner(
  connection: Connection,
  wallet: PublicKey,
  reserverInfoWrapper?: ReserveInfoWrapper[]
) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 1,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 642,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allMinerAccount = await connection.getProgramAccounts(
    LARIX_PROGRAM_ID,
    config
  );
  let allMinerInfo: MinerInfo[] = [];
  for (let account of allMinerAccount) {
    let currentFarmInfo = parseMinerInfo(account.account.data, account.pubkey);
    allMinerInfo.push(currentFarmInfo);
  }
  if (reserverInfoWrapper) {
    for (let miner of allMinerInfo) {
      for (let indexData of miner.indexs) {
        for (let reserve of reserverInfoWrapper) {
          if (indexData.reserve.equals(reserve.reserveInfo.reserveId)) {
            let indexSub = reserve.reserveInfo.farm.lTokenMiningIndex.sub(
              indexData.index
            );

            let reward = indexSub.mul(indexData.unCollLTokenAmount);

            miner.unclaimedMine = miner.unclaimedMine.add(reward);
          }
        }
      }
    }
  }
  return allMinerInfo;
}

export async function checkMinerCreated(
  connection: Connection,
  wallet: PublicKey
) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 1,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 642,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allMinerAccount = await connection.getProgramAccounts(
    LARIX_PROGRAM_ID,
    config
  );
  if (allMinerAccount.length == 0) {
    return false;
  }
  return true;
}

export async function newMinerAccountPub(wallet: PublicKey) {
  let newMiner = await PublicKey.createWithSeed(
    wallet,
    "Dappio",
    LARIX_PROGRAM_ID
  );
  return newMiner;
}
