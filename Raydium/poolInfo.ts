import {
    publicKey,
    struct,
    u64,
    u128,
    u8,
    bool,
    u16,
    i64,
} from "@project-serum/borsh";
import { OpenOrders } from "@project-serum/serum";
import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import { parseTokenAccount } from "../util";
import { } from "./info";

export interface LiquidityPoolInfo {
    infoPubkey: PublicKey;
    version: number;
    status: BN;
    nonce: BN;
    orderNum: BN;
    depth: BN;
    coinDecimals: BN;
    pcDecimals: BN;
    state: BN;
    resetFlag: BN;
    minSize: BN;
    volMaxCutRatio: BN;
    amountWaveRatio: BN;
    coinLotSize: BN;
    pcLotSize: BN;
    minPriceMultiplier: BN;
    maxPriceMultiplier: BN;
    needTakePnlCoin: BN;
    needTakePnlPc: BN;
    totalPnlPc: BN;
    totalPnlCoin: BN;
    poolTotalDepositPc: BN;
    poolTotalDepositCoin: BN;
    systemDecimalsValue: BN;
    poolCoinTokenAccount: PublicKey;
    poolPcTokenAccount: PublicKey;
    coinMintAddress: PublicKey;
    pcMintAddress: PublicKey;
    lpMintAddress: PublicKey;
    ammOpenOrders: PublicKey;
    serumMarket: PublicKey;
    serumProgramId: PublicKey;
    ammTargetOrders: PublicKey;
    poolWithdrawQueue: PublicKey;
    poolTempLpTokenAccount: PublicKey;
    ammOwner: PublicKey;
    pnlOwner: PublicKey;
    coinAccountAmount?: BN;
    pcAccountAmount?: BN;
    srmTokenAccount?: PublicKey;
    ammQuantities?: PublicKey;
}
export class PoolInfo implements LiquidityPoolInfo {
    infoPubkey: PublicKey;
    version: number;
    status: BN;
    nonce: BN;
    orderNum: BN;
    depth: BN;
    coinDecimals: BN;
    pcDecimals: BN;
    state: BN;
    resetFlag: BN;
    minSize: BN;
    volMaxCutRatio: BN;
    amountWaveRatio: BN;
    coinLotSize: BN;
    pcLotSize: BN;
    minPriceMultiplier: BN;
    maxPriceMultiplier: BN;
    needTakePnlCoin: BN;
    needTakePnlPc: BN;
    totalPnlPc: BN;
    totalPnlCoin: BN;
    poolTotalDepositPc: BN;
    poolTotalDepositCoin: BN;
    systemDecimalsValue: BN;
    poolCoinTokenAccount: PublicKey;
    poolPcTokenAccount: PublicKey;
    coinMintAddress: PublicKey;
    pcMintAddress: PublicKey;
    lpMintAddress: PublicKey;
    ammOpenOrders: PublicKey;
    serumMarket: PublicKey;
    serumProgramId: PublicKey;
    ammTargetOrders: PublicKey;
    poolWithdrawQueue: PublicKey;
    poolTempLpTokenAccount: PublicKey;
    ammOwner: PublicKey;
    pnlOwner: PublicKey;
    coinAccountAmount?: BN;
    pcAccountAmount?: BN;
    ammOrderbaseTokenTotal?: BN;
    ammOrderquoteTokenTotal?: BN;
    srmTokenAccount?: PublicKey;
    ammQuantities?: PublicKey;
    constructor(
        infoPubkey: PublicKey,
        version: number,
        status: BN,
        nonce: BN,
        orderNum: BN,
        depth: BN,
        coinDecimals: BN,
        pcDecimals: BN,
        state: BN,
        resetFlag: BN,
        minSize: BN,
        volMaxCutRatio: BN,
        amountWaveRatio: BN,
        coinLotSize: BN,
        pcLotSize: BN,
        minPriceMultiplier: BN,
        maxPriceMultiplier: BN,
        needTakePnlCoin: BN,
        needTakePnlPc: BN,
        totalPnlPc: BN,
        totalPnlCoin: BN,
        poolTotalDepositPc: BN,
        poolTotalDepositCoin: BN,
        systemDecimalsValue: BN,
        poolCoinTokenAccount: PublicKey,
        poolPcTokenAccount: PublicKey,
        coinMintAddress: PublicKey,
        pcMintAddress: PublicKey,
        lpMintAddress: PublicKey,
        ammOpenOrders: PublicKey,
        serumMarket: PublicKey,
        serumProgramId: PublicKey,
        ammTargetOrders: PublicKey,
        poolWithdrawQueue: PublicKey,
        poolTempLpTokenAccount: PublicKey,
        ammOwner: PublicKey,
        pnlOwner: PublicKey,
        srmTokenAccount?: PublicKey,
        ammQuantities?: PublicKey,
    ) {
        this.totalPnlPc = totalPnlPc;
        this.totalPnlCoin = totalPnlCoin;
        this.infoPubkey = infoPubkey;
        this.version = version;
        this.status = status;
        this.nonce = nonce;
        this.orderNum = orderNum;
        this.depth = depth;
        this.coinDecimals = coinDecimals;
        this.pcDecimals = pcDecimals;
        this.state = state;
        this.resetFlag = resetFlag;
        this.minSize = minSize;
        this.volMaxCutRatio = volMaxCutRatio;
        this.amountWaveRatio = amountWaveRatio;
        this.coinLotSize = coinLotSize;
        this.pcLotSize = pcLotSize;
        this.minPriceMultiplier = minPriceMultiplier;
        this.maxPriceMultiplier = maxPriceMultiplier;
        this.needTakePnlCoin = needTakePnlCoin;
        this.needTakePnlPc = needTakePnlPc;
        this.poolTotalDepositPc = poolTotalDepositPc;
        this.poolTotalDepositCoin = poolTotalDepositCoin;
        this.systemDecimalsValue = systemDecimalsValue;
        this.poolCoinTokenAccount = poolCoinTokenAccount;
        this.poolPcTokenAccount = poolPcTokenAccount;
        this.coinMintAddress = coinMintAddress;
        this.pcMintAddress = pcMintAddress;
        this.lpMintAddress = lpMintAddress;
        this.ammOpenOrders = ammOpenOrders;
        this.serumMarket = serumMarket;
        this.serumProgramId = serumProgramId;
        this.ammTargetOrders = ammTargetOrders;
        this.ammQuantities = ammQuantities;
        this.poolWithdrawQueue = poolWithdrawQueue;
        this.poolTempLpTokenAccount = poolTempLpTokenAccount;
        this.ammOwner = ammOwner;
        this.pnlOwner = pnlOwner;
        this.srmTokenAccount = srmTokenAccount;
    }
    async calculateSwapOutAmount(fromSide: string, amountIn: BN, connection: Connection) {
        let pool = await this.updatePoolAmount(connection);
        if (fromSide == "coin") {
            let x1 = pool.coinAccountAmount
                ?.add(pool.ammOrderbaseTokenTotal as BN)
                .sub(pool.needTakePnlCoin) as BN;
            let y1 = pool.pcAccountAmount
                ?.add(pool.ammOrderquoteTokenTotal as BN)
                .sub(pool.needTakePnlPc) as BN;
            let k = x1.mul(y1);
            let x2 = x1.add(amountIn);
            let y2 = k.div(x2);
            let amountOut = y1.sub(y2);


            return amountOut;
        } else if (fromSide == "pc") {
            let x1 = pool.pcAccountAmount
                ?.add(pool.ammOrderquoteTokenTotal as BN)
                .sub(pool.needTakePnlPc) as BN;
            let y1 = pool.coinAccountAmount
                ?.add(pool.ammOrderbaseTokenTotal as BN)
                .sub(pool.needTakePnlCoin) as BN;
            let k = x1.mul(y1);
            let x2 = x1.add(amountIn);
            let y2 = k.div(x2);
            let amountOut = y1.sub(y2);


            return amountOut;
        }

        return new BN(0);
    }
    async updatePoolAmount(connection: Connection) {
        let accounts: PublicKey[] = [];
        accounts.push(this.poolPcTokenAccount);
        accounts.push(this.poolCoinTokenAccount);
        accounts.push(this.ammOpenOrders);
        let infos = (await connection.getMultipleAccountsInfo(
            accounts,
        )) as AccountInfo<Buffer>[];

        let pc = parseTokenAccount(
            infos[0].data,
            accounts[0],
        );
        this.pcAccountAmount = pc.amount;
        let coin = parseTokenAccount(
            infos[1].data,
            accounts[1],
        );
        this.coinAccountAmount = coin.amount;
        let ammOrder = OpenOrders.fromAccountInfo(
            accounts[2],
            infos[2],
            this.serumProgramId,
        );
        this.ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
        this.ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
        return this
    }

}

export const AMM_INFO_LAYOUT_V4 = struct([
    u64("status"),
    u64("nonce"),
    u64("orderNum"),
    u64("depth"),
    u64("coinDecimals"),
    u64("pcDecimals"),
    u64("state"),
    u64("resetFlag"),
    u64("minSize"),
    u64("volMaxCutRatio"),
    u64("amountWaveRatio"),
    u64("coinLotSize"),
    u64("pcLotSize"),
    u64("minPriceMultiplier"),
    u64("maxPriceMultiplier"),
    u64("systemDecimalsValue"),
    // Fees
    u64("minSeparateNumerator"),
    u64("minSeparateDenominator"),
    u64("tradeFeeNumerator"),
    u64("tradeFeeDenominator"),
    u64("pnlNumerator"),
    u64("pnlDenominator"),
    u64("swapFeeNumerator"),
    u64("swapFeeDenominator"),
    // OutPutData
    u64("needTakePnlCoin"),
    u64("needTakePnlPc"),
    u64("totalPnlPc"),
    u64("totalPnlCoin"),
    u128("poolTotalDepositPc"),
    u128("poolTotalDepositCoin"),
    u128("swapCoinInAmount"),
    u128("swapPcOutAmount"),
    u64("swapCoin2PcFee"),
    u128("swapPcInAmount"),
    u128("swapCoinOutAmount"),
    u64("swapPc2CoinFee"),

    publicKey("poolCoinTokenAccount"),
    publicKey("poolPcTokenAccount"),
    publicKey("coinMintAddress"),
    publicKey("pcMintAddress"),
    publicKey("lpMintAddress"),
    publicKey("ammOpenOrders"),
    publicKey("serumMarket"),
    publicKey("serumProgramId"),
    publicKey("ammTargetOrders"),
    publicKey("poolWithdrawQueue"),
    publicKey("poolTempLpTokenAccount"),
    publicKey("ammOwner"),
    publicKey("pnlOwner"),
]);

export function parseV4PoolInfo(data: any, infoPubkey: PublicKey) {
    let poolData = Buffer.from(data);
    let rawPoolData = AMM_INFO_LAYOUT_V4.decode(poolData);
    let {
        status,
        nonce,
        orderNum,
        depth,
        coinDecimals,
        pcDecimals,
        state,
        resetFlag,
        minSize,
        volMaxCutRatio,
        amountWaveRatio,
        coinLotSize,
        pcLotSize,
        minPriceMultiplier,
        maxPriceMultiplier,
        systemDecimalsValue,
        minSeparateNumerator,
        minSeparateDenominator,
        tradeFeeNumerator,
        tradeFeeDenominator,
        pnlNumerator,
        pnlDenominator,
        swapFeeNumerator,
        swapFeeDenominator,
        needTakePnlCoin,
        needTakePnlPc,
        totalPnlPc,
        totalPnlCoin,
        poolTotalDepositPc,
        poolTotalDepositCoin,
        swapCoinInAmount,
        swapPcOutAmount,
        swapCoin2PcFee,
        swapPcInAmount,
        swapCoinOutAmount,
        swapPc2CoinFee,
        poolCoinTokenAccount,
        poolPcTokenAccount,
        coinMintAddress,
        pcMintAddress,
        lpMintAddress,
        ammOpenOrders,
        serumMarket,
        serumProgramId,
        ammTargetOrders,
        poolWithdrawQueue,
        poolTempLpTokenAccount,
        ammOwner,
        pnlOwner,
    } = rawPoolData;
    return new PoolInfo(
        infoPubkey,
        4,
        status,
        nonce,
        orderNum,
        depth,
        coinDecimals,
        pcDecimals,
        state,
        resetFlag,
        minSize,
        volMaxCutRatio,
        amountWaveRatio,
        coinLotSize,
        pcLotSize,
        minPriceMultiplier,
        maxPriceMultiplier,
        needTakePnlCoin,
        needTakePnlPc,
        totalPnlPc,
        totalPnlCoin,
        poolTotalDepositPc,
        poolTotalDepositCoin,
        systemDecimalsValue,
        poolCoinTokenAccount,
        poolPcTokenAccount,
        coinMintAddress,
        pcMintAddress,
        lpMintAddress,
        ammOpenOrders,
        serumMarket,
        serumProgramId,
        ammTargetOrders,
        poolWithdrawQueue,
        poolTempLpTokenAccount,
        ammOwner,
        pnlOwner,
    );
}

export async function updateAllTokenAmount(
    pools: PoolInfo[],
    connection: Connection,
) {
    let accounts: PublicKey[] = [];
    let allAccountInfo: AccountInfo<Buffer>[] = [];
    for (let pool of pools) {
        accounts.push(pool.poolPcTokenAccount);
        accounts.push(pool.poolCoinTokenAccount);
        accounts.push(pool.ammOpenOrders);
        if (accounts.length > 96) {
            let infos = (await connection.getMultipleAccountsInfo(
                accounts,
            )) as AccountInfo<Buffer>[];
            allAccountInfo = allAccountInfo.concat(infos);
            accounts = [];
        }
    }
    let infos = (await connection.getMultipleAccountsInfo(
        accounts,
    )) as AccountInfo<Buffer>[];
    allAccountInfo = allAccountInfo.concat(infos);
    for (let index = 0; index < pools.length; index++) {
        let pc = parseTokenAccount(
            allAccountInfo[index * 3].data,
            pools[index].poolPcTokenAccount,
        );
        pools[index].pcAccountAmount = pc.amount;
        let coin = parseTokenAccount(
            allAccountInfo[index * 3 + 1].data,
            pools[index].poolCoinTokenAccount,
        );
        pools[index].coinAccountAmount = coin.amount;
        let ammOrder = OpenOrders.fromAccountInfo(
            pools[index].ammOpenOrders,
            allAccountInfo[index * 3 + 2],
            pools[index].serumProgramId,
        );
        pools[index].ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
        pools[index].ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
    }
    return pools
}
