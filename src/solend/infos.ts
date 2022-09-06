import { Connection, PublicKey, GetProgramAccountsConfig, MemcmpFilter, DataSizeFilter } from "@solana/web3.js";
import BN from "bn.js";
import { IInstanceMoneyMarket, IObligationInfo, IReserveInfo, IReserveInfoWrapper } from "../types";
import { SOLEND_LENDING_MARKET_ID_ALL, SOLEND_LENDING_MARKET_ID_MAIN_POOL, SOLEND_PROGRAM_ID } from "./ids";
import { COLLATERAL_LAYOUT, LOAN_LAYOUT, OBLIGATION_LAYOUT, RESERVE_LAYOUT } from "./layouts";
import { ApiEndpoints, getSlndPrice, isMining } from "./utils";
import { getTokenList, IServicesTokenInfo } from "../utils";
// @ts-ignore
import { seq } from "buffer-layout";
import axios from "axios";

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

let infos: IInstanceMoneyMarket;

infos = class InstanceSolend {
  // Returns ReserveInfos w/ partnerRewardData
  static async getAllReserves(connection: Connection, marketId?: PublicKey): Promise<ReserveInfo[]> {
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
    const reserveAccounts = await connection.getProgramAccounts(SOLEND_PROGRAM_ID, config);

    const reserves = reserveAccounts.map((account) => this.parseReserve(account.account.data, account.pubkey));

    const allPartnersRewardData: ISolendAPIPartnerReward[] = (await axios.get(ApiEndpoints.partnerReward)).data;
    const tokenList = await getTokenList();

    const reserveWithPartnerRewardData = reserves.map((reserve) => {
      const wrapper = new ReserveInfoWrapper(reserve);

      let partnerRewards = allPartnersRewardData.filter(
        (item) =>
          item.tokenMint === wrapper.supplyTokenMint().toBase58() &&
          wrapper.reserveInfo.reserveId.toBase58() === item.reserveID
      );

      let price = tokenList.find((t) => t.mint === wrapper.supplyTokenMint().toBase58())?.price;
      let partnerRewardData: IPartnerReward[] = [];

      const poolTotalSupply = Number(wrapper.supplyAmount()) / 10 ** Number(wrapper.supplyTokenDecimal());
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
        partnerRewardData = [];
      }
      return { ...reserve, partnerRewardData };
    });

    return reserveWithPartnerRewardData;
  }
  // Returns ReserveInfo w/o partnerRewardData
  static async getReserve(connection: Connection, reserveId: PublicKey): Promise<ReserveInfo> {
    const reserveAccountInfo = await connection.getAccountInfo(reserveId);
    if (!reserveAccountInfo) throw Error(`Cannot get reserveId ${reserveId} Account data `);
    return this.parseReserve(reserveAccountInfo?.data, reserveId);
  }
  // Returns ReserveInfo w/o partnerRewardData
  static parseReserve(data: Buffer, reserveId: PublicKey): ReserveInfo {
    const decodedData = RESERVE_LAYOUT.decode(data);
    let { version, lastUpdate, lendingMarket, liquidity, collateral, config } = decodedData;
    return {
      reserveId,
      version,
      lastUpdate,
      lendingMarket,
      liquidity,
      collateral,
      config,
      partnerRewardData: [],
    };
  }

  static async getAllObligations(connection: Connection, userKey: PublicKey): Promise<ObligationInfo[]> {
    const obligationKeys = await Promise.all(
      SOLEND_LENDING_MARKET_ID_ALL.map(async (lendingMarket) => await getObligationPublicKey(userKey, lendingMarket))
    );
    const obligationAccounts = await connection.getMultipleAccountsInfo(obligationKeys);
    const obligationInfos = obligationAccounts
      .filter((accountInfo) => accountInfo)
      .map((accountInfo, index) => {
        return this.parseObligation(accountInfo!.data, obligationKeys[index]);
      });
    return obligationInfos;
  }

  static async getObligation(
    connection: Connection,
    obligationId: PublicKey,
    version?: number
  ): Promise<ObligationInfo> {
    let accountInfo = await connection.getAccountInfo(obligationId);
    return accountInfo?.owner.equals(SOLEND_PROGRAM_ID)
      ? this.parseObligation(accountInfo?.data, obligationId)
      : defaultObligationWrapper.obligationInfo;
  }

  static parseObligation(data: Buffer, obligationId: PublicKey): ObligationInfo {
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
    const obligationCollaterals = seq(COLLATERAL_LAYOUT, depositsLen).decode(depositsBuffer) as ObligationCollateral[];

    const borrowsBuffer = dataFlat.slice(
      depositsBuffer.length,
      depositsLen * COLLATERAL_LAYOUT.span + borrowsLen * LOAN_LAYOUT.span
    );
    const obligationLoans = seq(LOAN_LAYOUT, borrowsLen).decode(borrowsBuffer);

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

// Obligation related types
//all from https://docs.solend.fi/protocol/addresses
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
  partnerRewardData: IPartnerReward[];
}

export interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

// Obligation related methods

export async function getObligationPublicKey(wallet: PublicKey, lendingMarket = SOLEND_LENDING_MARKET_ID_MAIN_POOL) {
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

  getRefreshedBorrowLimit(reserves: ReserveInfoWrapper[], tokenList: IServicesTokenInfo[]) {
    const limits = this.obligationInfo.obligationCollaterals.map((deposit) => {
      const reserve = reserves.find((r) => r.reserveInfo.reserveId.equals(deposit.reserveId));
      const supplyToken = tokenList.find((t) => t.mint === reserve?.supplyTokenMint().toBase58());
      if (!reserve || !supplyToken) return 0;
      const depositAmount = reserve.convertReserveAmountToLiquidityAmount(deposit.depositedAmount);
      const amt = Number(depositAmount) / 10 ** Number(reserve.reserveInfo.liquidity.mintDecimals);
      return amt * supplyToken.price * (Number(reserve?.reserveInfo.config.loanToValueRatio) / 100);
    });
    return limits.length > 0 ? limits.reduce((a, b) => a + b) : 0;
  }
}

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
