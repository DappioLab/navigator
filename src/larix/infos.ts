import {
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { IReserveInfo, IReserveInfoWrapper } from "../types";
import { LARIX_MARKET_ID, LARIX_PROGRAM_ID } from "./ids";
import {
  FARM_LAYOUT,
  MINER_INDEX_LAYOUT,
  MINER_LAYOUT,
  RESERVE_LAYOUT,
} from "./layouts";
// @ts-ignore
import { seq } from "buffer-layout";

export const RESERVE_LAYOUT_SPAN = 873;

export interface ReserveInfo extends IReserveInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
  farm: FarmInfo;
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
  const decodedData = RESERVE_LAYOUT.decode(data);
  let {
    version,
    lastUpdate,
    lendingMarket,
    liquidity,
    collateral,
    config,
    bonus,
  } = decodedData;

  return {
    reserveId: pubkey,
    version,
    lastUpdate,
    lendingMarket,
    liquidity,
    collateral,
    config,
    farm: bonus,
  };
}

export class ReserveInfoWrapper implements IReserveInfoWrapper {
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
      new BN(`1${"".padEnd(18, "0")}`),
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
    return apy;
  }

  miningApy(larix_price: number) {
    let decimal = this.supplyTokenDecimal() as unknown as number;
    let poolTotalSupplyValue = this.supplyAmount()
    .mul(this.reserveInfo.liquidity.marketPrice)
    .div(new BN(`1${"".padEnd(18, "0")}`))
    .div(new BN(`1${"".padEnd(decimal, "0")}`));
    let miningRate = this.reserveInfo.farm.kinkUtilRate;
    let miningSpeed = this.reserveInfo.farm.totalMiningSpeed;
    let slotPerYear = new BN(2 * 86400 * 365 * larix_price);
    console.log("mint", this.supplyTokenMint().toString());
    let apy =
      miningRate.mul(slotPerYear).mul(miningSpeed).toNumber() /
      poolTotalSupplyValue.toNumber()/10**7;
    return apy;
  }

  calculateUtilizationRatio() {
    let decimal = new BN(this.reserveInfo.liquidity.mintDecimals);
    const borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(
      new BN(`1${"".padEnd(18, "0")}`),
    );
    const totalAmount =
      this.reserveInfo.liquidity.availableAmount.add(borrowedAmount);
    const currentUtilization = Number(borrowedAmount) / Number(totalAmount);
    return currentUtilization;
  }

  calculateBorrowAPY() {
    const currentUtilization = this.calculateUtilizationRatio();
    const optimalUtilization =
      Number(new BN(this.reserveInfo.config.optimalUtilizationRate)) / 100;
    let borrowAPY;
    if (optimalUtilization === 1.0 || currentUtilization < optimalUtilization) {
      const normalizedFactor = currentUtilization / optimalUtilization;
      const optimalBorrowRate =
        Number(new BN(this.reserveInfo.config.optimalBorrowRate)) / 100;
      const minBorrowRate =
        Number(new BN(this.reserveInfo.config.minBorrowRate)) / 100;
      borrowAPY =
        normalizedFactor * (optimalBorrowRate - minBorrowRate) + minBorrowRate;
    } else {
      const normalizedFactor =
        (currentUtilization - optimalUtilization) / (1 - optimalUtilization);
      const optimalBorrowRate =
        Number(new BN(this.reserveInfo.config.optimalBorrowRate)) / 100;
      const maxBorrowRate =
        Number(new BN(this.reserveInfo.config.maxBorrowRate)) / 100;
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
    config,
  );

  let reserves = [] as ReserveInfo[];
  for (let account of reserveAccounts) {
    let info = parseReserveData(account.account.data, account.pubkey);
    reserves.push(info);
  }

  return reserves;
}

export async function getReserve(
  connection: Connection,
  reserveId: PublicKey,
): Promise<ReserveInfo> {
  const reserveAccountInfo = await connection.getAccountInfo(reserveId);
  return parseReserveData(reserveAccountInfo?.data, reserveId);
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
  reserveId: PublicKey;
  unCollLTokenAmount: BN;
  index: BN;
}

export function parseMinerInfo(data: any, miner: PublicKey) {
  let dataBuffer = data as Buffer;
  let infoData = dataBuffer;
  let newMinerInfo = MINER_LAYOUT.decode(infoData);
  let { version, owner, lendingMarket, reservesLen, unclaimedMine, dataFlat } =
    newMinerInfo;

  const minerIndicesBuffer = dataFlat.slice(
    0,
    reservesLen * MINER_INDEX_LAYOUT.span,
  );

  const minerIndices = seq(MINER_INDEX_LAYOUT, reservesLen).decode(
    minerIndicesBuffer,
  ) as MinerIndex[];

  return {
    farmerId: miner,
    version: new BN(version),
    owner,
    lendingMarket,
    reservesLen: new BN(reservesLen),
    unclaimedMine: new BN(unclaimedMine),
    indexs: minerIndices,
  };
}

export async function getAllMiners(
  connection: Connection,
  wallet: PublicKey,
  reserverInfoWrapper?: ReserveInfoWrapper[],
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
    config,
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
          if (indexData.reserveId.equals(reserve.reserveInfo.reserveId)) {
            let indexSub = reserve.reserveInfo.farm.lTokenMiningIndex.sub(
              indexData.index,
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

export async function getMiner(
  connection: Connection,
  wallet: PublicKey,
  reserverInfoWrapper?: ReserveInfoWrapper[],
) {
  let minerPub = await newMinerAccountPub(wallet);
  let minerInfo = await connection.getAccountInfo(minerPub);
  if ((minerInfo?.data.length as number) > 0) {
    let miner = parseMinerInfo(minerInfo?.data, minerPub);
    if (reserverInfoWrapper) {
      for (let indexData of miner.indexs) {
        for (let reserve of reserverInfoWrapper) {
          if (indexData.reserveId.equals(reserve.reserveInfo.reserveId)) {
            let indexSub = reserve.reserveInfo.farm.lTokenMiningIndex.sub(
              indexData.index,
            );
            let reward = indexSub.mul(indexData.unCollLTokenAmount);
            miner.unclaimedMine = miner.unclaimedMine.add(reward);
          }
        }
      }
    }
    return miner;
  }
  return null;
}
export async function checkMinerCreated(
  connection: Connection,
  wallet: PublicKey,
) {
  let minerPub = await newMinerAccountPub(wallet);
  let minerInfo = await connection.getAccountInfo(minerPub);
  if ((minerInfo?.data.length as number) > 0) {
    return true;
  }
  return false;
}

export async function newMinerAccountPub(wallet: PublicKey) {
  let newMiner = await PublicKey.createWithSeed(
    wallet,
    "Dappio",
    LARIX_PROGRAM_ID,
  );
  return newMiner;
}
