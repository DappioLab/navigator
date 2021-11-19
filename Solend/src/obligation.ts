
import { publicKey, struct, u64, u128, u8, bool, u16 } from "@project-serum/borsh";

import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as info from "./solend_info"
export interface Obligation{

   
}


export async function get_obligation_public_key(wallet: PublicKey){

    const seed = info.SOLEND_LENDING_MARKET_ID.toString().slice(0, 32);
    const obligationAddress = await PublicKey.createWithSeed(
    wallet,
    seed,
    info.SOLEND_PROGRAM_ID,);
    return obligationAddress
}
export async function obligation_created(connection:Connection, wallet: PublicKey ) {
  let obligation_info = await connection.getAccountInfo(await get_obligation_public_key(wallet))
  if (obligation_info?.owner.toString()== info.SOLEND_PROGRAM_ID.toString()){
    return true;
  }
  return false
}