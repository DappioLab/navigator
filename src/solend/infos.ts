import { Connection, PublicKey, GetProgramAccountsConfig, MemcmpFilter, DataSizeFilter } from "@solana/web3.js";
import BN from "bn.js";
import { IInstanceMoneyMarket, IObligationInfo, IReserveInfo, IReserveInfoWrapper } from "../types";
import { SOLEND_LENDING_MARKET_ID_ALL, SOLEND_LENDING_MARKET_ID_MAIN_POOL, SOLEND_PROGRAM_ID } from "./ids";
import { COLLATERAL_LAYOUT, LOAN_LAYOUT, OBLIGATION_LAYOUT, RESERVE_LAYOUT } from "./layouts";
import { getSlndPrice, isMining } from "./utils";
import { getTokenList, IServicesTokenInfo } from "../utils";
// @ts-ignore
import { seq } from "buffer-layout";
import axios from "axios";

<<<<<<< HEAD
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// TODO: Implement InstanceSolend

let infos: IInstanceMoneyMarket;

infos = class InstanceSolend {
  static async getAllReserves(connection: Connection, marketId?: PublicKey): Promise<IReserveInfo[]> {
    return [];
  }

  static async getAllReserveWrappers(connection: Connection, marketId?: PublicKey): Promise<IReserveInfoWrapper[]> {
    return [];
  }

  static async getReserve(connection: Connection, reserveId: PublicKey): Promise<IReserveInfo> {
    return {} as IReserveInfo;
  }

  static parseReserve(data: Buffer, reserveId: PublicKey): IReserveInfo {
    return {} as IReserveInfo;
  }

  static async getAllObligations(connection: Connection, userKey: PublicKey): Promise<IObligationInfo[]> {
    return [];
  }

  static async getObligation(
    connection: Connection,
    obligationId: PublicKey,
    version?: number
  ): Promise<IObligationInfo> {
    return {} as IObligationInfo;
  }

  static parseObligation(data: Buffer, obligationId: PublicKey): IObligationInfo {
    return {} as IObligationInfo;
  }
};

export { infos };

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

=======
>>>>>>> d4be266 (Add infos instance for Solend & Lifinity/ Refactor solend ParnerReward & Obligation)
export const RESERVE_LAYOUT_SPAN = 619;

export const SLND_PER_YEAR = new BN(10e6);

export function MINING_MULTIPLIER(reserve: PublicKey) {
  switch (reserve.toString()) {
    case "CviGNzD2C9ZCMmjDt5DKCce5cLV4Emrcm3NFvwudBFKA":
      return new BN(2).mul(SLND_PER_YEAR).divn(24);
    case "5sjkv6HD8wycocJ4tC4U36HHbvgcXYqcyiPRUkncnwWs":
      return new BN(1).mul(SLND_PER_YEAR).divn(24);
    case "CCpirWrgNuBVLdkP2haxLTbD6XqEgaYuVXixbbpxUB6":
      return new BN(1).mul(SLND_PER_YEAR).divn(24);
    default:
      return new BN(0);
  }
}

export function BORROWING_MULTIPLIER(reserve: PublicKey) {
  // https://docs.solend.fi/protocol/liquidity-mining
  switch (reserve.toString()) {
    case "8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36": // SOL
      return new BN(6).mul(SLND_PER_YEAR).divn(24);
    case "BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw": // USDC
      return new BN(9).mul(SLND_PER_YEAR).divn(24);
    case "8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE": // USDT
      return new BN(4).mul(SLND_PER_YEAR).divn(24);
    default:
      return new BN(0);
  }
}

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

let infos: IInstanceMoneyMarket;

infos = class InstanceSolend {
  // Returns ReserveInfos w/ partnerRewardData
  static async getAllReserves(
    connection: Connection,
    marketId?: PublicKey
  ): Promise<ReserveInfo[]> {
    const dataSizeFilters: DataSizeFilter = {
      dataSize: RESERVE_LAYOUT_SPAN,
    };

    let filters: any[] = [dataSizeFilters];
    if (marketId) {
      const programIdMemcmp: MemcmpFilter = {
        memcmp: {
          //offset 10 byte
          offset: 10,
          bytes: marketId.toString(),
        },
      };
      filters = [programIdMemcmp, dataSizeFilters];
    }

    const config: GetProgramAccountsConfig = { filters: filters };
    const reserveAccounts = await connection.getProgramAccounts(
      SOLEND_PROGRAM_ID,
      config
    );
    let reserves = [] as ReserveInfo[];
    for (let account of reserveAccounts) {
      let info = this.parseReserve(account.account.data, account.pubkey);
      reserves.push(info);
    }

    const allPartnersRewardData: ISolendAPIPartnerReward[] = await (
      await axios.get(
        "https://api.solend.fi/liquidity-mining/external-reward-stats-v2?flat=true"
      )
    ).data;
    const tokenList = await getTokenList();

    const reserveWithPartnerRewardData = reserves.map((reserve) => {
      const wrapper = new ReserveInfoWrapper(reserve);

      let partnerRewards =
        allPartnersRewardData.filter(
          (item) =>
            item.tokenMint === wrapper.supplyTokenMint().toBase58() &&
            wrapper.reserveInfo.reserveId.toBase58() === item.reserveID
        ) ?? null;

      let price = tokenList.find(
        (t) => t.mint === wrapper.supplyTokenMint().toBase58()
      )?.price;
      let partnerRewardData: IPartnerReward[] | null = null;

      const poolTotalSupply =
        Number(wrapper.supplyAmount()) /
        10 ** Number(wrapper.supplyTokenDecimal());
      const poolTotalSupplyValue = poolTotalSupply * price!;

      if (partnerRewards.length > 0) {
        partnerRewardData = partnerRewards
          .map((r) => {
            const rewardRate = r.rewardRates.slice(-1)[0].rewardRate;
            const rewardToken = tokenList.find((t) => t.mint === r.rewardMint);
            if (rewardToken) {
              const rewardTokenPrice = rewardToken.price;
              return {
                rewardToken,
                rate: Number(
                  (
                    ((rewardRate * rewardTokenPrice) /
                      poolTotalSupplyValue /
                      10 ** 36) *
                    100
                  ).toFixed(2)
                ),
                side: r.side,
              } as IPartnerReward;
            }
          })
          .filter((p) => p) as IPartnerReward[];
      } else {
        partnerRewardData = null;
      }
      return { ...reserve, partnerRewardData };
    });

    return reserveWithPartnerRewardData;
  }
  // Returns ReserveInfo w/o partnerRewardData
  static async getReserve(
    connection: Connection,
    reserveId: PublicKey
  ): Promise<ReserveInfo> {
    const reserveAccountInfo = await connection.getAccountInfo(reserveId);
    if (!reserveAccountInfo)
      throw Error(`Cannot get reserveId ${reserveId} Account data `);
    return this.parseReserve(reserveAccountInfo?.data, reserveId);
  }
  // Returns ReserveInfo w/o partnerRewardData
  static parseReserve(data: Buffer, reserveId: PublicKey): ReserveInfo {
    const decodedData = RESERVE_LAYOUT.decode(data);
    let { version, lastUpdate, lendingMarket, liquidity, collateral, config } =
      decodedData;
    return {
      reserveId,
      version,
      lastUpdate,
      lendingMarket,
      liquidity,
      collateral,
      config,
      partnerRewardData: null,
    };
  }

  static async getAllObligations(
    connection: Connection,
    userKey: PublicKey
  ): Promise<ObligationInfo[]> {
    let allObligationAddress: PublicKey[] = [];
    let allObligationInfos: ObligationInfo[] = [];
    for (let lendingMarket of SOLEND_LENDING_MARKET_ID_ALL) {
      allObligationAddress.push(
        await getObligationPublicKey(userKey, lendingMarket)
      );
    }
    let allAccountInfo = await connection.getMultipleAccountsInfo(
      allObligationAddress
    );

    allAccountInfo.map((accountInfo, index) => {
      if (accountInfo?.owner.equals(SOLEND_PROGRAM_ID)) {
        let obligationInfo = this.parseObligation(
          accountInfo.data,
          allObligationAddress[index]
        );
        allObligationInfos.push(obligationInfo);
      }
    });
    return allObligationInfos;
  }

  static async getObligation(
    connection: Connection,
    obligationId: PublicKey,
    version?: number
  ): Promise<ObligationInfo> {
    let accountInfo = await connection.getAccountInfo(obligationId);
    if (accountInfo?.owner.equals(SOLEND_PROGRAM_ID)) {
      let obligationInfo = this.parseObligation(
        accountInfo?.data,
        obligationId
      ) as ObligationInfo;
      return obligationInfo;
    } else {
      return defaultObligationWrapper.obligationInfo;
    }
  }

  static parseObligation(
    data: Buffer,
    obligationId: PublicKey
  ): ObligationInfo {
    let dataBuffer = data as Buffer;
    let decodedInfo = OBLIGATION_LAYOUT.decode(dataBuffer);
    let {
      version,
      lastUpdate,
      lendingMarket,
      owner,
      depositedValue,
      borrowedValue,
      allowedBorrowValue,
      unhealthyBorrowValue,
      depositsLen,
      borrowsLen,
      dataFlat,
    } = decodedInfo;

    const depositsBuffer = dataFlat.slice(
      0,
      depositsLen * COLLATERAL_LAYOUT.span
    );
    const obligationCollaterals = seq(COLLATERAL_LAYOUT, depositsLen).decode(
      depositsBuffer
    ) as ObligationCollateral[];

    const borrowsBuffer = dataFlat.slice(
      depositsBuffer.length,
      depositsLen * COLLATERAL_LAYOUT.span + borrowsLen * LOAN_LAYOUT.span
    );
    const obligationLoans = seq(LOAN_LAYOUT, borrowsLen).decode(
      borrowsBuffer
    ) as ObligationLoan[];

    const obligationInfo = {
      version,
      lastUpdate,
      lendingMarket,
      owner,
      depositedValue,
      borrowedValue,
      allowedBorrowValue,
      unhealthyBorrowValue,
      obligationCollaterals,
      obligationLoans,
      obligationId,
    } as ObligationInfo;

    return obligationInfo;
  }
};

export { infos };

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// Obligation related types
//all from https://docs.solend.fi/protocol/addresses
<<<<<<< HEAD

interface ReserveConfig {
  optimalUtilizationRate: BN;
  loanToValueRatio: BN;
  liquidationBonus: BN;
  liquidationThreshold: BN;
  minBorrowRate: BN;
  optimalBorrowRate: BN;
  maxBorrowRate: BN;
  fees: ReserveFees;
  depositLimit: BN;
  borrowLimit: BN;
  feeReceiver: PublicKey;
}

interface ReserveCollateral {
  reserveTokenMint: PublicKey;
  mintTotalSupply: BN;
  supplyPubkey: PublicKey;
}

interface ReserveLiquidity {
  mintPubkey: PublicKey;
  mintDecimals: BN;
  supplyPubkey: PublicKey;
  pythOraclePubkey: PublicKey;
  switchboardOraclePubkey: PublicKey;
  availableAmount: BN;
  borrowedAmountWads: BN;
  cumulativeBorrowRateWads: BN;
  marketPrice: BN;
}

interface ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
}

interface IPartnerReward {
  rewardToken: IServicesTokenInfo;
  rate: number;
  side: string;
}

export interface ReserveInfo extends IReserveInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
}

export interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

export function parseReserveData(data: any, pubkey: PublicKey): ReserveInfo {
  const decodedData = RESERVE_LAYOUT.decode(data);
  let { version, lastUpdate, lendingMarket, liquidity, collateral, config } = decodedData;
  return {
    reserveId: pubkey,
    version,
    lastUpdate,
    lendingMarket,
    liquidity,
    collateral,
    config,
  };
}

=======
>>>>>>> d4be266 (Add infos instance for Solend & Lifinity/ Refactor solend ParnerReward & Obligation)
export class ReserveInfoWrapper implements IReserveInfoWrapper {
  // TODO: will be empty partnerReward when init class directly (can only be got from getAllReserveWrapper). Needs refactor.
  // CONCERN: Increasing Solend API querying (internet traffic)
  // partnerRewardData: IPartnerReward[] | null = null;
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

  supplyLimit() {
    return this.reserveInfo.config.depositLimit;
  }

  async isMining() {
    await isMining(this.reserveInfo.reserveId);
  }

  supplyAmount() {
    let borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(new BN(`1${"".padEnd(18, "0")}`));
    let availableAmount = this.reserveInfo.liquidity.availableAmount;
    return borrowedAmount.add(availableAmount);
  }

  async miningApy(connection: Connection): Promise<number> {
    let miningApy = 0;
    let decimal = Number(new BN(this.reserveInfo.liquidity.mintDecimals));
    if (MINING_MULTIPLIER(this.reserveInfo.reserveId).eq(new BN(0))) {
      miningApy = 0;
    } else {
      let slndPrice = await getSlndPrice(connection);
      let slndPerYear = MINING_MULTIPLIER(this.reserveInfo.reserveId).div(new BN(`1${"".padEnd(3, "0")}`));

      let supplyUSDValue = this.supplyAmount()
        .div(new BN(`1${"".padEnd(decimal, "0")}`))
        .mul(this.reserveInfo.liquidity.marketPrice)
        .div(new BN(`1${"".padEnd(18, "0")}`));

      miningApy = Number(slndPerYear.mul(slndPrice)) / Number(supplyUSDValue);
    }
    return miningApy;
  }

  async calculateBorrowMiningApy(connection: Connection): Promise<number> {
    let borrowingApy = 0;
    let decimal = Number(new BN(this.reserveInfo.liquidity.mintDecimals));
    if (BORROWING_MULTIPLIER(this.reserveInfo.reserveId).eq(new BN(0))) {
      borrowingApy = 0;
    } else {
      let slndPrice = await getSlndPrice(connection);
      let slndPerYear = BORROWING_MULTIPLIER(this.reserveInfo.reserveId).div(new BN(`1${"".padEnd(3, "0")}`));
      let borrowUSDValue = this.supplyAmount()
        .sub(this.reserveInfo.liquidity.availableAmount) // supplyAmt - avaiableAmt = borrowAmt
        .div(new BN(`1${"".padEnd(decimal, "0")}`))
        .mul(this.reserveInfo.liquidity.marketPrice)
        .div(new BN(`1${"".padEnd(18, "0")}`));
      borrowingApy = (Number(slndPerYear.mul(slndPrice)) * 0.9) / Number(borrowUSDValue);
    }
    return borrowingApy;
  }

  calculateUtilizationRatio() {
    const borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(new BN(`1${"".padEnd(18, "0")}`));
    const totalAmount = this.reserveInfo.liquidity.availableAmount.add(borrowedAmount);
    const currentUtilization = Number(borrowedAmount) / Number(totalAmount);
    return currentUtilization;
  }

  calculateBorrowAPY() {
    const currentUtilization = this.calculateUtilizationRatio();
    const optimalUtilization = Number(new BN(this.reserveInfo.config.optimalUtilizationRate)) / 100;
    let borrowAPY;
    if (optimalUtilization === 1.0 || currentUtilization < optimalUtilization) {
      const normalizedFactor = currentUtilization / optimalUtilization;
      const optimalBorrowRate = Number(new BN(this.reserveInfo.config.optimalBorrowRate)) / 100;
      const minBorrowRate = Number(new BN(this.reserveInfo.config.minBorrowRate)) / 100;
      borrowAPY = normalizedFactor * (optimalBorrowRate - minBorrowRate) + minBorrowRate;
    } else {
      const normalizedFactor = (currentUtilization - optimalUtilization) / (1 - optimalUtilization);
      const optimalBorrowRate = Number(new BN(this.reserveInfo.config.optimalBorrowRate)) / 100;
      const maxBorrowRate = Number(new BN(this.reserveInfo.config.maxBorrowRate)) / 100;
      borrowAPY = normalizedFactor * (maxBorrowRate - optimalBorrowRate) + optimalBorrowRate;
    }

    return borrowAPY;
  }

  supplyApy() {
    let UtilizationRatio = this.calculateUtilizationRatio();
    let borrowAPY = this.calculateBorrowAPY() as number;
    return UtilizationRatio * borrowAPY;
  }
  convertReserveAmountToLiquidityAmount(reserveAmount: BN) {
    return reserveAmount.mul(this.supplyAmount()).div(this.reserveTokenSupply());
  }

  convertLiquidityAmountToReserveAmount(liquidityAmount: BN) {
    return liquidityAmount.mul(this.reserveTokenSupply()).div(this.supplyAmount());
  }
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
  depositLimit: BN;
  borrowLimit: BN;
  feeReceiver: PublicKey;
}

interface ReserveCollateral {
  reserveTokenMint: PublicKey;
  mintTotalSupply: BN;
  supplyPubkey: PublicKey;
}

interface ReserveLiquidity {
  mintPubkey: PublicKey;
  mintDecimals: BN;
  supplyPubkey: PublicKey;
  pythOraclePubkey: PublicKey;
  switchboardOraclePubkey: PublicKey;
  availableAmount: BN;
  borrowedAmountWads: BN;
  cumulativeBorrowRateWads: BN;
  marketPrice: BN;
}

interface ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
}

interface ISolendAPIPartnerReward {
  rewardsPerShare: string;
  totalBalance: string;
  lastSlot: number;
  side: string;
  tokenMint: string;
  reserveID: string;
  market: string;
  mint: string;
  rewardMint: string;
  rewardSymbol: string;
  rewardRates: {
    beginningSlot: number;
    rewardRate: number;
    name: 0;
  }[];
}

<<<<<<< HEAD
export async function getAllReserveWrappers(connection: Connection) {
  const allReserves = await getAllReserves(connection);
  const allPartnersRewardData: ISolendAPIPartnerReward[] = await (
    await axios.get("https://api.solend.fi/liquidity-mining/external-reward-stats-v2?flat=true")
  ).data;
  const tokenList = await getTokenList();

  let reserveInfoWrappers = [] as ReserveInfoWrapper[];
  for (let reservesMeta of allReserves) {
    const newInfo = new ReserveInfoWrapper(reservesMeta);

    let partnerRewards =
      allPartnersRewardData.filter(
        (item) =>
          item.tokenMint === newInfo.supplyTokenMint().toBase58() &&
          newInfo.reserveInfo.reserveId.toBase58() === item.reserveID
      ) ?? null;

    let price = tokenList.find((t) => t.mint === newInfo.supplyTokenMint().toBase58())?.price;
    let partnerRewardData: IPartnerReward[] | null = null;

    const poolTotalSupply = Number(newInfo.supplyAmount()) / 10 ** Number(newInfo.supplyTokenDecimal());
    const poolTotalSupplyValue = poolTotalSupply * price!;

    if (partnerRewards.length > 0) {
      partnerRewardData = partnerRewards
        .map((r) => {
          const rewardRate = r.rewardRates.slice(-1)[0].rewardRate;
          const rewardToken = tokenList.find((t) => t.mint === r.rewardMint);
          if (rewardToken) {
            const rewardTokenPrice = rewardToken.price;
            return {
              rewardToken,
              rate: Number((((rewardRate * rewardTokenPrice) / poolTotalSupplyValue / 10 ** 36) * 100).toFixed(2)),
              side: r.side,
            } as IPartnerReward;
          }
        })
        .filter((p) => p) as IPartnerReward[];
    } else {
      partnerRewardData = null;
    }
    newInfo.partnerRewardData = partnerRewardData;
    reserveInfoWrappers.push(newInfo);
  }

  return reserveInfoWrappers;
}

async function getAllReserves(connection: Connection, lendingMarket?: PublicKey) {
  const dataSizeFilters: DataSizeFilter = {
    dataSize: RESERVE_LAYOUT_SPAN,
  };

  let filters: any[] = [dataSizeFilters];
  if (lendingMarket) {
    const programIdMemcmp: MemcmpFilter = {
      memcmp: {
        //offset 10 byte
        offset: 10,
        bytes: lendingMarket.toString(),
      },
    };
    filters = [programIdMemcmp, dataSizeFilters];
  }

  const config: GetProgramAccountsConfig = { filters: filters };
  const reserveAccounts = await connection.getProgramAccounts(SOLEND_PROGRAM_ID, config);
  let reserves = [] as ReserveInfo[];
  for (let account of reserveAccounts) {
    let info = parseReserveData(account.account.data, account.pubkey);
    reserves.push(info);
  }

  return reserves;
}

export async function getReserve(connection: Connection, reserveId: PublicKey): Promise<ReserveInfo> {
  const reserveAccountInfo = await connection.getAccountInfo(reserveId);
  return parseReserveData(reserveAccountInfo?.data, reserveId);
}

export async function getObligation(
  connection: Connection,
  wallet: PublicKey,
  lendingMarket = SOLEND_LENDING_MARKET_ID_MAIN_POOL
) {
  let obligationAddress = await getObligationPublicKey(wallet, lendingMarket);
  let accountInfo = await connection.getAccountInfo(obligationAddress);
  if (accountInfo?.owner.equals(SOLEND_PROGRAM_ID)) {
    let obligationInfo = parseObligationData(accountInfo?.data);
    return obligationInfo;
  } else {
    return defaultObligation();
  }
}

export async function getAllObligation(connection: Connection, wallet: PublicKey) {
  let allObligationAddress: PublicKey[] = [];
  let allObligationInfoWrapper: ObligationInfoWrapper[] = [];
  for (let lendingMarket of SOLEND_LENDING_MARKET_ID_ALL) {
    allObligationAddress.push(await getObligationPublicKey(wallet, lendingMarket));
  }
  let allAccountInfo = await connection.getMultipleAccountsInfo(allObligationAddress);

  allAccountInfo.map((accountInfo) => {
    if (accountInfo?.owner.equals(SOLEND_PROGRAM_ID)) {
      let obligationInfo = parseObligationData(accountInfo?.data);
      allObligationInfoWrapper.push(obligationInfo);
    }
  });

  return allObligationInfoWrapper;
}

interface ObligationCollateral {
  reserveId: PublicKey;
  depositedAmount: BN;
  marketValue: BN;
}

interface ObligationLoan {
  reserveId: PublicKey;
  cumulativeBorrowRate: BN;
  borrowedAmount: BN;
  marketValue: BN;
}

export interface ObligationInfo {
=======
interface IPartnerReward {
  rewardToken: IServicesTokenInfo;
  rate: number;
  side: string;
}

export interface ReserveInfo extends IReserveInfo {
>>>>>>> d4be266 (Add infos instance for Solend & Lifinity/ Refactor solend ParnerReward & Obligation)
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
  partnerRewardData: IPartnerReward[] | null;
}

<<<<<<< HEAD
export async function getObligationPublicKey(wallet: PublicKey, lendingMarket = SOLEND_LENDING_MARKET_ID_MAIN_POOL) {
=======
export interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

// Obligation related methods

export async function getObligationPublicKey(
  wallet: PublicKey,
  lendingMarket = SOLEND_LENDING_MARKET_ID_MAIN_POOL
) {
>>>>>>> d4be266 (Add infos instance for Solend & Lifinity/ Refactor solend ParnerReward & Obligation)
  const seed = lendingMarket.toString().slice(0, 32);
  const obligationAddress = await PublicKey.createWithSeed(wallet, seed, SOLEND_PROGRAM_ID);
  return obligationAddress;
}

export async function getLendingMarketAuthority(lendingMarket: PublicKey): Promise<PublicKey> {
  const authority = (await PublicKey.findProgramAddress([lendingMarket.toBuffer()], SOLEND_PROGRAM_ID))[0];

  return authority;
}

export async function obligationCreated(connection: Connection, wallet: PublicKey) {
  let obligationInfo = await connection.getAccountInfo(await getObligationPublicKey(wallet));
  if (obligationInfo?.owner.equals(SOLEND_PROGRAM_ID)) {
    return true;
  }
  return false;
}

// Obligation related types
export class ObligationInfoWrapper {
  constructor(public obligationInfo: ObligationInfo) {}

  update(reserveInfos: ReserveInfoWrapper[]) {
    let unhealthyBorrowValue = new BN(0);
    let borrowedValue = new BN(0);
    let depositedValue = new BN(0);
    for (let depositedReserve of this.obligationInfo.obligationCollaterals) {
      for (let reserveInfoWrapper of reserveInfos) {
        if (depositedReserve.reserveId.equals(reserveInfoWrapper.reserveInfo.reserveId)) {
          let decimal = Number(new BN(reserveInfoWrapper.reserveTokenDecimal()));
          let thisDepositedValue = depositedReserve.depositedAmount
            .mul(reserveInfoWrapper.supplyAmount())
            .mul(reserveInfoWrapper.reserveInfo.liquidity.marketPrice)
            .div(reserveInfoWrapper.reserveInfo.collateral.mintTotalSupply)
            .div(new BN(`1${"".padEnd(decimal, "0")}`));
          depositedValue = depositedValue.add(thisDepositedValue);

          let thisUnhealthyBorrowValue = new BN(reserveInfoWrapper.reserveInfo.config.liquidationThreshold)
            .mul(thisDepositedValue)
            .div(new BN(`1${"".padEnd(2, "0")}`));
          unhealthyBorrowValue = unhealthyBorrowValue.add(thisUnhealthyBorrowValue);
        }
      }
    }

    for (let borrowedReserve of this.obligationInfo.obligationLoans) {
      for (let reserveInfoWrapper of reserveInfos) {
        if (borrowedReserve.reserveId.equals(reserveInfoWrapper.reserveInfo.reserveId)) {
          let decimal = Number(new BN(reserveInfoWrapper.reserveTokenDecimal()));
          let thisborrowedValue = borrowedReserve.borrowedAmount
            .mul(reserveInfoWrapper.reserveInfo.liquidity.marketPrice)
            .div(new BN(`1${"".padEnd(decimal, "0")}`));
          borrowedValue = borrowedValue.add(thisborrowedValue);
        }
      }
    }

    this.obligationInfo.borrowedValue = borrowedValue;
    this.obligationInfo.depositedValue = depositedValue;
    this.obligationInfo.unhealthyBorrowValue = unhealthyBorrowValue;
  }

<<<<<<< HEAD
  getRefreshedBorrowLimit(reserves: ReserveInfoWrapper[], tokenList: IServicesTokenInfo[]) {
    const limits = this.obligationCollaterals.map((deposit) => {
      const reserve = reserves.find((r) => r.reserveInfo.reserveId.equals(deposit.reserveId));
      const supplyToken = tokenList.find((t) => t.mint === reserve?.supplyTokenMint().toBase58());
=======
  getRefreshedBorrowLimit(
    reserves: ReserveInfoWrapper[],
    tokenList: IServicesTokenInfo[]
  ) {
    const limits = this.obligationInfo.obligationCollaterals.map((deposit) => {
      const reserve = reserves.find((r) =>
        r.reserveInfo.reserveId.equals(deposit.reserveId)
      );
      const supplyToken = tokenList.find(
        (t) => t.mint === reserve?.supplyTokenMint().toBase58()
      );
>>>>>>> d4be266 (Add infos instance for Solend & Lifinity/ Refactor solend ParnerReward & Obligation)
      if (!reserve || !supplyToken) return 0;
      const depositAmount = reserve.convertReserveAmountToLiquidityAmount(deposit.depositedAmount);
      const amt = Number(depositAmount) / 10 ** Number(reserve.reserveInfo.liquidity.mintDecimals);
      return amt * supplyToken.price * (Number(reserve?.reserveInfo.config.loanToValueRatio) / 100);
    });
    return limits.length > 0 ? limits.reduce((a, b) => a + b) : 0;
  }
}

<<<<<<< HEAD
export function parseObligationData(data: any) {
  let dataBuffer = data as Buffer;
  let decodedInfo = OBLIGATION_LAYOUT.decode(dataBuffer);
  let {
    version,
    lastUpdate,
    lendingMarket,
    owner,
    depositedValue,
    borrowedValue,
    allowedBorrowValue,
    unhealthyBorrowValue,
    depositsLen,
    borrowsLen,
    dataFlat,
  } = decodedInfo;

  const depositsBuffer = dataFlat.slice(0, depositsLen * COLLATERAL_LAYOUT.span);
  const depositCollaterals = seq(COLLATERAL_LAYOUT, depositsLen).decode(depositsBuffer) as ObligationCollateral[];

  const borrowsBuffer = dataFlat.slice(
    depositsBuffer.length,
    depositsLen * COLLATERAL_LAYOUT.span + borrowsLen * LOAN_LAYOUT.span
  );
  const borrowLoans = seq(LOAN_LAYOUT, borrowsLen).decode(borrowsBuffer) as ObligationLoan[];

  const obligationInfo = {
    version,
    lastUpdate,
    lendingMarket,
    owner,
    depositedValue,
    borrowedValue,
    allowedBorrowValue,
    unhealthyBorrowValue,
  } as ObligationInfo;

  const obligationInfoWrapper = new ObligationInfoWrapper(obligationInfo, depositCollaterals, borrowLoans);

  return obligationInfoWrapper;
=======
export interface ObligationInfo extends IObligationInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  owner: PublicKey;
  depositedValue: BN;
  borrowedValue: BN;
  allowedBorrowValue: BN;
  unhealthyBorrowValue: BN;
  obligationCollaterals: ObligationCollateral[];
  obligationLoans: ObligationLoan[];
>>>>>>> d4be266 (Add infos instance for Solend & Lifinity/ Refactor solend ParnerReward & Obligation)
}

interface ObligationCollateral {
  reserveId: PublicKey;
  depositedAmount: BN;
  marketValue: BN;
}

interface ObligationLoan {
  reserveId: PublicKey;
  cumulativeBorrowRate: BN;
  borrowedAmount: BN;
  marketValue: BN;
}

export const defaultObligationWrapper = new ObligationInfoWrapper({
  version: new BN(1),
  lastUpdate: { lastUpdatedSlot: new BN(0), stale: false },
  lendingMarket: PublicKey.default,
  owner: PublicKey.default,
  depositedValue: new BN(0),
  borrowedValue: new BN(0),
  allowedBorrowValue: new BN(0),
  unhealthyBorrowValue: new BN(0),
  obligationCollaterals: [] as ObligationCollateral[],
  obligationLoans: [] as ObligationLoan[],
} as ObligationInfo);

// Deprecated
export const MINING_RESERVES = [] as PublicKey[];
