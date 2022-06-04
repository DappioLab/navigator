import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { KATANA_PROGRAM_ID } from "./info";
import { Vault } from "./vaultInfo";

interface OtcTermInterface {
    infoPubkey: PublicKey;
    round: BN;
    totalPrice: BN;
    tokenMintToBuy: PublicKey;
    tokenMintToSell: PublicKey;
    bump: BN;
}

export class OtcTerms implements OtcTermInterface {
    infoPubkey: PublicKey;
    round: BN;
    totalPrice: BN;
    tokenMintToBuy: PublicKey;
    tokenMintToSell: PublicKey;
    bump: BN;
    constructor(
        infoPubkey: PublicKey,
        round: BN,
        totalPrice: BN,
        tokenMintToBuy: PublicKey,
        tokenMintToSell: PublicKey,
        bump: BN,
    ) {
        this.infoPubkey = infoPubkey;
        this.round = new BN(round);
        this.totalPrice = new BN(totalPrice);
        this.tokenMintToBuy = tokenMintToBuy;
        this.tokenMintToSell = tokenMintToSell;
        this.bump = new BN(bump);
    }
}

export const OTC_TERMS_LAYOUT = struct([
    u128("round"),
    u64("totalPrice"),
    publicKey("tokenMintToBuy"),
    publicKey("tokenMintToSell"),
    u8("bump"),

]);
export function parseOtcTermsData(data: any, infoPubkey: PublicKey) {
    let dataBuffer = data as Buffer;
    let otcData = dataBuffer.slice(8);
    let otcRaw = OTC_TERMS_LAYOUT.decode(otcData);
    let { round, totalPrice, tokenMintToBuy, tokenMintToSell, bump } = otcRaw;

    return new OtcTerms(infoPubkey, round, totalPrice, tokenMintToBuy, tokenMintToSell, bump)
}
export async function getOtcTermsAccount(vault: Vault, connection: Connection) {
    let infoPubkey = await vault.getOtcTerms()
    let account = await connection.getAccountInfo(infoPubkey);
    if(account == undefined){
        return defaultOtcTerms(infoPubkey)
    }
    let otc = parseOtcTermsData(account?.data, infoPubkey);
    return otc;
}
export function defaultOtcTerms(infoPubkey: PublicKey) {
   return new OtcTerms(infoPubkey, new BN(0), new BN(0), PublicKey.default, PublicKey.default, new BN(0))
}