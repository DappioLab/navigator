import { publicKey, struct, u64, u128, u8, bool} from "@project-serum/borsh";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
export interface Reserve {
    version: BN;
    lastUpdate: LastUpdate;
    lendingMarket: PublicKey;
    liquidity: ReserveLiquidity;
    collateral: ReserveCollateral;
    config: ReserveConfig;
    calculateUtilizationRatio():number;
    calculateBorrowAPY():number;

}
export class Reserve implements Reserve {
    version: BN;
    lastUpdate: LastUpdate;
    lendingMarket: PublicKey;
    liquidity: ReserveLiquidity;
    collateral: ReserveCollateral;
    config: ReserveConfig;
    constructor(
        version: BN,
        lastUpdate: LastUpdate,
        lendingMarket: PublicKey,
        liquidity: ReserveLiquidity,
        collateral: ReserveCollateral,
        config: ReserveConfig,

    ) {
        this.version = version;
        this.lastUpdate = lastUpdate;
        this.lendingMarket = lendingMarket;
        this.liquidity = liquidity;
        this.collateral = collateral;
        this.config = config;
    }
    calculateUtilizationRatio() {
        const borrowedAmount = this.liquidity.borrowedAmountWads.div(new BN(`1${''.padEnd(18, '0')}`));
        const totalAmount = this.liquidity.availableAmount.add(borrowedAmount);
        const currentUtilization =
            (borrowedAmount.toNumber() / totalAmount.toNumber());
        return currentUtilization;
    }

    calculateBorrowAPY() {
        const currentUtilization = this.calculateUtilizationRatio();
        const optimalUtilization = new BN(this.config.optimalUtilizationRate).toNumber() / 100;
        let borrowAPY;
        if (optimalUtilization === 1.0 || currentUtilization < optimalUtilization) {
            const normalizedFactor = currentUtilization / optimalUtilization;
            const optimalBorrowRate = new BN(this.config.optimalBorrowRate).toNumber() / 100;
            const minBorrowRate = new BN(this.config.minBorrowRate).toNumber() / 100;
            borrowAPY =
                normalizedFactor * (optimalBorrowRate - minBorrowRate) + minBorrowRate
        } else {
            const normalizedFactor =
                (currentUtilization - optimalUtilization) / (1 - optimalUtilization);
            const optimalBorrowRate = new BN(this.config.optimalBorrowRate).toNumber() / 100;
            const maxBorrowRate = new BN(this.config.maxBorrowRate).toNumber() / 100;
            borrowAPY =
                normalizedFactor * (maxBorrowRate - optimalBorrowRate) +
                optimalBorrowRate;
        }


        return borrowAPY;
    };
}

const RESERVELAYOUT = struct([
    u8("version"),
    struct([
        u64("lastUpdatedSlot"),
        bool("stale")
    ], "lastUpdate"),
    publicKey("lendingMarket"),

    struct([
        publicKey("mintPubkey"),
        u8("mintDecimals"),
        publicKey("supplyPubkey"),
        publicKey("pythOraclePubkey"),
        publicKey("switchboardOraclePubkey"),
        u64("availableAmount"),
        u128("borrowedAmountWads"),
        u128("cumulativeBorrowRateWads"),
        u128("marketPrice")
    ], "liquidity"),
    struct([
        publicKey("reserveTokenMint"),
        u64("mintTotalSupply"),
        publicKey("supplyPubkey")

    ], "collateral"),
    struct([
        u8("optimalUtilizationRate"),
        u8("loanToValueRatio"),
        u8("liquidationBonus"),
        u8("liquidationThreshold"),
        u8("minBorrowRate"),
        u8("optimalBorrowRate"),
        u8("maxBorrowRate"),
        struct([
            u64("borrowFeeWad"),
            u64("flashLoanFeeWad"),
            u8("hostFeePercentage"),
        ], "fees"),
        u64("depositLimit"),
        u64("borrowLimit"),
        publicKey("feeReceiver")
    ], "config")


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
    depositLimit: BN;
    borrowLimit: BN;
    feeReceiver: PublicKey;
    constructor(
        optimalUtilizationRate: BN,
        loanToValueRatio: BN,
        liquidationBonus: BN,
        liquidationThreshold: BN,
        minBorrowRate: BN,
        optimalBorrowRate: BN,
        maxBorrowRate: BN,
        fees: ReserveFees,
        depositLimit: BN,
        borrowLimit: BN,
        feeReceiver: PublicKey,
    ) {
        this.optimalUtilizationRate = optimalUtilizationRate;
        this.loanToValueRatio = loanToValueRatio;
        this.liquidationBonus = liquidationBonus;
        this.liquidationThreshold = liquidationThreshold;
        this.minBorrowRate = minBorrowRate;
        this.optimalBorrowRate = optimalBorrowRate;
        this.maxBorrowRate = maxBorrowRate;
        this.fees = fees;
        this.depositLimit = depositLimit;
        this.borrowLimit = borrowLimit;
        this.feeReceiver = feeReceiver;
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
        this.mintTotalSupply = mintTotalSupply;
        this.supplyPubkey = supplyPubkey;
    }
}
export class LastUpdate {
    lastUpdatedSlot: BN;
    stale: boolean;

    constructor(
        lastUpdatedSlot: BN,
        stale: boolean,
    ) {
        this.lastUpdatedSlot = lastUpdatedSlot;
        this.stale = stale;
    }
}
class ReserveLiquidity {
    mintPubkey: PublicKey;
    mintDecimals: BN;
    supplyPubkey: PublicKey;
    pythOraclePubkey: PublicKey;
    switchboardOraclePubkey: PublicKey;
    availableAmount: BN;
    borrowedAmountWads: BN;
    cumulativeBorrowRateWads: BN;
    marketPrice: BN;
    constructor(
        mintPubkey: PublicKey,
        mintDecimals: BN,
        supplyPubkey: PublicKey,
        pythOraclePubkey: PublicKey,
        switchboardOraclePubkey: PublicKey,
        availableAmount: BN,
        borrowedAmountWads: BN,
        cumulativeBorrowRateWads: BN,
        marketPrice: BN,
    ) {
        this.mintPubkey = mintPubkey;
        this.mintDecimals = mintDecimals;
        this.supplyPubkey = supplyPubkey;
        this.pythOraclePubkey = pythOraclePubkey;
        this.switchboardOraclePubkey = switchboardOraclePubkey;
        this.availableAmount = availableAmount;
        this.borrowedAmountWads = borrowedAmountWads;
        this.cumulativeBorrowRateWads = cumulativeBorrowRateWads;
        this.marketPrice = marketPrice;
    }
}
class ReserveFees {
    borrowFeeWad: BN;
    flashLoanFeeWad: BN;
    hostFeePercentage: BN;
    constructor(
        borrowFeeWad: BN,
        flashLoanFeeWad: BN,
        hostFeePercentage: BN,
    ) {
        this.borrowFeeWad = borrowFeeWad;
        this.flashLoanFeeWad = flashLoanFeeWad;
        this.hostFeePercentage = hostFeePercentage;
    }
}

export function parseReserveData(data: any): Reserve {

    const decodedData = RESERVELAYOUT.decode(data)
    let { version,
        lastUpdate,
        lendingMarket,
        liquidity,
        collateral,
        config } = decodedData;
    let reserve = new Reserve(
        version,
        lastUpdate,
        lendingMarket,
        liquidity,
        collateral,
        config);

    return reserve;
}

