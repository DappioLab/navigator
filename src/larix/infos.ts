import { Connection, DataSizeFilter, GetProgramAccountsConfig, MemcmpFilter, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as types from ".";
import { IFarmInfoWrapper, IInstanceFarm, IInstanceMoneyMarket, IReserveInfoWrapper } from "../types";
import {
  LARIX_BRIDGE_PROGRAM_ID,
  LARIX_MAIN_POOL_FARMER_SEED,
  LARIX_MARKET_ID_MAIN_POOL,
  LARIX_PROGRAM_ID,
  LDO_MINT,
  LDO_REWARD_RESERVE,
  MNDE_MINT,
  MNDE_REWARD_RESERVE,
} from "./ids";
import {
  COLLATERAL_LAYOUT,
  LOAN_LAYOUT,
  FARMER_INDEX_LAYOUT,
  FARMER_LAYOUT,
  OBLIGATION_LAYOUT,
  RESERVE_LAYOUT,
  ORACLE_BRIDGE_LAYOUT,
} from "./layouts";
// @ts-ignore
import { seq } from "buffer-layout";
import { struct, u64, u8, bool } from "@project-serum/borsh";
import { IServicesTokenInfo } from "../utils";

let infos: IInstanceMoneyMarket & IInstanceFarm;

infos = class InstanceLarix {
  static async getAllReserves(connection: Connection, marketId?: PublicKey): Promise<types.ReserveInfo[]> {
    const programIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 10,
        bytes: LARIX_MARKET_ID_MAIN_POOL.toString(),
      },
    };
    const dataSizeFilters: DataSizeFilter = {
      dataSize: RESERVE_LAYOUT_SPAN,
    };
    const filters = [programIdMemcmp, dataSizeFilters];
    const config: GetProgramAccountsConfig = { filters: filters };
    const reserveAccounts = await connection.getProgramAccounts(LARIX_PROGRAM_ID, config);
    const allBridgeInfo = await getAllOracleBridges(connection);

    return reserveAccounts.map((account) => {
      let info = this.parseReserve(account.account.data, account.pubkey);
      info.oracleBridgeInfo = allBridgeInfo.get(info.liquidity.OraclePubkey.toString());
      return info;
    });
  }

  static async getAllReserveWrappers(
    connection: Connection,
    marketId?: PublicKey
  ): Promise<types.ReserveInfoWrapper[]> {
    const allReserves = await this.getAllReserves(connection);
    return allReserves.map((reservesMeta) => new ReserveInfoWrapper(reservesMeta));
  }

  static async getReserve(connection: Connection, reserveId: PublicKey): Promise<types.ReserveInfo> {
    const reserveAccountInfo = await connection.getAccountInfo(reserveId);
    let reserveInfo = this.parseReserve(reserveAccountInfo?.data, reserveId);

    if (reserveInfo.isLP) {
      let bridgeAccountInfo = await connection.getAccountInfo(reserveInfo.liquidity.OraclePubkey);
      let bridgeInfo = parseOracleBridgeInfo(bridgeAccountInfo?.data, reserveInfo.liquidity.OraclePubkey);
      reserveInfo.oracleBridgeInfo = bridgeInfo;
    }
    return reserveInfo;
  }

  static parseReserve(data: Buffer | undefined, reserveId: PublicKey): types.ReserveInfo {
    const decodedData = RESERVE_LAYOUT.decode(data);
    let { version, lastUpdate, lendingMarket, liquidity, collateral, config, isLP } = decodedData;

    return {
      reserveId,
      version,
      lastUpdate,
      lendingMarket,
      liquidity,
      collateral,
      config,
      isLP: new BN(isLP).eqn(1),
    };
  }

  static async getAllObligations(connection: Connection, userKey: PublicKey): Promise<types.ObligationInfo[]> {
    const accountInfos = await connection.getProgramAccounts(LARIX_PROGRAM_ID, {
      filters: [
        {
          dataSize: OBLIGATION_LAYOUT.span,
        },
        {
          memcmp: {
            offset: u8("version").span + struct([u64("lastUpdatedSlot"), bool("stale")], "lastUpdate").span + 32,
            /** data to match, as base-58 encoded string and limited to less than 129 bytes */
            bytes: userKey.toBase58(),
          },
        },
      ],
    });

    return accountInfos
      .filter((item) => item.account.owner.equals(LARIX_PROGRAM_ID))
      .map((accountInfo) => {
        let obligationInfo = this.parseObligation(accountInfo?.account.data, accountInfo.pubkey);
        return obligationInfo;
      });
  }

  static async getObligation(
    connection: Connection,
    obligationId: PublicKey,
    version?: number
  ): Promise<types.ObligationInfo> {
    let obligationInfo = await connection.getAccountInfo(obligationId);
    return this.parseObligation(obligationInfo?.data, obligationId);
  }

  static async getObligationId?(
    marketId: PublicKey = LARIX_MARKET_ID_MAIN_POOL,
    userKey: PublicKey
  ): Promise<PublicKey> {
    const seed = marketId.toString().slice(0, 32);
    return await PublicKey.createWithSeed(userKey, seed, LARIX_PROGRAM_ID);
  }

  static parseObligation(data: Buffer | undefined, obligationId: PublicKey): types.ObligationInfo {
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
      unclaimedMine,
      dataFlat,
    } = decodedInfo;

    // TODO: TBC in Larix SDK
    // if (lastUpdate.slot.isZero()) {
    //   throw new Error("lastUpdate.slot.isZero()");
    // }

    const depositsBuffer = dataFlat.slice(0, depositsLen * COLLATERAL_LAYOUT.span);
    const obligationCollaterals = seq(COLLATERAL_LAYOUT, depositsLen).decode(
      depositsBuffer
    ) as types.ObligationCollateral[];

    const borrowsBuffer = dataFlat.slice(depositsBuffer.length, depositsBuffer.length + borrowsLen * LOAN_LAYOUT.span);
    const obligationLoans = seq(LOAN_LAYOUT, borrowsLen).decode(borrowsBuffer) as types.ObligationLoan[];

    return {
      version,
      lastUpdate,
      obligationId,
      lendingMarket,
      owner,
      depositedValue,
      borrowedValue,
      allowedBorrowValue,
      unhealthyBorrowValue,
      unclaimedMine,
      userKey: PublicKey.default,
      obligationCollaterals,
      obligationLoans,
    };
  }
  static async getAllFarms(connection: Connection, rewardMint?: PublicKey): Promise<types.FarmInfo[]> {
    const programIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 10,
        //offset 10byte
        bytes: LARIX_MARKET_ID_MAIN_POOL.toString(),
      },
    };
    const dataSizeFilters: DataSizeFilter = {
      dataSize: RESERVE_LAYOUT_SPAN,
    };
    const filters = [programIdMemcmp, dataSizeFilters];
    const config: GetProgramAccountsConfig = { filters: filters };

    const reserveAccounts = await connection.getProgramAccounts(LARIX_PROGRAM_ID, config);
    return reserveAccounts.map((accountInfo) => this.parseFarm(accountInfo.account.data, accountInfo.pubkey));
  }

  static async getAllFarmWrappers(connection: Connection, rewardMint?: PublicKey): Promise<types.FarmInfoWrapper[]> {
    let farms = await this.getAllFarms(connection);
    return farms.map((farm) => {
      return new FarmInfoWrapper(farm);
    });
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
    const farmAccountInfo = await connection.getAccountInfo(farmId);
    return this.parseFarm(farmAccountInfo?.data, farmId);
  }

  static parseFarm(data: Buffer | undefined, farmId: PublicKey): types.FarmInfo {
    const decodedData = RESERVE_LAYOUT.decode(data);
    const { liquidity, bonus, collateral } = decodedData;

    return {
      farmId,
      unCollSupply: bonus.unCollSupply,
      lTokenMiningIndex: new BN(bonus.lTokenMiningIndex),
      borrowMiningIndex: new BN(bonus.borrowMiningIndex),
      totalMiningSpeed: new BN(bonus.totalMiningSpeed),
      kinkUtilRate: new BN(bonus.kinkUtilRate),
      liquidityBorrowedAmountWads: new BN(liquidity.borrowedAmountWads),
      liquidityAvailableAmount: new BN(liquidity.availableAmount),
      liquidityMintDecimals: new BN(liquidity.mintDecimals),
      liquidityMarketPrice: new BN(liquidity.marketPrice),
      reserveTokenMint: collateral.reserveTokenMint,
      oraclePublickey: liquidity.larixOraclePubkey,
    };
  }

  static async getAllFarmers(connection: Connection, userKey: PublicKey): Promise<types.FarmerInfo[]> {
    const adminIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 1,
        bytes: userKey.toString(),
      },
    };
    const sizeFilter: DataSizeFilter = {
      dataSize: 642,
    };
    const filters = [adminIdMemcmp, sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };

    const allFarmerAccounts = await connection.getProgramAccounts(LARIX_PROGRAM_ID, config);
    let allFarmerInfos = allFarmerAccounts.map((account) => this.parseFarmer(account.account.data, account.pubkey));
    return allFarmerInfos;
  }

  static async getFarmerId(farmId: PublicKey, userKey: PublicKey, version?: number): Promise<PublicKey> {
    let newFarmer = await PublicKey.createWithSeed(userKey, LARIX_MAIN_POOL_FARMER_SEED, LARIX_PROGRAM_ID);
    return newFarmer;
  }

  static async getFarmer(connection: Connection, farmerId: PublicKey, version?: number): Promise<types.FarmerInfo> {
    const farmer = await connection
      .getAccountInfo(farmerId)
      .then((accountInfo) => this.parseFarmer(accountInfo?.data, farmerId));

    return farmer;
  }

  static parseFarmer(data: any, farmerId: PublicKey): types.FarmerInfo {
    let dataBuffer = data as Buffer;
    let infoData = dataBuffer;
    let newFarmerInfo = FARMER_LAYOUT.decode(infoData);
    let { version, owner, lendingMarket, reservesLen, unclaimedMine, dataFlat } = newFarmerInfo;

    const farmerIndicesBuffer = dataFlat.slice(0, reservesLen * FARMER_INDEX_LAYOUT.span);
    const farmerIndices = seq(FARMER_INDEX_LAYOUT, reservesLen).decode(farmerIndicesBuffer) as types.FarmerIndex[];

    return {
      farmerId,
      version: new BN(version),
      userKey: owner,
      lendingMarket,
      reservesLen: new BN(reservesLen),
      unclaimedMine: new BN(unclaimedMine),
      indexs: farmerIndices,
    };
  }
};

export { infos };

export const RESERVE_LAYOUT_SPAN = 873;

export function parseOracleBridgeInfo(data: any, pubkey: PublicKey): types.OracleBridgeInfo {
  const decodedData = ORACLE_BRIDGE_LAYOUT.decode(data);
  const {
    base,
    ammId,
    ammVersion,
    lpMint,
    lpSupply,
    coinSupply,
    pcSupply,
    addLpWithdrawAmountAuthority,
    compoundAuthority,
    coinMintPrice,
    coinMintDecimal,
    pcMintPrice,
    pcMintDecimal,
    ammOpenOrders,
    ammCoinMintSupply,
    ammPcMintSupply,
    bump,
    lpPriceAccount,
    isFarm,
    farmPoolId,
    farmPoolVersion,
    farmLedger,
  } = decodedData;
  return {
    bridgePubkey: pubkey,
    base,
    ammId,
    ammVersion,
    lpMint,
    lpSupply,
    coinSupply,
    pcSupply,
    addLpWithdrawAmountAuthority,
    compoundAuthority,
    coinMintPrice,
    coinMintDecimal,
    pcMintPrice,
    pcMintDecimal,
    ammOpenOrders,
    ammCoinMintSupply,
    ammPcMintSupply,
    bump,
    lpPriceAccount,
    isFarm,
    farmPoolId,
    farmPoolVersion,
    farmLedger,
  };
}

// RESERVE WRAPPER
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

  supplyAmount() {
    let borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(new BN(`1${"".padEnd(18, "0")}`));

    let availableAmount = this.reserveInfo.liquidity.availableAmount;

    return borrowedAmount.add(availableAmount);
  }

  borrowedAmount() {
    return this.reserveInfo.liquidity.borrowedAmountWads.div(new BN(`1${"".padEnd(18, "0")}`));
  }

  supplyApy() {
    let UtilizationRatio = Math.trunc(this.calculateUtilizationRatio() * 100) / 100;
    let borrowAPY = this.calculateBorrowAPY() as number;
    let apy = (UtilizationRatio * borrowAPY * 998) / 1000;
    return apy;
  }

  getPartnerReward(tokenList: IServicesTokenInfo[]): types.IPartnerReward | null {
    let rewardApy = 0;
    let tokenInfo: IServicesTokenInfo | null = null;
    let partnerReward: types.IPartnerReward | null = null;
    let rewardValue = 0;
    let supplyValue = 0;
    switch (this.reserveInfo.reserveId.toString()) {
      case LDO_REWARD_RESERVE.toString(): {
        const LDO_PER_YEAR = 357 * 365;
        tokenInfo = tokenList.find((t) => t.mint === LDO_MINT.toBase58()) ?? null;
        if (!tokenInfo) return null;
        rewardValue = LDO_PER_YEAR * tokenInfo.price * 100;
        supplyValue =
          this.supplyAmount()
            .mul(this.reserveInfo.liquidity.marketPrice)
            .div(new BN(`1${"".padEnd(9, "0")}`))
            .div(new BN(`1${"".padEnd(14, "0")}`))
            .toNumber() /
          10 ** 4;
        rewardApy = rewardValue / supplyValue;
        partnerReward = {
          side: "supply",
          rewardToken: tokenInfo,
          rate: rewardApy,
        };
        break;
      }
      case MNDE_REWARD_RESERVE.toString(): {
        const MNDE_PER_YEAR = 172.9999 * 365;
        tokenInfo = tokenList.find((t) => t.mint === MNDE_MINT.toBase58()) ?? null;
        if (!tokenInfo) return null;
        rewardValue = MNDE_PER_YEAR * tokenInfo.price * 100;
        supplyValue =
          this.supplyAmount()
            .mul(this.reserveInfo.liquidity.marketPrice)
            .div(new BN(`1${"".padEnd(9, "0")}`))
            .div(new BN(`1${"".padEnd(14, "0")}`))
            .toNumber() /
          10 ** 4;
        rewardApy = rewardValue / supplyValue;
        partnerReward = {
          side: "supply",
          rewardToken: tokenInfo,
          rate: rewardApy,
        };
        break;
      }
    }
    return partnerReward;
  }

  calculateUtilizationRatio() {
    let decimal = new BN(this.reserveInfo.liquidity.mintDecimals);
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

  convertReserveAmountToLiquidityAmount(reserveAmount: BN) {
    return reserveAmount.mul(this.supplyAmount()).div(this.reserveTokenSupply());
  }

  convertLiquidityAmountToReserveAmount(liquidityAmount: BN) {
    return liquidityAmount.mul(this.reserveTokenSupply()).div(this.supplyAmount());
  }

  async getLendingMarketAuthority(lendingMarket: PublicKey): Promise<PublicKey> {
    const authority = (await PublicKey.findProgramAddress([lendingMarket.toBuffer()], LARIX_PROGRAM_ID))[0];
    return authority;
  }
}

// FARM WRAPPER
export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: types.FarmInfo) {}

  borrowedAmount() {
    return this.farmInfo.liquidityBorrowedAmountWads.div(new BN(`1${"".padEnd(18, "0")}`));
  }

  supplyAmount() {
    let borrowedAmount = this.farmInfo.liquidityBorrowedAmountWads.div(new BN(`1${"".padEnd(18, "0")}`));

    let availableAmount = this.farmInfo.liquidityAvailableAmount;

    return borrowedAmount.add(availableAmount);
  }

  isMining() {
    this.farmInfo.kinkUtilRate.gt(new BN(0));
  }

  miningApy(larix_price: number) {
    let decimal = this.farmInfo.liquidityMintDecimals.toNumber();
    let poolTotalSupplyValue = this.supplyAmount()
      .mul(this.farmInfo.liquidityMarketPrice)
      .div(new BN(`1${"".padEnd(18, "0")}`))
      .div(new BN(`1${"".padEnd(decimal, "0")}`));
    let miningRate = this.farmInfo.kinkUtilRate;
    let miningSpeed = this.farmInfo.totalMiningSpeed;
    let slotPerYear = new BN(2 * 86400 * 365 * larix_price);
    let apy = miningRate.mul(slotPerYear).mul(miningSpeed).toNumber() / poolTotalSupplyValue.toNumber() / 10 ** 7;
    return apy;
  }

  calculateBorrowMiningApy(larix_price: number) {
    let decimal = this.farmInfo.liquidityMintDecimals.toNumber();
    let poolTotalSupplyValue = this.borrowedAmount()
      .mul(this.farmInfo.liquidityMarketPrice)
      .div(new BN(`1${"".padEnd(18, "0")}`))
      .div(new BN(`1${"".padEnd(decimal, "0")}`));
    let miningRate = new BN(100).sub(this.farmInfo.kinkUtilRate);
    let miningSpeed = this.farmInfo.totalMiningSpeed;
    let slotPerYear = new BN(2 * 86400 * 365 * larix_price);
    let apy = miningRate.mul(slotPerYear).mul(miningSpeed).toNumber() / poolTotalSupplyValue.toNumber() / 10 ** 7;
    return apy;
  }
}

export class ObligationInfoWrapper {
  constructor(public obligationInfo: types.ObligationInfo) {}

  update(
    reserveAndFarmInfo: {
      reserve: ReserveInfoWrapper;
      farm: FarmInfoWrapper;
    }[]
  ) {
    let unhealthyBorrowValue = new BN(0);
    let borrowedValue = new BN(0);
    let depositedValue = new BN(0);
    let reserveMap: Map<string, { reserve: ReserveInfoWrapper; farm: FarmInfoWrapper }> = new Map();

    for (let reserveInfoWrapper of reserveAndFarmInfo) {
      reserveMap.set(reserveInfoWrapper.reserve.reserveInfo.reserveId.toString(), reserveInfoWrapper);
    }
    let unclaimedAmount = this.obligationInfo.unclaimedMine;

    for (let depositedReserve of this.obligationInfo.obligationCollaterals) {
      let infoWrapper = reserveMap.get(depositedReserve.reserveId.toString());
      if (infoWrapper) {
        let reserveInfoWrapper = infoWrapper.reserve;
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
        let indexSub = infoWrapper.farm.farmInfo.lTokenMiningIndex.sub(depositedReserve.index);
        let reward = indexSub.mul(depositedReserve.depositedAmount);
        unclaimedAmount = unclaimedAmount.add(reward);
      }
    }

    for (let borrowedReserve of this.obligationInfo.obligationLoans) {
      let infoWrapper = reserveMap.get(borrowedReserve.reserveId.toString());
      if (infoWrapper) {
        let reserveInfoWrapper = infoWrapper.reserve;
        let decimal = Number(new BN(reserveInfoWrapper.reserveTokenDecimal()));
        let thisborrowedValue = borrowedReserve.borrowedAmount
          .mul(reserveInfoWrapper.reserveInfo.liquidity.marketPrice)
          .div(new BN(`1${"".padEnd(decimal, "0")}`));
        borrowedValue = borrowedValue.add(thisborrowedValue);
        let indexSub = infoWrapper.farm.farmInfo.borrowMiningIndex.sub(borrowedReserve.index);
        let reward = indexSub.mul(borrowedReserve.borrowedAmount);
        unclaimedAmount = unclaimedAmount.add(reward);
      }
    }

    this.obligationInfo.borrowedValue = borrowedValue;
    this.obligationInfo.depositedValue = depositedValue;
    this.obligationInfo.unhealthyBorrowValue = unhealthyBorrowValue;
    this.obligationInfo.unclaimedMine = unclaimedAmount;
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

export async function getAllOracleBridges(connection: Connection) {
  const allBridgeAccounts = await connection.getProgramAccounts(LARIX_BRIDGE_PROGRAM_ID);
  let allBridgeInfo: Map<string, types.OracleBridgeInfo> = new Map();
  for (let bridgeAccountInfo of allBridgeAccounts) {
    if (bridgeAccountInfo.account.data.length > 80) {
      let bridgeAccount = parseOracleBridgeInfo(bridgeAccountInfo.account.data, bridgeAccountInfo.pubkey);
      allBridgeInfo.set(bridgeAccountInfo.pubkey.toString(), bridgeAccount);
    }
  }
  return allBridgeInfo;
}

export async function checkFarmerCreated(connection: Connection, wallet: PublicKey) {
  let farmerId = await infos.getFarmerId(PublicKey.default, wallet);
  let farmerInfo = await connection.getAccountInfo(farmerId);
  return (farmerInfo?.data.length as number) > 0;
}

export async function checkObligationCreated(connection: Connection, wallet: PublicKey) {
  let obligationPub = await infos.getObligationId!(PublicKey.default, wallet);
  let obligationInfo = await connection.getAccountInfo(obligationPub);

  return (obligationInfo?.data.length as number) > 0;
}
