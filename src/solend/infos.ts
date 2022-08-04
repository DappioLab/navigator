import {
  Connection,
  PublicKey,
  GetProgramAccountsConfig,
  MemcmpFilter,
  DataSizeFilter,
} from "@solana/web3.js";
import BN from "bn.js";
import { IReserveInfo, IReserveInfoWrapper } from "../types";
import {
  SOLEND_LENDING_MARKET_ID_ALL,
  SOLEND_LENDING_MARKET_ID_MAIN_POOL,
  SOLEND_PROGRAM_ID,
} from "./ids";
import {
  COLLATERAL_LAYOUT,
  LOAN_LAYOUT,
  OBLIGATION_LAYOUT,
  RESERVE_LAYOUT,
} from "./layouts";
import { getSlndPrice, isMining } from "./utils";
import { getTokenList } from "../utils";
// @ts-ignore
import { seq } from "buffer-layout";
import axios from "axios";

export const RESERVE_LAYOUT_SPAN = 619;

// Deprecated
export const MINING_RESERVES = [] as PublicKey[];

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

//all from https://docs.solend.fi/protocol/addresses

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
  let { version, lastUpdate, lendingMarket, liquidity, collateral, config } =
    decodedData;
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
    let borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(
      new BN(`1${"".padEnd(18, "0")}`)
    );
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
      let slndPerYear = MINING_MULTIPLIER(this.reserveInfo.reserveId).div(
        new BN(`1${"".padEnd(3, "0")}`)
      );

      let supplyUSDValue = this.supplyAmount()
        .div(new BN(`1${"".padEnd(decimal, "0")}`))
        .mul(this.reserveInfo.liquidity.marketPrice)
        .div(new BN(`1${"".padEnd(18, "0")}`));

      miningApy = Number(slndPerYear.mul(slndPrice)) / Number(supplyUSDValue);
    }
    return miningApy;
  }

  calculateUtilizationRatio() {
    const borrowedAmount = this.reserveInfo.liquidity.borrowedAmountWads.div(
      new BN(`1${"".padEnd(18, "0")}`)
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

  supplyApy() {
    let UtilizationRatio = this.calculateUtilizationRatio();
    let borrowAPY = this.calculateBorrowAPY() as number;
    return UtilizationRatio * borrowAPY;
  }

  getSupplyPartnerRewardData() {}
}

export async function getAllReserveWrappers(connection: Connection) {
  const allReserves = await getAllReserves(connection);
  console.log(1);

  const getAllPartnersRewardData = async () => {
    return await (
      await axios.get(
        "https://api.solend.fi/liquidity-mining/external-reward-stats-v2?flat=true"
      )
    ).data;
  };

  let reserveInfoWrappers = [] as ReserveInfoWrapper[];
  const allPartnersRewardData = await getAllPartnersRewardData();
  const tokenList = await getTokenList();

  for (let reservesMeta of allReserves) {
    const newInfo = new ReserveInfoWrapper(reservesMeta);

    let supplyTokenRewardData = allPartnersRewardData.filter(
      // @ts-ignore
      (item) =>
        item.tokenMint === newInfo.supplyTokenMint().toBase58() &&
        newInfo.reserveInfo.reserveId.toBase58() === item.reserveID &&
        item.side === "supply"
    );

    let price = tokenList.find(
      (t: any) => t.mint === newInfo.supplyTokenMint().toBase58()
    )?.price;
    let partnerRewardRate = 0;
    let partnerRewardToken: any = {};
    let partnerRewardData: any = null;
    const poolTotalSupply =
      Number(newInfo.supplyAmount()) /
      10 ** Number(newInfo.supplyTokenDecimal());
    const poolTotalSupplyValue = poolTotalSupply * price;

    if (supplyTokenRewardData.length !== 0) {
      // @ts-ignore
      supplyTokenRewardData.map((supplyReward) => {
        let rewardRate =
          supplyReward.rewardRates[supplyReward.rewardRates.length - 1]
            .rewardRate;
        partnerRewardToken = tokenList.find(
          (token: any) => token.mint === supplyReward.rewardMint
        )!;
        if (partnerRewardToken) {
          let rewardTokenPrice = partnerRewardToken?.price!;
          partnerRewardRate = Number(
            (
              ((rewardRate * rewardTokenPrice) /
                poolTotalSupplyValue /
                10 ** 36) *
              100
            ).toFixed(2)
          );

          partnerRewardData = {
            rewardToken: partnerRewardToken,
            rate: partnerRewardRate,
          };
        }
      });
    }

    newInfo.getSupplyPartnerRewardData = () => partnerRewardData;
    // console.log(
    //   newInfo.getSupplyPartnerRewardData(),
    //   "newInfo.getSupplyPartnerRewardData()"
    // );

    reserveInfoWrappers.push(newInfo);
  }

  return reserveInfoWrappers;
}

async function getAllReserves(
  connection: Connection,
  lendingMarket?: PublicKey
) {
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
  const reserveAccounts = await connection.getProgramAccounts(
    SOLEND_PROGRAM_ID,
    config
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
  reserveId: PublicKey
): Promise<ReserveInfo> {
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

export async function getAllObligation(
  connection: Connection,
  wallet: PublicKey
) {
  let allObligationAddress: PublicKey[] = [];
  let allObligationInfoWrapper: ObligationInfoWrapper[] = [];
  for (let lendingMarket of SOLEND_LENDING_MARKET_ID_ALL) {
    allObligationAddress.push(
      await getObligationPublicKey(wallet, lendingMarket)
    );
  }
  let allAccountInfo = await connection.getMultipleAccountsInfo(
    allObligationAddress
  );

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
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  owner: PublicKey;
  depositedValue: BN;
  borrowedValue: BN;
  allowedBorrowValue: BN;
  unhealthyBorrowValue: BN;
}

export async function getObligationPublicKey(
  wallet: PublicKey,
  lendingMarket = SOLEND_LENDING_MARKET_ID_MAIN_POOL
) {
  const seed = lendingMarket.toString().slice(0, 32);
  const obligationAddress = await PublicKey.createWithSeed(
    wallet,
    seed,
    SOLEND_PROGRAM_ID
  );
  return obligationAddress;
}

export async function getLendingMarketAuthority(
  lendingMarket: PublicKey
): Promise<PublicKey> {
  const authority = (
    await PublicKey.findProgramAddress(
      [lendingMarket.toBuffer()],
      SOLEND_PROGRAM_ID
    )
  )[0];

  return authority;
}

export async function obligationCreated(
  connection: Connection,
  wallet: PublicKey
) {
  let obligationInfo = await connection.getAccountInfo(
    await getObligationPublicKey(wallet)
  );
  if (obligationInfo?.owner.equals(SOLEND_PROGRAM_ID)) {
    return true;
  }
  return false;
}

export class ObligationInfoWrapper {
  constructor(
    public obligationInfo: ObligationInfo,
    public obligationCollaterals: ObligationCollateral[],
    public obligationLoans: ObligationLoan[]
  ) {}

  update(reserveInfos: ReserveInfoWrapper[]) {
    let unhealthyBorrowValue = new BN(0);
    let borrowedValue = new BN(0);
    let depositedValue = new BN(0);
    for (let depositedReserve of this.obligationCollaterals) {
      for (let reserveInfoWrapper of reserveInfos) {
        if (
          depositedReserve.reserveId.equals(
            reserveInfoWrapper.reserveInfo.reserveId
          )
        ) {
          let decimal = Number(
            new BN(reserveInfoWrapper.reserveTokenDecimal())
          );
          let thisDepositedValue = depositedReserve.depositedAmount
            .mul(reserveInfoWrapper.supplyAmount())
            .mul(reserveInfoWrapper.reserveInfo.liquidity.marketPrice)
            .div(reserveInfoWrapper.reserveInfo.collateral.mintTotalSupply)
            .div(new BN(`1${"".padEnd(decimal, "0")}`));
          depositedValue = depositedValue.add(thisDepositedValue);

          let thisUnhealthyBorrowValue = new BN(
            reserveInfoWrapper.reserveInfo.config.liquidationThreshold
          )
            .mul(thisDepositedValue)
            .div(new BN(`1${"".padEnd(2, "0")}`));
          unhealthyBorrowValue = unhealthyBorrowValue.add(
            thisUnhealthyBorrowValue
          );
        }
      }
    }

    for (let borrowedReserve of this.obligationLoans) {
      for (let reserveInfoWrapper of reserveInfos) {
        if (
          borrowedReserve.reserveId.equals(
            reserveInfoWrapper.reserveInfo.reserveId
          )
        ) {
          let decimal = Number(
            new BN(reserveInfoWrapper.reserveTokenDecimal())
          );
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
}

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

  const depositsBuffer = dataFlat.slice(
    0,
    depositsLen * COLLATERAL_LAYOUT.span
  );
  const depositCollaterals = seq(COLLATERAL_LAYOUT, depositsLen).decode(
    depositsBuffer
  ) as ObligationCollateral[];

  const borrowsBuffer = dataFlat.slice(
    depositsBuffer.length,
    depositsLen * COLLATERAL_LAYOUT.span + borrowsLen * LOAN_LAYOUT.span
  );
  const borrowLoans = seq(LOAN_LAYOUT, borrowsLen).decode(
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
  } as ObligationInfo;

  const obligationInfoWrapper = new ObligationInfoWrapper(
    obligationInfo,
    depositCollaterals,
    borrowLoans
  );

  return obligationInfoWrapper;
}

export function parseCollateralData(data: any) {
  let collateralInfo = COLLATERAL_LAYOUT.decode(data);
  let { reserveId, depositedAmount, marketValue } = collateralInfo;
  let collateral: ObligationCollateral = {
    reserveId,
    depositedAmount,
    marketValue,
  };

  return collateral;
}

export function defaultObligation() {
  const obligationInfo = {
    version: new BN(1),
    lastUpdate: { lastUpdatedSlot: new BN(0), stale: false },
    lendingMarket: PublicKey.default,
    owner: PublicKey.default,
    depositedValue: new BN(0),
    borrowedValue: new BN(0),
    allowedBorrowValue: new BN(0),
    unhealthyBorrowValue: new BN(0),
  } as ObligationInfo;

  return new ObligationInfoWrapper(obligationInfo, [], []);
}

// let connection = new Connection("https://ssc-dao.genesysgo.net", {
//   wsEndpoint: "",
//   commitment: "processed",
// });
// (async () => {
//   let wrapper = await getAllReserveWrappers(connection);
//   wrapper.map((item) =>
//     console.log(
//       item.getSupplyPartnerRewardData(),
//       "item.getSupplyPartnerRewardData()"
//     )
//   );
// })();
