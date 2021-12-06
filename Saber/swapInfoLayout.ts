import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";


export interface SwapInfo {
    isInitialized: boolean;
    isPaused: boolean;
    nonce: BN;
    initialAmpFactor: BN;
    targetAmpFactor: BN;
    startRampTs: BN;
    stopRampTs: BN;
    futureAdminDeadline: BN;
    futureAdminKey: PublicKey;
    adminKey: PublicKey;
    tokenAInfo: SwapTokenInfo;
    tokenBInfo: SwapTokenInfo;
    poolMint: PublicKey;

}

export interface SwapTokenInfo {
    reserveTokenAccount: PublicKey;
    tokenMint: PublicKey;
    adminFeePublickey: PublicKey;
    index: BN;
}


const SWAPINFO_LAYOUT = struct([
    bool("isInitialized"),
    bool("isPaused"),
    u8("nonce"),
    u64("initialAmpFactor"),
    u64("targetAmpFactor"),
    i64("startRampTs"),
    i64("stopRampTs"),
    i64("futureAdminDeadline"),
    publicKey("futureAdminKey"),
    publicKey("adminKey"),
    struct([
        publicKey("reserveTokenAAccount"),
        publicKey("tokenAMint"),
        publicKey("adminTokenAFeePublickey"),
        u8("index")
    ], "tokenAInfo"),
    struct([
        publicKey("reserveTokenAAccount"),
        publicKey("tokenBMint"),
        publicKey("adminTokenBFeePublickey"),
        u8("index")
    ], "tokenBInfo"),
    publicKey("poolMint")

]);
export class SwapInfo implements SwapInfo {
    isInitialized: boolean;
    isPaused: boolean;
    nonce: BN;
    initialAmpFactor: BN;
    targetAmpFactor: BN;
    startRampTs: BN;
    stopRampTs: BN;
    futureAdminDeadline: BN;
    futureAdminKey: PublicKey;
    adminKey: PublicKey;
    tokenAInfo: SwapTokenInfo;
    tokenBInfo: SwapTokenInfo;
    poolMint: PublicKey;
    constructor(
        isInitialized: boolean,
        isPaused: boolean,
        nonce: BN,
        initialAmpFactor: BN,
        targetAmpFactor: BN,
        startRampTs: BN,
        stopRampTs: BN,
        futureAdminDeadline: BN,
        futureAdminKey: PublicKey,
        adminKey: PublicKey,
        tokenAInfo: SwapTokenInfo,
        tokenBInfo: SwapTokenInfo,
        poolMint: PublicKey,
    ) {
        this.isInitialized = isInitialized;
        this.isPaused = isPaused;
        this.nonce = nonce;
        this.initialAmpFactor = initialAmpFactor;
        this.targetAmpFactor = targetAmpFactor;
        this.startRampTs = startRampTs;
        this.stopRampTs = stopRampTs;
        this.futureAdminDeadline = futureAdminDeadline;
        this.futureAdminKey = futureAdminKey;
        this.adminKey = adminKey;
        this.tokenAInfo = tokenAInfo;
        this.tokenBInfo = tokenBInfo;
        this.poolMint = poolMint;
    }
}
export class SwapTokenInfo implements SwapTokenInfo {
    reserveTokenAccount: PublicKey;
    tokenMint: PublicKey;
    adminFeePublickey: PublicKey;
    index: BN;
    constructor(
        reserveTokenAccount: PublicKey,
        tokenMint: PublicKey,
        adminFeePublickey: PublicKey,
        index: BN,
    ) {
        this.reserveTokenAccount = reserveTokenAccount;
        this.tokenMint = tokenMint;
        this.adminFeePublickey = adminFeePublickey;
        this.index = index;
    }
}

export function parseSwapInfoData(data:any):SwapInfo{
    const decodedData = SWAPINFO_LAYOUT.decode(data)
    let {isInitialized ,
    isPaused,
    nonce,
    initialAmpFactor,
    targetAmpFactor,
    startRampTs,
    stopRampTs,
    futureAdminDeadline,
    futureAdminKey,
    adminKey,
    tokenAInfo,
    tokenBInfo,
    poolMint} = decodedData;
    let swapInfo = new SwapInfo(isInitialized ,
        isPaused,
        nonce,
        initialAmpFactor,
        targetAmpFactor,
        startRampTs,
        stopRampTs,
        futureAdminDeadline,
        futureAdminKey,
        adminKey,
        tokenAInfo,
        tokenBInfo,
        poolMint);
    return swapInfo;
}