import { publicKey, struct, u64, u128, u8, bool } from "@project-serum/borsh";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
export interface Reserve {
  infoPubkey: PublicKey;
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;

  calculateUtilizationRatio(): number;
  calculateBorrowAPY(): number;
}
export class Reserve implements Reserve {
  infoPubkey: PublicKey;
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
  farm: Farm;
  constructor(
    infoPubkey: PublicKey,
    version: BN,
    lastUpdate: LastUpdate,
    lendingMarket: PublicKey,
    liquidity: ReserveLiquidity,
    collateral: ReserveCollateral,
    config: ReserveConfig,
    farm: Farm,
  ) {
    this.infoPubkey = infoPubkey;
    this.version = new BN(version);
    this.lastUpdate = lastUpdate;
    this.lendingMarket = lendingMarket;
    this.liquidity = liquidity;
    this.collateral = collateral;
    this.config = config;
    this.farm = farm;
  }
  calculateUtilizationRatio() {
    let decimal = new BN(this.liquidity.mintDecimals);
    const borrowedAmount = this.liquidity.borrowedAmountWads.div(
      new BN(`1${"".padEnd(18, "0")}`),
    );
    const totalAmount = this.liquidity.availableAmount.add(borrowedAmount);
    const currentUtilization =
      borrowedAmount.toNumber() / totalAmount.toNumber();
    return currentUtilization;
  }

  calculateBorrowAPY() {
    const currentUtilization = this.calculateUtilizationRatio();
    const optimalUtilization =
      new BN(this.config.optimalUtilizationRate).toNumber() / 100;
    let borrowAPY;
    if (optimalUtilization === 1.0 || currentUtilization < optimalUtilization) {
      const normalizedFactor = currentUtilization / optimalUtilization;
      const optimalBorrowRate =
        new BN(this.config.optimalBorrowRate).toNumber() / 100;
      const minBorrowRate = new BN(this.config.minBorrowRate).toNumber() / 100;
      borrowAPY =
        normalizedFactor * (optimalBorrowRate - minBorrowRate) + minBorrowRate;
    } else {
      const normalizedFactor =
        (currentUtilization - optimalUtilization) / (1 - optimalUtilization);
      const optimalBorrowRate =
        new BN(this.config.optimalBorrowRate).toNumber() / 100;
      const maxBorrowRate = new BN(this.config.maxBorrowRate).toNumber() / 100;
      borrowAPY =
        normalizedFactor * (maxBorrowRate - optimalBorrowRate) +
        optimalBorrowRate;
    }

    return borrowAPY;
  }
}

const RESERVELAYOUT = struct([
  u8("version"),
  struct([u64("lastUpdatedSlot"), bool("stale")], "lastUpdate"),
  publicKey("lendingMarket"),
  struct(
    [
      publicKey("mintPubkey"),
      u8("mintDecimals"),
      publicKey("supplyPubkey"),
      publicKey("feeReceiver"),
      u8("padding"),
      publicKey("OraclePubkey"),
      publicKey("larixOraclePubkey"),
      u64("availableAmount"),
      u128("borrowedAmountWads"),
      u128("cumulativeBorrowRateWads"),
      u128("marketPrice"),
      u128("ownerUnclaimed"),
    ],
    "liquidity",
  ),
  struct(
    [
      publicKey("reserveTokenMint"),
      u64("mintTotalSupply"),
      publicKey("supplyPubkey"),
    ],
    "collateral",
  ),
  struct(
    [
      u8("optimalUtilizationRate"),
      u8("loanToValueRatio"),
      u8("liquidationBonus"),
      u8("liquidationThreshold"),
      u8("minBorrowRate"),
      u8("optimalBorrowRate"),
      u8("maxBorrowRate"),
      struct(
        [
          u64("borrowFeeWad"),
          u64("borrowInterestFeeWad"),
          u64("flashLoanFeeWad"),
          u8("hostFeePercentage"),
        ],
        "fees",
      ),
    ],
    "config",
  ),
]);

const FARM_LAYOUT = struct([
  publicKey("unCollSupply"),
  u128("lTokenMiningIndex"),
  u128("borrowMiningIndex"),
  u64("totalMiningSpeed"),
  u64("kinkUtilRate"),
]);

class ReserveConfig {
  optimalUtilizationRate: BN;
  loanToValueRatio: BN;
  liquidationBonus: BN;
  liquidationThreshold: BN;
  minBorrowRate: BN;
  optimalBorrowRate: BN;
  maxBorrowRate: BN;
  fees: ReserveFees;

  constructor(
    optimalUtilizationRate: BN,
    loanToValueRatio: BN,
    liquidationBonus: BN,
    liquidationThreshold: BN,
    minBorrowRate: BN,
    optimalBorrowRate: BN,
    maxBorrowRate: BN,
    fees: ReserveFees,
  ) {
    this.optimalUtilizationRate = new BN(optimalUtilizationRate);
    this.loanToValueRatio = new BN(loanToValueRatio);
    this.liquidationBonus = new BN(liquidationBonus);
    this.liquidationThreshold = new BN(liquidationThreshold);
    this.minBorrowRate = new BN(minBorrowRate);
    this.optimalBorrowRate = new BN(optimalBorrowRate);
    this.maxBorrowRate = new BN(maxBorrowRate);
    this.fees = fees;
  }
}

class ReserveCollateral {
  reserveTokenMint: PublicKey;
  mintTotalSupply: BN;
  supplyPubkey: PublicKey;
  constructor(
    reserveTokenMint: PublicKey,
    mintTotalSupply: BN,
    supplyPubkey: PublicKey,
  ) {
    this.reserveTokenMint = reserveTokenMint;
    this.mintTotalSupply = new BN(mintTotalSupply);
    this.supplyPubkey = supplyPubkey;
  }
}
export class LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;

  constructor(lastUpdatedSlot: BN, stale: boolean) {
    this.lastUpdatedSlot = new BN(lastUpdatedSlot);
    this.stale = stale;
  }
}
class ReserveLiquidity {
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
  constructor(
    mintPubkey: PublicKey,
    mintDecimals: BN,
    supplyPubkey: PublicKey,
    feeReceiver: PublicKey,
    OraclePubkey: PublicKey,
    larixOraclePubkey: PublicKey,
    availableAmount: BN,
    borrowedAmountWads: BN,
    cumulativeBorrowRateWads: BN,
    marketPrice: BN,
    ownerUnclaimed: BN,
  ) {
    this.mintPubkey = mintPubkey;
    this.mintDecimals = mintDecimals;
    this.supplyPubkey = supplyPubkey;
    this.feeReceiver = feeReceiver;
    this.OraclePubkey = OraclePubkey;
    this.larixOraclePubkey = larixOraclePubkey;
    this.availableAmount = availableAmount;
    this.borrowedAmountWads = borrowedAmountWads;
    this.cumulativeBorrowRateWads = cumulativeBorrowRateWads;
    this.marketPrice = marketPrice;
    this.ownerUnclaimed = ownerUnclaimed;
  }
}
class ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
  constructor(borrowFeeWad: BN, flashLoanFeeWad: BN, hostFeePercentage: BN) {
    this.borrowFeeWad = borrowFeeWad;
    this.flashLoanFeeWad = flashLoanFeeWad;
    this.hostFeePercentage = hostFeePercentage;
  }
}

export class Farm {
  unCollSupply: PublicKey;
  lTokenMiningIndex: BN;
  totalMiningSpeed: BN;
  kinkUtilRate: BN;
  constructor(
    unCollSupply: PublicKey,
    lTokenMiningIndex: BN,
    totalMiningSpeed: BN,
    kinkUtilRate: BN,
  ) {
    this.unCollSupply = unCollSupply;
    this.lTokenMiningIndex = new BN(lTokenMiningIndex);
    this.totalMiningSpeed = new BN(totalMiningSpeed);
    this.kinkUtilRate = new BN(kinkUtilRate);
  }
}

export function parseReserveData(data: any, pubkey: PublicKey): Reserve {
  let dataBuffer = data as Buffer;
  let lengh = dataBuffer.length;
  let farmData = dataBuffer.slice(lengh - 249 - FARM_LAYOUT.span);
  const decodedData = RESERVELAYOUT.decode(data);
  const farmDecodedData = FARM_LAYOUT.decode(farmData);
  let { version, lastUpdate, lendingMarket, liquidity, collateral, config } =
    decodedData;
  let { unCollSupply, lTokenMiningIndex, totalMiningSpeed, kinkUtilRate } =
    farmDecodedData;

  let reserve = new Reserve(
    pubkey,
    version,
    new LastUpdate(lastUpdate.astUpdatedSlot, lastUpdate.stale),
    lendingMarket,
    new ReserveLiquidity(
      liquidity.mintPubkey,
      liquidity.mintDecimals,
      liquidity.supplyPubkey,
      liquidity.feeReceiver,
      liquidity.OraclePubkey,
      liquidity.larixOraclePubkey,
      liquidity.availableAmount,
      liquidity.borrowedAmountWads,
      liquidity.cumulativeBorrowRateWads,
      liquidity.marketPrice,
      liquidity.ownerUnclaimed,
    ),
    new ReserveCollateral(
      collateral.reserveTokenMint,
      collateral.mintTotalSupply,
      collateral.supplyPubkey,
    ),
    config,
    new Farm(unCollSupply, lTokenMiningIndex, totalMiningSpeed, kinkUtilRate),
  );

  return reserve;
}
