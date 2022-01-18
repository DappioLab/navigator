import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter,
    PublicKey
} from "@solana/web3.js";
import * as info from './info';

import { LiquidityPoolInfo, parseV3PoolInfo, parseV4PoolInfo } from "./poolInfo"
import { FarmInfo, parseFarmV1, parseFarmV45, updateAllFarmToken } from "./farmInfo"


export async function getAllAmmPool(connection: Connection) {
    let allPool: LiquidityPoolInfo[] = []

    //V3 pools
    const sizeFilter: DataSizeFilter = {
        dataSize: 680
    }
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allV3AMMAccount = await connection.getProgramAccounts(info.LIQUIDITY_POOL_PROGRAM_ID_V3, config);
    for (let v3Account of allV3AMMAccount) {
        allPool.push(parseV3PoolInfo(v3Account.account.data, v3Account.pubkey))
    }

    //V4 pools
    const v4SizeFilter: DataSizeFilter = {
        dataSize: 752
    }
    const v4Filters = [v4SizeFilter];
    const v4config: GetProgramAccountsConfig = { filters: v4Filters };
    const allV4AMMAccount = await connection.getProgramAccounts(info.LIQUIDITY_POOL_PROGRAM_ID_V4, v4config)
    for (let v4Account of allV4AMMAccount) {
        allPool.push(parseV4PoolInfo(v4Account.account.data, v4Account.pubkey))
    }
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
    await updateAllFarmToken(allFarm,connection);
    for(let index = 0 ; index < allFarm.length ; index++){
        if (allFarm[index].poolLpTokenAccount?.amount.isZero()){
            allFarm.splice(index,1)
            index--
        }
        //console.log(allFarm.length)
    }
    return allFarm
}
