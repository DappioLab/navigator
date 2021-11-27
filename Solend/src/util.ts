import {
    PublicKey,
    Connection
  } from '@solana/web3.js';
  import * as info from "./solendInfo"
  import { TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID} from '@solana/spl-token';
import * as ftx from "ftx-api";
import BN from "bn.js";
export async function findAssociatedTokenAddress(
    walletAddress: PublicKey,
    tokenMintAddress: PublicKey
): Promise<PublicKey> {
    return (await PublicKey.findProgramAddress(
        [
            walletAddress.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            tokenMintAddress.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    ))[0];
}
export async function checkTokenAccount(publickey:PublicKey,connection:Connection) {
    let accountInfo = await connection.getAccountInfo(publickey);
    if (accountInfo?.owner.toString() == TOKEN_PROGRAM_ID.toString()){
        return true
    }
    else  return false
}
export async function isMining(reserveAddress:PublicKey) {
    for (let address of info.MININGREVERSES ){
        if (reserveAddress.toString() == address){
            return true;
        }
    }
    return false;
}  
export async function getSlndPrice() {
    let client = new  ftx.RestClient();
    let price = await client.getMarket("SLND/USD")
    return new BN(price.result.bid* 1000)
}