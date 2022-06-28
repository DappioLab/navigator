import { seq } from "@solana/buffer-layout";
import {
  Connection,
  PublicKey,
  GetProgramAccountsConfig,
  MemcmpFilter,
  DataSizeFilter,
} from "@solana/web3.js";
import BN from "bn.js";
import { SOLEND_LENDING_MARKET_ID, SOLEND_PROGRAM_ID } from "./ids";
import {
  COLLATERAL_LAYOUT,
  LOAN_LAYOUT,
  OBLIGATION_LAYOUT,
  RESERVE_LAYOUT,
} from "./layouts";
import { getSlndPrice, isMining } from "./utils";

export const RESERVE_LAYOUT_SPAN = 619;

// Deprecated
export const MINING_RESERVES = [] as PublicKey[];

export const SLND_PER_YEAR = new BN(10e6);

export function MINING_MULTIPLIER(reserve: PublicKey) {
  switch (reserve.toString()) {
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

export interface ReserveInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey; // reserveId?
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
}

export class LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;

  constructor(lastUpdatedSlot: BN, stale: boolean) {
    this.lastUpdatedSlot = lastUpdatedSlot;
    this.stale = stale;
  }
}

export function parseReserveData(data: any): ReserveInfo {
  const decodedData = RESERVE_LAYOUT.decode(data);
  let { version, lastUpdate, lendingMarket, liquidity, collateral, config } =
    decodedData;
  return {
    version,
    lastUpdate,
    lendingMarket,
    liquidity,
    collateral,
    config,
  };
}

export class ReserveInfoWrapper {
  constructor(public reserveId: PublicKey, public reserveInfo: ReserveInfo) {}

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
    await isMining(this.reserveId);
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
    let decimal = new BN(this.reserveInfo.liquidity.mintDecimals).toNumber();
    if (MINING_MULTIPLIER(this.reserveId).eq(new BN(0))) {
      miningApy = 0;
    } else {
      let slndPrice = await getSlndPrice(connection);
      let slndPerYear = MINING_MULTIPLIER(this.reserveId).div(
        new BN(`1${"".padEnd(3, "0")}`)
      );

      let supplyUSDValue = this.supplyAmount()
        .div(new BN(`1${"".padEnd(decimal, "0")}`))
        .mul(this.reserveInfo.liquidity.marketPrice)
        .div(new BN(`1${"".padEnd(18, "0")}`));

      miningApy =
        slndPerYear.mul(slndPrice).toNumber() / supplyUSDValue.toNumber();
    }
    return miningApy;
  }

  calculateUtilizationRatio() {
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

  supplyApy() {
    let UtilizationRatio = this.calculateUtilizationRatio();
    let borrowAPY = this.calculateBorrowAPY() as number;
    return UtilizationRatio * borrowAPY;
  }
}

export async function getAllLendingInfo(connection: Connection) {
  const allReserve = await getAllReserve(connection);

  let lendingInfos = [] as ReserveInfoWrapper[];

  for (let reservesMeta of allReserve) {
    const newinfo = new ReserveInfoWrapper(reservesMeta[0], reservesMeta[1]);

    lendingInfos.push(newinfo);
  }

  return lendingInfos;
}

async function getAllReserve(connection: Connection) {
  const programIdMemcmp: MemcmpFilter = {
    memcmp: {
      //offset 10 byte
      offset: 10,
      bytes: SOLEND_LENDING_MARKET_ID.toString(),
    },
  };
  const dataSizeFilters: DataSizeFilter = {
    dataSize: RESERVE_LAYOUT_SPAN,
  };

  const filters = [programIdMemcmp, dataSizeFilters];

  const config: GetProgramAccountsConfig = { filters: filters };
  const reserveAccounts = await connection.getProgramAccounts(
    SOLEND_PROGRAM_ID,
    config
  );
  let reserves = <Array<[PublicKey, ReserveInfo]>>[];
  for (let account of reserveAccounts) {
    let info = parseReserveData(account.account.data);
    reserves.push([account.pubkey, info]);
  }

  return reserves;
}

export async function getObligation(connection: Connection, wallet: PublicKey) {
  let obligationAddress = await getObligationPublicKey(wallet);
  let accountInfo = await connection.getAccountInfo(obligationAddress);
  if (accountInfo?.owner.toString() == SOLEND_PROGRAM_ID.toString()) {
    let obligationInfo = parseObligationData(accountInfo?.data);
    return obligationInfo;
  } else {
    return defaultObligation();
  }
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

export async function getObligationPublicKey(wallet: PublicKey) {
  const seed = SOLEND_LENDING_MARKET_ID.toString().slice(0, 32);
  const obligationAddress = await PublicKey.createWithSeed(
    wallet,
    seed,
    SOLEND_PROGRAM_ID
  );
  return obligationAddress;
}

export async function obligationCreated(
  connection: Connection,
  wallet: PublicKey
) {
  let obligationInfo = await connection.getAccountInfo(
    await getObligationPublicKey(wallet)
  );
  if (obligationInfo?.owner.toString() == SOLEND_PROGRAM_ID.toString()) {
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
          depositedReserve.reserveId.toString() ==
          reserveInfoWrapper.reserveId.toString()
        ) {
          let decimal = new BN(
            reserveInfoWrapper.reserveTokenDecimal()
          ).toNumber();
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
          borrowedReserve.reserveId.toString() ==
          reserveInfoWrapper.reserveId.toString()
        ) {
          let decimal = new BN(
            reserveInfoWrapper.reserveTokenDecimal()
          ).toNumber();
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
  let { reserveAddress, depositedAmount, marketValue } = collateralInfo;
  let collateral: ObligationCollateral = {
    reserveId: reserveAddress,
    depositedAmount,
    marketValue,
  };

  return collateral;
}

export function defaultObligation() {
  const obligationInfo = {
    version: new BN(1),
    lastUpdate: new LastUpdate(new BN(0), false),
    lendingMarket: PublicKey.default,
    owner: PublicKey.default,
    depositedValue: new BN(0),
    borrowedValue: new BN(0),
    allowedBorrowValue: new BN(0),
    unhealthyBorrowValue: new BN(0),
  } as ObligationInfo;

  return new ObligationInfoWrapper(obligationInfo, [], []);
}
