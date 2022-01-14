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
    admin: PublicKey;
    authority: PublicKey;
    authorityNonce: BN;
    tokenProgramId: PublicKey;
    tknAccount0: PublicKey;
    tknAccount1: PublicKey;
    lpAccount: PublicKey;
    rewardAccount: PublicKey;
    rewardAccountB: PublicKey;
    lendingProgramId: PublicKey;
    lendingPool0: PublicKey;
    strategyLendingCreditAccount0: PublicKey;
    lendingPool1: PublicKey;
    strategyLendingCreditAccount1: PublicKey;
    platformRewardsEnable: BN;
    rewardsStartSlot: BN;
    rewardsEndSlot: BN;
    rewardsPerSlot: BN;
    platformRewardsTknMint: PublicKey;
    platformRewardsTknAccount: PublicKey;
    accumulatedRewardsPerShare: BN;
    maxLeverage: BN;
    liquidateLine: BN;
    compoundRewardsRate: BN;
    ammProgramId: PublicKey;
    ammId: PublicKey;
    ammIdForRewards: PublicKey;
    ammIdForRewardsB: PublicKey;
    stakeProgramId: PublicKey;
    swapPoolId: PublicKey;
    stakePoolTkn: PublicKey;
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
    admin: PublicKey;
    authority: PublicKey;
    authorityNonce: BN;
    tokenProgramId: PublicKey;
    tknAccount0: PublicKey;
    tknAccount1: PublicKey;
    lpAccount: PublicKey;
    rewardAccount: PublicKey;
    rewardAccountB: PublicKey;
    lendingProgramId: PublicKey;
    lendingPool0: PublicKey;
    strategyLendingCreditAccount0: PublicKey;
    lendingPool1: PublicKey;
    strategyLendingCreditAccount1: PublicKey;
    platformRewardsEnable: BN;
    rewardsStartSlot: BN;
    rewardsEndSlot: BN;
    rewardsPerSlot: BN;
    platformRewardsTknMint: PublicKey;
    platformRewardsTknAccount: PublicKey;
    accumulatedRewardsPerShare: BN;
    maxLeverage: BN;
    liquidateLine: BN;
    compoundRewardsRate: BN;
    ammProgramId: PublicKey;
    ammId: PublicKey;
    ammIdForRewards: PublicKey;
    ammIdForRewardsB: PublicKey;
    stakeProgramId: PublicKey;
    swapPoolId: PublicKey;
    stakePoolTkn: PublicKey;

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
        admin: PublicKey,
        authority: PublicKey,
        authorityNonce: BN,
        tokenProgramId: PublicKey,
        tknAccount0: PublicKey,
        tknAccount1: PublicKey,
        lpAccount: PublicKey,
        rewardAccount: PublicKey,
        rewardAccountB: PublicKey,
        lendingProgramId: PublicKey,
        lendingPool0: PublicKey,
        strategyLendingCreditAccount0: PublicKey,
        lendingPool1: PublicKey,
        strategyLendingCreditAccount1: PublicKey,
        platformRewardsEnable: BN,
        rewardsStartSlot: BN,
        rewardsEndSlot: BN,
        rewardsPerSlot: BN,
        platformRewardsTknMint: PublicKey,
        platformRewardsTknAccount: PublicKey,
        accumulatedRewardsPerShare: BN,
        maxLeverage: BN,
        liquidateLine: BN,
        compoundRewardsRate: BN,
        ammProgramId: PublicKey,
        ammId: PublicKey,
        ammIdForRewards: PublicKey,
        ammIdForRewardsB: PublicKey,
        stakeProgramId: PublicKey,
        swapPoolId: PublicKey,
        stakePoolTkn: PublicKey,
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
        this.platformRewardsEnable = platformRewardsEnable
        this.rewardsStartSlot = rewardsStartSlot
        this.rewardsEndSlot = rewardsEndSlot
        this.rewardsPerSlot = rewardsPerSlot
        this.accumulatedRewardsPerShare = accumulatedRewardsPerShare
        this.platformRewardsTknAccount = platformRewardsTknAccount
        this.lendingProgramId = lendingProgramId
        this.ammProgramId = ammProgramId
        this.stakeProgramId = stakeProgramId
        this.tknAccount0 = tknAccount0
        this.tknAccount1 = tknAccount1
        this.tokenProgramId = tokenProgramId
        this.lpAccount = lpAccount
        this.rewardAccount = rewardAccount
        this.lendingPool0 = lendingPool0
        this.strategyLendingCreditAccount0 = strategyLendingCreditAccount0
        this.lendingPool1 = lendingPool1
        this.strategyLendingCreditAccount1 = strategyLendingCreditAccount1
        this.rewardAccountB = rewardAccountB
        this.platformRewardsTknMint = platformRewardsTknMint
        this.swapPoolId = swapPoolId
        this.ammId = ammId
        this.ammIdForRewards = ammIdForRewards
        this.ammIdForRewardsB = ammIdForRewardsB
        this.stakePoolTkn = stakePoolTkn
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
    //114Byte
    publicKey("admin"),
    publicKey("authority"),
    u8("authorityNonce"),
    publicKey("tokenProgramId"),
    publicKey("tknAccount0"),
    publicKey("tknAccount1"),
    publicKey("lpAccount"),
    publicKey("rewardAccount"),
    publicKey("rewardAccountB"),
    publicKey("lendingProgramId"),
    publicKey("lendingPool0"),
    publicKey("strategyLendingCreditAccount0"),
    publicKey("lendingPool1"),
    publicKey("strategyLendingCreditAccount1"),
    u8("platformRewardsEnable"),
    u64("rewardsStartSlot"),
    u64("rewardsEndSlot"),
    u64("rewardsPerSlot"),
    publicKey("platformRewardsTknMint"),
    publicKey("platformRewardsTknAccount"),
    u128("accumulatedRewardsPerShare"),
    u8("maxLeverage"),
    u8("liquidateLine"),
    u8("compoundRewardsRate"),
    publicKey("ammProgramId"),
    publicKey("ammId"),
    publicKey("ammIdForRewards"),
    publicKey("ammIdForRewardsB"),
    publicKey("stakeProgramId"),
    publicKey("stakePoolId"),
    publicKey("stakePoolTkn"),
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
        admin,
        authority,
        authorityNonce,
        tokenProgramId,
        tknAccount0,
        tknAccount1,
        lpAccount,
        rewardAccount,
        rewardAccountB,
        lendingProgramId,
        lendingPool0,
        strategyLendingCreditAccount0,
        lendingPool1,
        strategyLendingCreditAccount1,
        platformRewardsEnable,
        rewardsStartSlot,
        rewardsEndSlot,
        rewardsPerSlot,
        platformRewardsTknMint,
        platformRewardsTknAccount,
        accumulatedRewardsPerShare,
        maxLeverage,
        liquidateLine,
        compoundRewardsRate,
        ammProgramId,
        ammId,
        ammIdForRewards,
        ammIdForRewardsB,
        stakeProgramId,
        swapPoolId,
        stakePoolTkn,
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
        admin,
        authority,
        authorityNonce,
        tokenProgramId,
        tknAccount0,
        tknAccount1,
        lpAccount,
        rewardAccount,
        rewardAccountB,
        lendingProgramId,
        lendingPool0,
        strategyLendingCreditAccount0,
        lendingPool1,
        strategyLendingCreditAccount1,
        platformRewardsEnable,
        rewardsStartSlot,
        rewardsEndSlot,
        rewardsPerSlot,
        platformRewardsTknMint,
        platformRewardsTknAccount,
        accumulatedRewardsPerShare,
        maxLeverage,
        liquidateLine,
        compoundRewardsRate,
        ammProgramId,
        ammId,
        ammIdForRewards,
        ammIdForRewardsB,
        stakeProgramId,
        swapPoolId,
        stakePoolTkn
        )
}