import { Connection, PublicKey, GetProgramAccountsConfig, MemcmpFilter, DataSizeFilter } from "@solana/web3.js";
import BN from "bn.js";
import { IInstanceMoneyMarket, IObligationInfo, IReserveInfo, IReserveInfoWrapper } from "../types";
import {
  SLND_PRICE_ORACLE,
  SOLEND_LENDING_MARKET_ID_ALL,
  SOLEND_LENDING_MARKET_ID_MAIN_POOL,
  SOLEND_PROGRAM_ID,
} from "./ids";
import { COLLATERAL_LAYOUT, LOAN_LAYOUT, OBLIGATION_LAYOUT, RESERVE_LAYOUT } from "./layouts";
import { getMultipleAccounts, getTokenList, IServicesTokenInfo } from "../utils";
// @ts-ignore
import { seq } from "buffer-layout";
import axios from "axios";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api";
import * as types from ".";

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
  static async getAllReserveWrappers(connection: Connection, marketId?: PublicKey): Promise<ReserveInfoWrapper[]> {
    const reserves = await this.getAllReserves(connection, marketId);
    return reserves.map((reserve) => new ReserveInfoWrapper(reserve));
  }
  // Returns ReserveInfos w/ partnerRewardData
  static async getAllReserves(connection: Connection, marketId?: PublicKey): Promise<types.ReserveInfo[]> {
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

    const allPartnersRewardData: types.ISolendAPIPartnerReward[] = (await axios.get(ApiEndpoints.partnerReward)).data;
    const tokenList = await getTokenList();

    const reserveWithPartnerRewardData = reserves.map((reserve) => {
      let partnerRewards = allPartnersRewardData.filter(
        (item) =>
          item.tokenMint === reserve.liquidity.mintPubkey.toBase58() && reserve.reserveId.toBase58() === item.reserveID
      );

      let price = tokenList.find((t) => t.mint === reserve.liquidity.mintPubkey.toBase58())?.price;
      let partnerRewardData: types.IPartnerReward[] = [];

      const borrowedAmount = reserve.liquidity.borrowedAmountWads.div(new BN(`1${"".padEnd(18, "0")}`));
      const availableAmount = reserve.liquidity.availableAmount;
      const supplyAmount = borrowedAmount.add(availableAmount);
      const poolTotalSupply = Number(supplyAmount) / 10 ** Number(reserve.liquidity.mintDecimals);
      const poolTotalSupplyValue = poolTotalSupply * price!;

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
            } as types.IPartnerReward;
          }
        })
        .filter((p) => p) as types.IPartnerReward[];

      return { ...reserve, partnerRewardData };
    });

    return reserveWithPartnerRewardData;
  }
  // Returns ReserveInfo w/o partnerRewardData
  static async getReserve(connection: Connection, reserveId: PublicKey): Promise<types.ReserveInfo> {
    const reserveAccountInfo = await connection.getAccountInfo(reserveId);
    if (!reserveAccountInfo) throw Error(`Cannot get reserveId ${reserveId} Account data `);
    return this.parseReserve(reserveAccountInfo?.data, reserveId);
  }
  // Returns ReserveInfo w/o partnerRewardData
  static parseReserve(data: Buffer, reserveId: PublicKey): types.ReserveInfo {
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

  static async getAllObligations(connection: Connection, userKey: PublicKey): Promise<types.ObligationInfo[]> {
    const obligationKeys = await Promise.all(
      SOLEND_LENDING_MARKET_ID_ALL.map(async (marketId) => await this.getObligationId(marketId, userKey))
    );
    const obligationAccounts = await getMultipleAccounts(connection, obligationKeys);
    const obligationInfos = obligationAccounts
      .filter((accountInfo) => Boolean(accountInfo.account))
      .map((accountInfo, index) => {
        return this.parseObligation(accountInfo.account!.data, obligationKeys[index]);
      });
    return obligationInfos;
  }

  static async getObligation(
    connection: Connection,
    obligationId: PublicKey,
    version?: number
  ): Promise<types.ObligationInfo> {
    let accountInfo = await connection.getAccountInfo(obligationId);
    if (!accountInfo?.owner.equals(SOLEND_PROGRAM_ID)) throw Error("Error: Cannot find Obligation by this ID");
    return this.parseObligation(accountInfo.data, obligationId);
  }

  static parseObligation(data: Buffer, obligationId: PublicKey): types.ObligationInfo {
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
    const obligationCollaterals = seq(COLLATERAL_LAYOUT, depositsLen).decode(
      depositsBuffer
    ) as types.ObligationCollateral[];

    const borrowsBuffer = dataFlat.slice(
      depositsBuffer.length,
      depositsLen * COLLATERAL_LAYOUT.span + borrowsLen * LOAN_LAYOUT.span
    );
    const obligationLoans = seq(LOAN_LAYOUT, borrowsLen).decode(borrowsBuffer);

    return {
      userKey: owner,
      version,
      lastUpdate,
      lendingMarket,
      depositedValue,
      borrowedValue,
      allowedBorrowValue,
      unhealthyBorrowValue,
      obligationCollaterals,
      obligationLoans,
      obligationId,
    };
  }

  static async getObligationId(marketId: PublicKey, userKey: PublicKey) {
    const seed = marketId.toString().slice(0, 32);
    const obligationAddress = await PublicKey.createWithSeed(userKey, seed, SOLEND_PROGRAM_ID);
    return obligationAddress;
  }
};

export { infos };

//all from https://docs.solend.fi/protocol/addresses
export class ReserveInfoWrapper implements IReserveInfoWrapper {
  constructor(public reserveInfo: types.ReserveInfo) {}
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

  async getLendingMarketAuthority(): Promise<PublicKey> {
    const authority = (
      await PublicKey.findProgramAddress([this.reserveInfo.lendingMarket.toBuffer()], SOLEND_PROGRAM_ID)
    )[0];

    return authority;
  }
}

export async function checkObligationCreated(connection: Connection, userKey: PublicKey, marketId?: PublicKey) {
  let obligationInfo = await connection.getAccountInfo(
    await infos.getObligationId!(marketId ? marketId : SOLEND_LENDING_MARKET_ID_MAIN_POOL, userKey)
  );
  if (obligationInfo?.owner.equals(SOLEND_PROGRAM_ID)) {
    return true;
  }
  return false;
}

export class ObligationInfoWrapper {
  constructor(public obligationInfo: types.ObligationInfo) {}

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

async function getSlndPrice(connection: Connection) {
  let priceFeed = await parseAggregatorAccountData(connection, SLND_PRICE_ORACLE);
  let price = priceFeed.lastRoundResult?.result as number;
  return new BN(price * 1000);
}

enum ApiEndpoints {
  partnerReward = "https://api.solend.fi/liquidity-mining/external-reward-stats-v2?flat=true",
}
