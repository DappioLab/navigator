import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter,
    PublicKey
} from "@solana/web3.js";
import BN from "bn.js";
import { PSY_PROGRAM_ID } from "./info";

interface OptionMarketInterface {
    infoPubkey: PublicKey;
    optionMint: PublicKey;
    writerTokenMint: PublicKey;
    underlyingAssetMint: PublicKey;
    quoteAssetMint: PublicKey;
    underlyingAmountPerContract: BN;
    quoteAmountPerContract: BN;
    expirationUnixTimestamp: BN;
    underlyingAssetPool: PublicKey;
    quoteAssetPool: PublicKey;
    mintFeeAccount: PublicKey;
    exerciseFeeAccount: PublicKey;
    expired: boolean;
    bumpSeed: BN;
}
export class OptionMarket implements OptionMarketInterface {
    infoPubkey: PublicKey;
    optionMint: PublicKey;
    writerTokenMint: PublicKey;
    underlyingAssetMint: PublicKey;
    quoteAssetMint: PublicKey;
    underlyingAmountPerContract: BN;
    quoteAmountPerContract: BN;
    expirationUnixTimestamp: BN;
    underlyingAssetPool: PublicKey;
    quoteAssetPool: PublicKey;
    mintFeeAccount: PublicKey;
    exerciseFeeAccount: PublicKey;
    expired: boolean;
    bumpSeed: BN;
    constructor(
        infoPubkey: PublicKey,
        optionMint: PublicKey,
        writerTokenMint: PublicKey,
        underlyingAssetMint: PublicKey,
        quoteAssetMint: PublicKey,
        underlyingAmountPerContract: BN,
        quoteAmountPerContract: BN,
        expirationUnixTimestamp: BN,
        underlyingAssetPool: PublicKey,
        quoteAssetPool: PublicKey,
        mintFeeAccount: PublicKey,
        exerciseFeeAccount: PublicKey,
        expired: boolean,
        bumpSeed: BN,
    ) {
        this.infoPubkey = infoPubkey;
        this.optionMint = optionMint;
        this.writerTokenMint = writerTokenMint;
        this.underlyingAssetMint = underlyingAssetMint;
        this.quoteAssetMint = quoteAssetMint;
        this.underlyingAmountPerContract = new BN(underlyingAmountPerContract);
        this.quoteAmountPerContract = new BN(quoteAmountPerContract);
        this.expirationUnixTimestamp = new BN(expirationUnixTimestamp);
        this.underlyingAssetPool = underlyingAssetPool;
        this.quoteAssetPool = quoteAssetPool;
        this.mintFeeAccount = mintFeeAccount;
        this.exerciseFeeAccount = exerciseFeeAccount;
        this.expired = expired;
        this.bumpSeed = bumpSeed;
    }
}

const MARKET_LAYOUT = struct([
    publicKey("optionMint"),
    publicKey("writerTokenMint"),
    publicKey("underlyingAssetMint"),
    publicKey("quoteAssetMint"),
    u64("underlyingAmountPerContract"),
    u64("quoteAmountPerContract"),
    i64("expirationUnixTimestamp"),
    publicKey("underlyingAssetPool"),
    publicKey("quoteAssetPool"),
    publicKey("mintFeeAccount"),
    publicKey("exerciseFeeAccount"),
    bool("expired"),
    u8("bumpSeed")
])

export function parceOptionMarketInfo(data: any, infoPubkey: PublicKey) {
    let dataBuffer = data as Buffer;
    if ((!data)||(!infoPubkey)){
        return new OptionMarket(
            PublicKey.default,
            PublicKey.default,
            PublicKey.default,
            PublicKey.default,
            PublicKey.default,
            new BN(0),
            new BN(0),
            new BN(0),
            PublicKey.default,
            PublicKey.default,
            PublicKey.default,
            PublicKey.default,
            true,
            new BN(0),
        )
    }
    let marketData = dataBuffer.slice(8);
    let market = MARKET_LAYOUT.decode(marketData);
    
    let {
        optionMint,
        writerTokenMint,
        underlyingAssetMint,
        quoteAssetMint,
        underlyingAmountPerContract,
        quoteAmountPerContract,
        expirationUnixTimestamp,
        underlyingAssetPool,
        quoteAssetPool,
        mintFeeAccount,
        exerciseFeeAccount,
        expired,
        bumpSeed
    } = market

    return new OptionMarket(
        infoPubkey,
        optionMint,
        writerTokenMint,
        underlyingAssetMint,
        quoteAssetMint,
        underlyingAmountPerContract,
        quoteAmountPerContract,
        expirationUnixTimestamp,
        underlyingAssetPool,
        quoteAssetPool,
        mintFeeAccount,
        exerciseFeeAccount,
        expired,
        bumpSeed)
}

export async function getOptionMarketByOptionTokenMint(optionMint:PublicKey,connection:Connection){
    const mintMemcmp: MemcmpFilter = {
        memcmp: {
            offset: 8,
            bytes: optionMint.toString(),
        }
    };
    const sizeFilter: DataSizeFilter = {
        dataSize: 290
    }
    const filters = [mintMemcmp,sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allOptionMarket = await connection.getProgramAccounts(PSY_PROGRAM_ID, config);
    let optionMarketInfo = parceOptionMarketInfo(allOptionMarket[0]?.account.data,allOptionMarket[0]?.pubkey)
    return optionMarketInfo
}