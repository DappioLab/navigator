import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { wrapInfo } from "./wrapInfo";
import { getTokenAccountAmount ,getTokenSupply} from "../util";
import { SWAP_PROGRAM_ID } from "./saberInfo";
export interface SwapInfo {
    infoPublicKey: PublicKey;
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
    tokenAccountA: PublicKey;
    tokenAccountB: PublicKey;
    AtokenAccountAmount?: BN;
    BtokenAccountAmount?: BN;
    poolMint: PublicKey;
    mintA: PublicKey;
    mintB: PublicKey;
    adminFeeAccountA: PublicKey;
    adminFeeAccountB: PublicKey;

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
    publicKey("tokenAccountA"),
    publicKey("tokenAccountB"),
    publicKey("poolMint"),
    publicKey("mintA"),
    publicKey("mintB"),
    publicKey("adminFeeAccountA"),
    publicKey("adminFeeAccountB"),

]);
export class SwapInfo implements SwapInfo {
    infoPublicKey: PublicKey;
    authority: PublicKey;
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
    tokenAccountA: PublicKey;
    tokenAccountB: PublicKey;
    poolMint: PublicKey;
    mintA: PublicKey;
    mintB: PublicKey;
    adminFeeAccountA: PublicKey;
    adminFeeAccountB: PublicKey;
    AtokenAccountAmount?: BN;
    BtokenAccountAmount?: BN;
    LPtokenSupply?:BN;
    mintAWrapped?: boolean;
    mintAWrapInfo?: wrapInfo;
    mintBWrapped?: boolean;
    mintBWrapInfo?: wrapInfo;
    constructor(
        infoPublicKey: PublicKey,
        authority: PublicKey,
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
        tokenAccountA: PublicKey,
        tokenAccountB: PublicKey,
        poolMint: PublicKey,
        mintA: PublicKey,
        mintB: PublicKey,
        adminFeeAccountA: PublicKey,
        adminFeeAccountB: PublicKey,

    ) {
        this.infoPublicKey = infoPublicKey;
        this.authority = authority;
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
        this.tokenAccountA = tokenAccountA;
        this.tokenAccountB = tokenAccountB;
        this.poolMint = poolMint;
        this.mintA = mintA;
        this.mintB = mintB;
        this.adminFeeAccountA = adminFeeAccountA;
        this.adminFeeAccountB = adminFeeAccountB;
    }
    async updateAmount(connection:Connection){
        this.AtokenAccountAmount = await getTokenAccountAmount(connection, this.tokenAccountA);
        this.BtokenAccountAmount = await getTokenAccountAmount(connection, this.tokenAccountB);
        this.LPtokenSupply = await getTokenSupply(connection,this.poolMint);
    }
}


export async function parseSwapInfoData(data: any, pubkey: PublicKey): Promise<SwapInfo> {
    const decodedData = SWAPINFO_LAYOUT.decode(data)
    let authority = (await PublicKey.findProgramAddress([pubkey.toBuffer()],SWAP_PROGRAM_ID))[0];
    let { isInitialized,
        isPaused,
        nonce,
        initialAmpFactor,
        targetAmpFactor,
        startRampTs,
        stopRampTs,
        futureAdminDeadline,
        futureAdminKey,
        adminKey,
        tokenAccountA,
        tokenAccountB,
        poolMint,
        mintA,
        mintB,
        adminFeeAccountA,
        adminFeeAccountB } = decodedData;
    let swapInfo = new SwapInfo(pubkey,
        authority,
        isInitialized,
        isPaused,
        nonce,
        initialAmpFactor,
        targetAmpFactor,
        startRampTs,
        stopRampTs,
        futureAdminDeadline,
        futureAdminKey,
        adminKey,
        tokenAccountA,
        tokenAccountB,
        poolMint,
        mintA,
        mintB,
        adminFeeAccountA,
        adminFeeAccountB);
    return swapInfo;
}