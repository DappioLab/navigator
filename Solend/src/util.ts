import {
    PublicKey,
    Connection
  } from '@solana/web3.js';
  import * as info from "./solendInfo"
  import { TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID} from '@solana/spl-token';
import BN from "bn.js";
import { SwitchboardAccountType,parseAggregatorAccountData } from '@switchboard-xyz/switchboard-api';
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
export async function getSlndPrice(connection:Connection) {
    let priceFeed = await parseAggregatorAccountData(connection,info.SLND_PRICE_ORACLE);
    let price = priceFeed.lastRoundResult?.result as number;
    return new BN(price* 1000)
}