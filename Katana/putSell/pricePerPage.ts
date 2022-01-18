import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { KATANA_PROGRAM_ID } from "./info";
import { Vault } from "./vaultInfo";

interface PricePerSharePageInterface {
    infoPubkey:PublicKey;
    page:BN;
    bump:BN;
    prices:BN[];
}

export class PricePerSharePage implements PricePerSharePageInterface{
    infoPubkey:PublicKey;
    page:BN;
    bump:BN;
    prices:BN[];
    constructor(
        infoPubkey:PublicKey,
        page:BN,
        bump:BN,
        prices:BN[],
    ){
        this.infoPubkey = infoPubkey;
        this.bump = new BN(bump);
        this.page = new BN(page);
        this.prices = prices;
    }
}

export const PRICE_PER_PAGE_LAYOUT = struct([
    u128("page"),
    u8("bump"),
]);
export function parsePricePerSharePageData(data:any,infoPubkey:PublicKey) {
    let dataBuffer = data as Buffer;
    let ppspData = dataBuffer.slice(8);
    let ppspRaw = PRICE_PER_PAGE_LAYOUT.decode(ppspData);
    let {page, bump} = ppspRaw;
    let prices:BN[] =[]
    let PRICE_LAYOUT = struct([u128("price")])
    for (let index = 0; index < 128; index++) {
        let data = ppspData.slice(17+index*16);
        let {price} = PRICE_LAYOUT.decode(data);
        prices.push(new BN(price))
    }
    return new PricePerSharePage(infoPubkey,new BN(page),new BN(bump),prices,)
}
export async function getPricePerPageAccount(vault:Vault,connection:Connection){
    let infoPubkey = await vault.getPricePerPage()
    let account = await connection.getAccountInfo(infoPubkey);
    let ppsp = parsePricePerSharePageData(account?.data,infoPubkey);
    return ppsp;
}