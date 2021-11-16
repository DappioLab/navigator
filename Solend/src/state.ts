import { publicKey, struct, u64, u128, u8, bool, u16 } from "@project-serum/borsh";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
export interface Reserve {
    version: BN;
    last_update: Last_update;
    lending_market: PublicKey;
    liquidity: Reserve_liquidity;
    collateral: Reserve_collateral;
    config: Reserve_config;

}

const RESERVE_LAYOUT = struct([
    u8("version"),
    struct([
        u64("last_updated_slot"),
        bool("stale")
    ], "last_update"),
    publicKey("lending_market"),

    struct([
        publicKey("mint_pubkey"),
        u8("mint_decimals"),
        publicKey("supply_pubkey"),
        publicKey("pyth_oracle_pubkey"),
        publicKey("switchboard_oracle_pubkey"),
        u64("available_amount"),
        u128("borrowed_amount_wads"),
        u128("cumulative_borrow_rate_wads"),
        u128("market_price")
    ], "liquidity"),
    struct([
        publicKey("reserve_token_mint"),
        u64("mint_total_supply"),
        publicKey("supply_pubkey")

    ], "collateral"),
    struct([
        u8("optimal_utilization_rate"),
        u8("loan_to_value_ratio"),
        u8("liquidation_bonus"),
        u8("liquidation_threshold"),
        u8("min_borrow_rate"),
        u8("optimal_borrow_rate"),
        u8("max_borrow_rate"),
        struct([
            u64("borrow_fee_wad"),
            u64("flash_loan_fee_wad"),
            u8("host_fee_percentage"),
        ], "fees"),
        u64("deposit_limit"),
        u64("borrow_limit"),
        publicKey("fee_receiver")
    ], "config")


]);
class Reserve_config {
    optimal_utilization_rate: BN;
    loan_to_value_ratio: BN;
    liquidation_bonus: BN;
    liquidation_threshold: BN;
    min_borrow_rate: BN;
    optimal_borrow_rate: BN;
    max_borrow_rate: BN;
    fees: Reserve_fees;
    deposit_limit: BN;
    borrow_limit: BN;
    fee_receiver: PublicKey;
    constructor(
        optimal_utilization_rate: BN,
        loan_to_value_ratio: BN,
        liquidation_bonus: BN,
        liquidation_threshold: BN,
        min_borrow_rate: BN,
        optimal_borrow_rate: BN,
        max_borrow_rate: BN,
        fees: Reserve_fees,
        deposit_limit: BN,
        borrow_limit: BN,
        fee_receiver: PublicKey,
    ) {
        this.optimal_utilization_rate = optimal_utilization_rate;
        this.loan_to_value_ratio = loan_to_value_ratio;
        this.liquidation_bonus = liquidation_bonus;
        this.liquidation_threshold = liquidation_threshold;
        this.min_borrow_rate = min_borrow_rate;
        this.optimal_borrow_rate = optimal_borrow_rate;
        this.max_borrow_rate = max_borrow_rate;
        this.fees = fees;
        this.deposit_limit = deposit_limit;
        this.borrow_limit = borrow_limit;
        this.fee_receiver = fee_receiver;
    }
}

class Reserve_collateral {
    reserve_token_mint: PublicKey;
    mint_total_supply: BN;
    supply_pubkey: PublicKey;
    constructor(
        reserve_token_mint: PublicKey,
        mint_total_supply: BN,
        supply_pubkey: PublicKey,


    ) {

        this.reserve_token_mint = reserve_token_mint;
        this.mint_total_supply = mint_total_supply;
        this.supply_pubkey = supply_pubkey;
    }
}

export class Reserve implements Reserve {
    version: BN;
    last_update: Last_update;
    lending_market: PublicKey;
    liquidity: Reserve_liquidity;
    collateral: Reserve_collateral;
    config: Reserve_config;
    constructor(
        version: BN,
        last_update: Last_update,
        lending_market: PublicKey,
        liquidity: Reserve_liquidity,
        collateral: Reserve_collateral,
        config: Reserve_config,

    ) {
        this.version = version;
        this.last_update = last_update;
        this.lending_market = lending_market;
        this.liquidity = liquidity;
        this.collateral = collateral;
        this.config = config;
    }
    calculateUtilizationRatio() {
        const borrowedAmount = this.liquidity.borrowed_amount_wads.div(new BN(`1${''.padEnd(18, '0')}`));
        const total_amount = this.liquidity.available_amount.add(borrowedAmount);
        const currentUtilization =
            (borrowedAmount.toNumber() / total_amount.toNumber());
        return currentUtilization;
    }

    calculateBorrowAPY() {
        const currentUtilization = this.calculateUtilizationRatio();
        const optimalUtilization = new BN(this.config.optimal_utilization_rate).toNumber() / 100;
        let borrowAPY;
        if (optimalUtilization === 1.0 || currentUtilization < optimalUtilization) {
            const normalizedFactor = currentUtilization / optimalUtilization;
            const optimalBorrowRate = new BN(this.config.optimal_borrow_rate).toNumber() / 100;
            const minBorrowRate = new BN(this.config.min_borrow_rate).toNumber() / 100;
            borrowAPY =
                normalizedFactor * (optimalBorrowRate - minBorrowRate) + minBorrowRate
        } else {
            const normalizedFactor =
                (currentUtilization - optimalUtilization) / (1 - optimalUtilization);
            const optimalBorrowRate = new BN(this.config.optimal_borrow_rate).toNumber() / 100;
            const maxBorrowRate = new BN(this.config.max_borrow_rate).toNumber() / 100;
            borrowAPY =
                normalizedFactor * (maxBorrowRate - optimalBorrowRate) +
                optimalBorrowRate;
        }


        return borrowAPY;
    };
}

class Last_update {
    last_updated_slot: BN;
    stale: boolean;

    constructor(
        last_updated_slot: BN,
        stale: boolean,
    ) {
        this.last_updated_slot = last_updated_slot;
        this.stale = stale;
    }
}



class Reserve_liquidity {
    mint_pubkey: PublicKey;
    mint_decimals: BN;
    supply_pubkey: PublicKey;
    pyth_oracle_pubkey: PublicKey;
    switchboard_oracle_pubkey: PublicKey;
    available_amount: BN;
    borrowed_amount_wads: BN;
    cumulative_borrow_rate_wads: BN;
    market_price: BN;
    constructor(
        mint_pubkey: PublicKey,
        mint_decimals: BN,
        supply_pubkey: PublicKey,
        pyth_oracle_pubkey: PublicKey,
        switchboard_oracle_pubkey: PublicKey,
        available_amount: BN,
        borrowed_amount_wads: BN,
        cumulative_borrow_rate_wads: BN,
        market_price: BN,
    ) {
        this.mint_pubkey = mint_pubkey;
        this.mint_decimals = mint_decimals;
        this.supply_pubkey = supply_pubkey;
        this.pyth_oracle_pubkey = pyth_oracle_pubkey;
        this.switchboard_oracle_pubkey = switchboard_oracle_pubkey;
        this.available_amount = available_amount;
        this.borrowed_amount_wads = borrowed_amount_wads;
        this.cumulative_borrow_rate_wads = cumulative_borrow_rate_wads;
        this.market_price = market_price;
    }
}



class Reserve_fees {
    borrow_fee_wad: BN;
    flash_loan_fee_wad: BN;
    host_fee_percentage: BN;
    constructor(
        borrow_fee_wad: BN,
        flash_loan_fee_wad: BN,
        host_fee_percentage: BN,
    ) {
        this.borrow_fee_wad = borrow_fee_wad;
        this.flash_loan_fee_wad = flash_loan_fee_wad;
        this.host_fee_percentage = host_fee_percentage;
    }
}

export function parseReserveData(data: any): Reserve {

    const decoded_data = RESERVE_LAYOUT.decode(data)
    let { version,
        last_update,
        lending_market,
        liquidity,
        collateral,
        config } = decoded_data;
    let reserve = new Reserve(
        version,
        last_update,
        lending_market,
        liquidity,
        collateral,
        config);

    return reserve;
}