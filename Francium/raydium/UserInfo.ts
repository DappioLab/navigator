import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter,
    PublicKey
} from "@solana/web3.js";
import BN from "bn.js";
import * as  info from "./info";

interface UserInfoInterface {
    infoPubkey:PublicKey;
    version: BN;
    lastUpdateSlot: BN;
    strategyStateAccount: PublicKey;
    userMainAccount: PublicKey;
    pending0: BN;
    pendingInvestFlag: BN;
    stopLoss: BN;
    tkn0: BN;
    tkn1: BN;
    borrowed0: BN;
    borrowed1: BN;
    principle0: BN;
    principle1: BN;
    investedLp: BN;
    lpShares: BN;
    pendingWithdrawLp: BN;
    pendingRepay0: BN;
    pendingRepay1: BN;
    cumulatedBorrowRate0: BN;
    cumulatedBorrowRate1: BN;
    platformRewardsDebt: BN;
    pendingWithdrawFlag: BN;
    takeProfitLine: BN;
    

}

export class UserInfo implements UserInfoInterface {
    infoPubkey:PublicKey;
    version: BN;
    lastUpdateSlot: BN;
    strategyStateAccount: PublicKey;
    userMainAccount: PublicKey;
    pending0: BN;
    pendingInvestFlag: BN;
    stopLoss: BN;
    tkn0: BN;
    tkn1: BN;
    borrowed0: BN;
    borrowed1: BN;
    principle0: BN;
    principle1: BN;
    investedLp: BN;
    lpShares: BN;
    pendingWithdrawLp: BN;
    pendingRepay0: BN;
    pendingRepay1: BN;
    cumulatedBorrowRate0: BN;
    cumulatedBorrowRate1: BN;
    platformRewardsDebt: BN;
    pendingWithdrawFlag: BN;
    takeProfitLine: BN;
    
    constructor(
        infoPubkey:PublicKey,
        version: BN,
        lastUpdateSlot: BN,
        strategyStateAccount: PublicKey,
        userMainAccount: PublicKey,
        pending0: BN,
        pendingInvestFlag: BN,
        stopLoss: BN,
        tkn0: BN,
        tkn1: BN,
        borrowed0: BN,
        borrowed1: BN,
        principle0: BN,
        principle1: BN,
        investedLp: BN,
        lpShares: BN,
        pendingWithdrawLp: BN,
        pendingRepay0: BN,
        pendingRepay1: BN,
        cumulatedBorrowRate0: BN,
        cumulatedBorrowRate1: BN,
        platformRewardsDebt: BN,
        pendingWithdrawFlag: BN,
        takeProfitLine: BN,

    ) {
        this.infoPubkey = infoPubkey
        this.version = version 
        this.lastUpdateSlot = lastUpdateSlot
        this.strategyStateAccount = strategyStateAccount
        this.userMainAccount = userMainAccount
        this.pending0 = pending0
        this.pendingInvestFlag = pendingInvestFlag
        this.stopLoss = stopLoss
        this.tkn0 = tkn0
        this.tkn1 = tkn1
        this.borrowed0 = borrowed0
        this.borrowed1 = borrowed1
        this.principle0 = principle0
        this.principle1 = principle1
        this.investedLp = investedLp
        this.lpShares = lpShares
        this.pendingWithdrawLp = pendingWithdrawLp
        this.pendingRepay0 = pendingRepay0
        this.pendingRepay1 = pendingRepay1
        this.cumulatedBorrowRate0 = cumulatedBorrowRate0
        this.cumulatedBorrowRate1 = cumulatedBorrowRate1
        this.platformRewardsDebt = platformRewardsDebt
        this.pendingWithdrawFlag = pendingWithdrawFlag
        this.takeProfitLine = takeProfitLine
        
    }

}

export const USER_INFO_LAYOUT = struct([
    u8("version"),
    u64("lastUpdateSlot"),
    publicKey("strategyStateAccount"),
    //41Byte
    publicKey("userMainAccount"),
    u8("pending0"),
    u8("pendingInvestFlag"),
    u8("stopLoss"),
    u64("tkn0"),
    u64("tkn1"),
    u64("borrowed0"),
    u64("borrowed1"),
    u64("principle0"),
    u64("principle1"),
    u64("investedLp"),
    u64("lpShares"),
    u64("pendingWithdrawLp"),
    u64("pendingRepay0"),
    u64("pendingRepay1"),
    u128("cumulatedBorrowRate0"),
    u128("cumulatedBorrowRate1"),
    u128("platformRewardsDebt"),
    u8("pendingWithdrawFlag"),
    u16("takeProfitLine"),
])

export function parseUserInfoData(data:any,infoPubkey:PublicKey){
    let bufferedData = Buffer.from(data).slice(8)
    let rawInfo = USER_INFO_LAYOUT.decode(bufferedData);

    let {
        version,
        lastUpdateSlot,
        strategyStateAccount,
        userMainAccount,
        pending0,
        pendingInvestFlag,
        stopLoss,
        tkn0,
        tkn1,
        borrowed0,
        borrowed1,
        principle0,
        principle1,
        investedLp,
        lpShares,
        pendingWithdrawLp,
        pendingRepay0,
        pendingRepay1,
        cumulatedBorrowRate0,
        cumulatedBorrowRate1,
        platformRewardsDebt,
        pendingWithdrawFlag,
        takeProfitLine,
        
    } = rawInfo;
    return new UserInfo(
        infoPubkey,
        version,
        lastUpdateSlot,
        strategyStateAccount,
        userMainAccount,
        pending0,
        pendingInvestFlag,
        stopLoss,
        tkn0,
        tkn1,
        borrowed0,
        borrowed1,
        principle0,
        principle1,
        investedLp,
        lpShares,
        pendingWithdrawLp,
        pendingRepay0,
        pendingRepay1,
        cumulatedBorrowRate0,
        cumulatedBorrowRate1,
        platformRewardsDebt,
        pendingWithdrawFlag,
        takeProfitLine,
        
    )
}

export async function getAllUserPosition(wallet:PublicKey,connection:Connection){
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
            offset: 49,
            bytes: wallet.toString(),
        }
    };
    const sizeFilter: DataSizeFilter = {
        dataSize: 285,
    }
    const filters = [adminIdMemcmp,sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allPosition = await connection.getProgramAccounts(info.lyfRaydiumProgramId, config);
    let allFarm:UserInfo[]=[];
    for(let Position of allPosition){
        allFarm.push(parseUserInfoData(Position.account.data,Position.pubkey))
    }
    return allFarm;
}