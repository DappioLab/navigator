import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import BN from "bn.js";

import { AccountInfo, Connection, PublicKey, DataSizeFilter, GetProgramAccountsConfig } from "@solana/web3.js";
import { SABER_WRAP_PROGRAM_ID, } from "./saberInfo";
export interface wrapInfo {
    wrapAuthority: PublicKey;
    decimal: BN;
    multiplyer: BN;
    underlyingWrappedTokenMint: PublicKey;
    underlyingTokenAccount: PublicKey;
    wrappedTokenMint: PublicKey;
}

const WRAPINFOLAYOUT = struct([
    u8("decimal"),
    u64("multiplyer"),
    publicKey("underlyingWrappedTokenMint"),
    publicKey("underlyingTokenAccount"),
    publicKey("wrappedTokenMint"),
]);

export class wrapInfo implements wrapInfo {
    wrapAuthority: PublicKey;
    decimal: BN;
    multiplyer: BN;
    underlyingWrappedTokenMint: PublicKey;
    underlyingTokenAccount: PublicKey;
    wrappedTokenMint: PublicKey;
    constructor(
        wrapAuthority: PublicKey,
        decimal: BN,
        multiplyer: BN,
        underlyingWrappedTokenMint: PublicKey,
        underlyingTokenAccount: PublicKey,
        wrappedTokenMint: PublicKey,
    ) {
        this.wrapAuthority = wrapAuthority;
        this.decimal = decimal;
        this.multiplyer = multiplyer;
        this.underlyingWrappedTokenMint = underlyingWrappedTokenMint;
        this.underlyingTokenAccount = underlyingTokenAccount;
        this.wrappedTokenMint = wrappedTokenMint;
    }
}

export function parseWrapInfoData(data: any) {
    const dataBuffer = data as Buffer;
    const cutttedData = dataBuffer.slice(8);
    const decodedData = WRAPINFOLAYOUT.decode(cutttedData);
    let { wrapAuthority, decimal, multiplyer, underlyingWrappedTokenMint, underlyingTokenAccount, wrappedTokenMint } = decodedData;
    let wrap = new wrapInfo(wrapAuthority, decimal, multiplyer, underlyingWrappedTokenMint, underlyingTokenAccount, wrappedTokenMint);
    return wrap;
}




export async function checkWrapped(tokenMint: PublicKey, wrapInfoArray: wrapInfo[]): Promise<[boolean, wrapInfo]> {
    for (let info of wrapInfoArray) {
        if (info.wrappedTokenMint.toString() == tokenMint.toString()) {
            return [true, info];
        }
    }
    return [false, defaultWrapInfo()];

}


function defaultWrapInfo() {
    return new wrapInfo(
        PublicKey.default,
        new BN(0),
        new BN(0),
        PublicKey.default,
        PublicKey.default,
        PublicKey.default)
}

export async function getAllWrap(connection: Connection) {
    const sizeFilter: DataSizeFilter = {
        dataSize: 114
    }
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allWrapAccount = await connection.getProgramAccounts(SABER_WRAP_PROGRAM_ID, config);
    let infoArray: wrapInfo[] = []
    for (let account of allWrapAccount) {
        let wrapAccountInfo = parseWrapInfoData(account.account.data);
        wrapAccountInfo.wrapAuthority = account.pubkey;
        infoArray.push(wrapAccountInfo);
    }
    return infoArray;
}