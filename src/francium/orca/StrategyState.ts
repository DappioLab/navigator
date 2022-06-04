import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as  info from "./info";

interface StrategyStateInterface {
    infoPubkey: PublicKey;
    protocolVersion: BN;
    protocolSubVersion: BN;
    lastUpdateSlot: BN;
    totalLp: BN;
    totalShares: BN;
    totalBorrowed0: BN;
    totalBorrowed1: BN;
    pendingTkn0: BN;
    pendingTkn1: BN;
    pendingWithdrawLp: BN;
    pendingRepay0: BN;
    pendingRepay1: BN;
    cumulatedBorrowRate0: BN;
    cumulatedBorrowRate1: BN;
    maxLeverage: BN;
    liquidateLine: BN;
    compoundRewardsRate: BN;
    admin: PublicKey;
    authority: PublicKey;
    authorityNonce: BN;
    franciumRewardsEnable: BN;
    franciumRewardsStartSlot: BN;
    franciumRewardsEndSlot: BN;
    franciumRewardsPerSlot: BN;
    franciumAccumulatedRewardsPerShare: BN;
    franciumRewardsTknAccount: PublicKey;
    lendingProgramId: PublicKey;
    ammProgramId: PublicKey;
    stakeProgramId: PublicKey;
    tknAccount0: PublicKey;
    tknAccount1: PublicKey;
    lpTknAccount: PublicKey;
    rewardsTknAccount: PublicKey;
    farmTknAccount: PublicKey;
    lendingPool0: PublicKey;
    strategyLendingCreditAccount0: PublicKey;
    lendingPool1: PublicKey;
    strategyLendingCreditAccount1: PublicKey;
    doubleDipRewardsSwapPoolId: PublicKey;
    doubleDipStrategyRewardsTknAccount: PublicKey;
    swapPoolId: PublicKey;
    rewardsSwapPoolId: PublicKey;
    stakePoolFarmInfo: PublicKey;
    strategyFarmInfo: PublicKey;
    doubleDipFarmTknAccount: PublicKey;
    doubleDipStakePoolFarmInfo: PublicKey;
    doubleDipStrategyFarmInfo: PublicKey;
}

export class StrategyState implements StrategyStateInterface {
    infoPubkey: PublicKey;
    protocolVersion: BN;
    protocolSubVersion: BN;
    lastUpdateSlot: BN;
    totalLp: BN;
    totalShares: BN;
    totalBorrowed0: BN;
    totalBorrowed1: BN;
    pendingTkn0: BN;
    pendingTkn1: BN;
    pendingWithdrawLp: BN;
    pendingRepay0: BN;
    pendingRepay1: BN;
    cumulatedBorrowRate0: BN;
    cumulatedBorrowRate1: BN;
    maxLeverage: BN;
    liquidateLine: BN;
    compoundRewardsRate: BN;
    admin: PublicKey;
    authority: PublicKey;
    authorityNonce: BN;
    franciumRewardsEnable: BN;
    franciumRewardsStartSlot: BN;
    franciumRewardsEndSlot: BN;
    franciumRewardsPerSlot: BN;
    franciumAccumulatedRewardsPerShare: BN;
    franciumRewardsTknAccount: PublicKey;
    lendingProgramId: PublicKey;
    ammProgramId: PublicKey;
    stakeProgramId: PublicKey;
    tknAccount0: PublicKey;
    tknAccount1: PublicKey;
    lpTknAccount: PublicKey;
    rewardsTknAccount: PublicKey;
    farmTknAccount: PublicKey;
    lendingPool0: PublicKey;
    strategyLendingCreditAccount0: PublicKey;
    lendingPool1: PublicKey;
    strategyLendingCreditAccount1: PublicKey;
    doubleDipRewardsSwapPoolId: PublicKey;
    doubleDipStrategyRewardsTknAccount: PublicKey;
    swapPoolId: PublicKey;
    rewardsSwapPoolId: PublicKey;
    stakePoolFarmInfo: PublicKey;
    strategyFarmInfo: PublicKey;
    doubleDipFarmTknAccount: PublicKey;
    doubleDipStakePoolFarmInfo: PublicKey;
    doubleDipStrategyFarmInfo: PublicKey;

    constructor(
        infoPubkey: PublicKey,
        protocolVersion: BN,
        protocolSubVersion: BN,
        lastUpdateSlot: BN,
        totalLp: BN,
        totalShares: BN,
        totalBorrowed0: BN,
        totalBorrowed1: BN,
        pendingTkn0: BN,
        pendingTkn1: BN,
        pendingWithdrawLp: BN,
        pendingRepay0: BN,
        pendingRepay1: BN,
        cumulatedBorrowRate0: BN,
        cumulatedBorrowRate1: BN,
        maxLeverage: BN,
        liquidateLine: BN,
        compoundRewardsRate: BN,
        admin: PublicKey,
        authority: PublicKey,
        authorityNonce: BN,
        franciumRewardsEnable: BN,
        franciumRewardsStartSlot: BN,
        franciumRewardsEndSlot: BN,
        franciumRewardsPerSlot: BN,
        franciumAccumulatedRewardsPerShare: BN,
        franciumRewardsTknAccount: PublicKey,
        lendingProgramId: PublicKey,
        ammProgramId: PublicKey,
        stakeProgramId: PublicKey,
        tknAccount0: PublicKey,
        tknAccount1: PublicKey,
        lpTknAccount: PublicKey,
        rewardsTknAccount: PublicKey,
        farmTknAccount: PublicKey,
        lendingPool0: PublicKey,
        strategyLendingCreditAccount0: PublicKey,
        lendingPool1: PublicKey,
        strategyLendingCreditAccount1: PublicKey,
        doubleDipRewardsSwapPoolId: PublicKey,
        doubleDipStrategyRewardsTknAccount: PublicKey,
        swapPoolId: PublicKey,
        rewardsSwapPoolId: PublicKey,
        stakePoolFarmInfo: PublicKey,
        strategyFarmInfo: PublicKey,
        doubleDipFarmTknAccount: PublicKey,
        doubleDipStakePoolFarmInfo: PublicKey,
        doubleDipStrategyFarmInfo: PublicKey,

    ) {
        this.infoPubkey = infoPubkey
        this.protocolVersion = protocolVersion
        this.protocolSubVersion = protocolSubVersion
        this.lastUpdateSlot = lastUpdateSlot
        this.totalLp = totalLp
        this.totalShares = totalShares
        this.totalBorrowed0 = totalBorrowed0
        this.totalBorrowed1 = totalBorrowed1
        this.pendingTkn0 = pendingTkn0
        this.pendingTkn1 = pendingTkn1
        this.pendingWithdrawLp = pendingWithdrawLp
        this.pendingRepay0 = pendingRepay0
        this.pendingRepay1 = pendingRepay1
        this.cumulatedBorrowRate0 = cumulatedBorrowRate0
        this.cumulatedBorrowRate1 = cumulatedBorrowRate1
        this.maxLeverage = maxLeverage
        this.liquidateLine = liquidateLine
        this.compoundRewardsRate = compoundRewardsRate
        this.admin = admin
        this.authority = authority
        this.authorityNonce = authorityNonce
        this.franciumRewardsEnable = franciumRewardsEnable
        this.franciumRewardsStartSlot = franciumRewardsStartSlot
        this.franciumRewardsEndSlot = franciumRewardsEndSlot
        this.franciumRewardsPerSlot = franciumRewardsPerSlot
        this.franciumAccumulatedRewardsPerShare = franciumAccumulatedRewardsPerShare
        this.franciumRewardsTknAccount = franciumRewardsTknAccount
        this.lendingProgramId = lendingProgramId
        this.ammProgramId = ammProgramId
        this.stakeProgramId = stakeProgramId
        this.tknAccount0 = tknAccount0
        this.tknAccount1 = tknAccount1
        this.lpTknAccount = lpTknAccount
        this.rewardsTknAccount = rewardsTknAccount
        this.farmTknAccount = farmTknAccount
        this.lendingPool0 = lendingPool0
        this.strategyLendingCreditAccount0 = strategyLendingCreditAccount0
        this.lendingPool1 = lendingPool1
        this.strategyLendingCreditAccount1 = strategyLendingCreditAccount1
        this.doubleDipRewardsSwapPoolId = doubleDipRewardsSwapPoolId
        this.doubleDipStrategyRewardsTknAccount = doubleDipStrategyRewardsTknAccount
        this.swapPoolId = swapPoolId
        this.rewardsSwapPoolId = rewardsSwapPoolId
        this.stakePoolFarmInfo = stakePoolFarmInfo
        this.strategyFarmInfo = strategyFarmInfo
        this.doubleDipFarmTknAccount = doubleDipFarmTknAccount
        this.doubleDipStakePoolFarmInfo = doubleDipStakePoolFarmInfo
        this.doubleDipStrategyFarmInfo = doubleDipStrategyFarmInfo
    }
}

export const strategy_State_Layout = struct([
    u8("protocolVersion"),
    u8("protocolSubVersion"),
    u64("lastUpdateSlot"),
    u64("totalLp"),
    u64("totalShares"),
    u64("totalBorrowed0"),
    u64("totalBorrowed1"),
    u64("pendingTkn0"),
    u64("pendingTkn1"),
    u64("pendingWithdrawLp"),
    u64("pendingRepay0"),
    u64("pendingRepay1"),
    u128("cumulatedBorrowRate0"),
    u128("cumulatedBorrowRate1"),
    u8("maxLeverage"),
    u8("liquidateLine"),
    u8("compoundRewardsRate"),
    //117Byte
    publicKey("admin"),
    publicKey("authority"),
    u8("authorityNonce"),
    u8("franciumRewardsEnable"),
    u64("franciumRewardsStartSlot"),
    u64("franciumRewardsEndSlot"),
    u64("franciumRewardsPerSlot"),
    u128("franciumAccumulatedRewardsPerShare"),
    publicKey("franciumRewardsTknAccount"),
    publicKey("lendingProgramId"),
    publicKey("ammProgramId"),
    publicKey("stakeProgramId"),
    publicKey("tknAccount0"),
    publicKey("tknAccount1"),
    publicKey("lpTknAccount"),
    publicKey("rewardsTknAccount"),
    publicKey("farmTknAccount"),
    publicKey("lendingPool0"),
    publicKey("strategyLendingCreditAccount0"),
    publicKey("lendingPool1"),
    publicKey("strategyLendingCreditAccount1"),
    publicKey("doubleDipRewardsSwapPoolId"),
    publicKey("doubleDipStrategyRewardsTknAccount"),
    publicKey("swapPoolId"),
    publicKey("rewardsSwapPoolId"),
    publicKey("stakePoolFarmInfo"),
    publicKey("strategyFarmInfo"),
    publicKey("doubleDipFarmTknAccount"),
    publicKey("doubleDipStakePoolFarmInfo"),
    publicKey("doubleDipStrategyFarmInfo"),
])

export function parseStrategyStateData(data: any, infoPubkey: PublicKey) {
    let bufferedData = Buffer.from(data).slice(8)
    let rawState = strategy_State_Layout.decode(bufferedData);
    let {
        protocolVersion,
        protocolSubVersion,
        lastUpdateSlot,
        totalLp,
        totalShares,
        totalBorrowed0,
        totalBorrowed1,
        pendingTkn0,
        pendingTkn1,
        pendingWithdrawLp,
        pendingRepay0,
        pendingRepay1,
        cumulatedBorrowRate0,
        cumulatedBorrowRate1,
        maxLeverage,
        liquidateLine,
        compoundRewardsRate,
        admin,
        authority,
        authorityNonce,
        franciumRewardsEnable,
        franciumRewardsStartSlot,
        franciumRewardsEndSlot,
        franciumRewardsPerSlot,
        franciumAccumulatedRewardsPerShare,
        franciumRewardsTknAccount,
        lendingProgramId,
        ammProgramId,
        stakeProgramId,
        tknAccount0,
        tknAccount1,
        lpTknAccount,
        rewardsTknAccount,
        farmTknAccount,
        lendingPool0,
        strategyLendingCreditAccount0,
        lendingPool1,
        strategyLendingCreditAccount1,
        doubleDipRewardsSwapPoolId,
        doubleDipStrategyRewardsTknAccount,
        swapPoolId,
        rewardsSwapPoolId,
        stakePoolFarmInfo,
        strategyFarmInfo,
        doubleDipFarmTknAccount,
        doubleDipStakePoolFarmInfo,
        doubleDipStrategyFarmInfo,
    } = rawState;
    return new StrategyState(
        infoPubkey,
        protocolVersion,
        protocolSubVersion,
        lastUpdateSlot,
        totalLp,
        totalShares,
        totalBorrowed0,
        totalBorrowed1,
        pendingTkn0,
        pendingTkn1,
        pendingWithdrawLp,
        pendingRepay0,
        pendingRepay1,
        cumulatedBorrowRate0,
        cumulatedBorrowRate1,
        maxLeverage,
        liquidateLine,
        compoundRewardsRate,
        admin,
        authority,
        authorityNonce,
        franciumRewardsEnable,
        franciumRewardsStartSlot,
        franciumRewardsEndSlot,
        franciumRewardsPerSlot,
        franciumAccumulatedRewardsPerShare,
        franciumRewardsTknAccount,
        lendingProgramId,
        ammProgramId,
        stakeProgramId,
        tknAccount0,
        tknAccount1,
        lpTknAccount,
        rewardsTknAccount,
        farmTknAccount,
        lendingPool0,
        strategyLendingCreditAccount0,
        lendingPool1,
        strategyLendingCreditAccount1,
        doubleDipRewardsSwapPoolId,
        doubleDipStrategyRewardsTknAccount,
        swapPoolId,
        rewardsSwapPoolId,
        stakePoolFarmInfo,
        strategyFarmInfo,
        doubleDipFarmTknAccount,
        doubleDipStakePoolFarmInfo,
        doubleDipStrategyFarmInfo)
}