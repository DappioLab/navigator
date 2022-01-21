import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter,
    PublicKey
} from "@solana/web3.js";
import * as info from './info';

import { PoolInfo, parseV4PoolInfo, updateAllTokenAmount } from "./poolInfo"
import { FarmInfo, parseFarmV1, parseFarmV45, updateAllFarmToken } from "./farmInfo"


export async function getAllAmmPool(connection: Connection) {
    let allPool: PoolInfo[] = []
    //V4 pools
    const v4SizeFilter: DataSizeFilter = {
        dataSize: 752
    }
    const v4Filters = [v4SizeFilter];
    const v4config: GetProgramAccountsConfig = { filters: v4Filters };
    const allV4AMMAccount = await connection.getProgramAccounts(info.LIQUIDITY_POOL_PROGRAM_ID_V4, v4config)
    for (let v4Account of allV4AMMAccount) {
        let pool = parseV4PoolInfo(v4Account.account.data, v4Account.pubkey)
        if (  (!(pool.totalPnlCoin.isZero()|| pool.totalPnlPc.isZero())) && pool.status.toNumber( ) != 4  ){
            allPool.push(pool)
        }
        
    }
    //allPool = await updateAllTokenAmount(allPool,connection)
    return allPool
}
export async function getAllFarm(connection: Connection) {
    let allFarm: FarmInfo[] = [];
    const v1SizeFilter: DataSizeFilter = {
        dataSize: 200
    }
    const v1Filters = [v1SizeFilter];
    const v1Config: GetProgramAccountsConfig = { filters: v1Filters };
    const allV1FarmAccount = await connection.getProgramAccounts(info.STAKE_PROGRAM_ID, v1Config);
    for (let v1Account of allV1FarmAccount) {
        let farm = parseFarmV1(v1Account.account.data, v1Account.pubkey)
        if (farm.state.toNumber() == 1) {
            //await farm.updateAllTokenAccount(connection);
            allFarm.push(farm)
        }
    }
    const v5SizeFilter: DataSizeFilter = {
        dataSize: 224
    }
    const v5Filters = [v5SizeFilter];
    const v5Config: GetProgramAccountsConfig = { filters: v5Filters };
    const allV5FarmAccount = await connection.getProgramAccounts(info.STAKE_PROGRAM_ID_V5, v5Config);
    for (let v5Account of allV5FarmAccount) {
        let farm = parseFarmV45(v5Account.account.data, v5Account.pubkey, 5)
        if (farm.state.toNumber() == 1) {
            //await farm.updateAllTokenAccount(connection);
            allFarm.push(farm)
        }
    }
    allFarm = await updateAllFarmToken(allFarm,connection);
    for(let index = 0 ; index < allFarm.length ; index++){
        if (allFarm[index].poolLpTokenAccount?.amount.isZero()){
            allFarm.splice(index,1)
            index--
        }
        //console.log(allFarm.length)
    }
    return allFarm
    
}
