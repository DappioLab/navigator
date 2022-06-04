import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter,
    PublicKey
} from "@solana/web3.js";
import * as info from './info';
import { parseStrategyStateData, StrategyState, strategy_State_Layout } from "./StrategyState";

export async function getFarm(farmPubkey:PublicKey,connection:Connection){
    let accountInfo = await connection.getAccountInfo(farmPubkey);
    let farm = parseStrategyStateData(accountInfo?.data,farmPubkey)
    return farm;
}
export async function getAllFarm(connection:Connection){
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
            offset: 122,
            bytes: info.ADMIN.toString(),
        }
    };
    const sizeFilter: DataSizeFilter = {
        dataSize: 903,
    }
    const filters = [adminIdMemcmp,sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allAccountInfo = await connection.getProgramAccounts(info.lyfRaydiumProgramId, config);
    let allFarm:StrategyState[]=[];
    for(let farmInfo of allAccountInfo){
        allFarm.push(parseStrategyStateData(farmInfo.account.data,farmInfo.pubkey))
    }
    return allFarm;
}