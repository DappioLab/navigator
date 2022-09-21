import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IInstancePool, IPoolInfoWrapper } from "../types";
import { CONFIG_LAYOUT, LIFINITY_AMM_LAYOUT } from "./layouts";
import { LIFINITY_ALL_AMM_ID } from "./ids";
import * as types from ".";
import { getMultipleAccounts } from "../utils";

const DIGIT = new BN(10000000000);

let infos: IInstancePool;

infos = class InstanceLifinity {
  static async getAllPools(connection: Connection): Promise<types.PoolInfo[]> {
    const lifinityAccounts = await getMultipleAccounts(connection, LIFINITY_ALL_AMM_ID);

    const pools = lifinityAccounts
      .filter((accountInfo) => accountInfo)
      .map((accountInfo) => {
        const pool = this.parsePool(accountInfo.account!.data, accountInfo.pubkey);
        return pool;
      });

    const poolConfigKeys = pools.map((p) => p.poolConfig.key);
    const poolConfigInfos = await getMultipleAccounts(connection, poolConfigKeys);

    return pools.map((pool, index) => ({
      ...pool,
      poolConfig: this._parsePoolConfig(poolConfigInfos[index].account?.data, pools[index].poolConfig.key),
    }));
  }

  static async getAllPoolWrappers(connection: Connection): Promise<PoolInfoWrapper[]> {
    const pools = await this.getAllPools(connection);
    return pools.map((pool) => new PoolInfoWrapper(pool));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<types.PoolInfo> {
    const lifinityAccount = await connection.getAccountInfo(poolId);
    if (!lifinityAccount) throw Error("Could not get Lifinity Account info");
    let poolInfo = this.parsePool(lifinityAccount.data, poolId);
    const poolConfigInfo = await connection.getAccountInfo(poolInfo.poolConfig.key);
    const poolConfig = this._parsePoolConfig(poolConfigInfo?.data, poolInfo.poolConfig.key);

    return {
      ...poolInfo,
      poolConfig,
    };
  }

  static async getPoolWrapper(connection: Connection, poolId: PublicKey): Promise<PoolInfoWrapper> {
    const pool = await this.getPool(connection, poolId);
    return new PoolInfoWrapper(pool);
  }

  static parsePool(data: Buffer, poolId: PublicKey): types.PoolInfo {
    const decodedData = LIFINITY_AMM_LAYOUT.decode(data);
    let {
      initializerKey,
      initializerDepositTokenAccount,
      initializerReceiveTokenAccount,
      initializerAmount,
      takerAmount,
      initialized,
      bumpSeed,
      freezeTrade,
      freezeDeposit,
      freezeWithdraw,
      baseDecimals,
      tokenProgramId,
      tokenAAccount,
      tokenBAccount,
      poolMint,
      tokenAMint,
      tokenBMint,
      poolFeeAccount,
      pythAccount,
      pythPcAccount,
      configAccount,
      tradeFeeNumerator,
      tradeFeeDenominator,
      hostFeeNumerator,
      hostFeeDenominator,
      curveType,
      curveParameters,
    } = decodedData;

    const tradeFee = tradeFeeDenominator.isZero()
      ? tradeFeeDenominator
      : tradeFeeNumerator.mul(DIGIT).div(tradeFeeDenominator);
    const hostFee = hostFeeDenominator.isZero()
      ? hostFeeDenominator
      : hostFeeNumerator.mul(DIGIT).div(hostFeeDenominator);

    return {
      poolId,
      initializerKey,
      initializerDepositTokenAccount,
      initializerReceiveTokenAccount,
      initializerAmount: new BN(initializerAmount),
      takerAmount: new BN(takerAmount),
      initialized: new BN(initialized),
      bumpSeed: new BN(bumpSeed),
      freezeTrade: new BN(freezeTrade),
      freezeDeposit: new BN(freezeDeposit),
      freezeWithdraw: new BN(freezeWithdraw),
      baseDecimals: new BN(baseDecimals),
      tokenProgramId,
      tokenAAccount,
      tokenBAccount,
      lpMint: poolMint,
      tokenAMint,
      tokenBMint,
      poolFeeAccount,
      pythAccount,
      pythPcAccount,
      poolConfig: { ...types.defaultPoolConfig, key: configAccount },
      tradeFee: new BN(tradeFee),
      hostFee: new BN(hostFee),
      curveType: new BN(curveType),
      curveParameters: new BN(curveParameters),
    };
  }
  private static _parsePoolConfig(data: any, pubkey: PublicKey): types.PoolConfig {
    const decodedData = CONFIG_LAYOUT.decode(data);
    let {
      concentrationRatio,
      lastPrice,
      adjustRatio,
      balanceRatio,
      lastBalancedPrice,
      configDenominator,
      pythConfidenceLimit,
      pythSlotLimit,
      volumeX,
      volumeY,
      volumeXinY,
      coefficientUp,
      coefficientDown,
      oracleStatus,
      depositCap,
      configTemp2,
    } = decodedData;

    return {
      key: pubkey,
      concentrationRatio: new BN(concentrationRatio),
      lastPrice: new BN(lastPrice),
      adjustRatio: new BN(adjustRatio),
      balanceRatio: new BN(balanceRatio),
      lastBalancedPrice: new BN(lastBalancedPrice),
      configDenominator: new BN(configDenominator),
      pythConfidenceLimit: new BN(pythConfidenceLimit),
      pythSlotLimit: new BN(pythSlotLimit),
      volumeX: new BN(volumeX),
      volumeY: new BN(volumeY),
      volumeXinY: new BN(volumeXinY),
      coefficientUp: new BN(coefficientUp),
      coefficientDown: new BN(coefficientDown),
      oracleStatus: new BN(oracleStatus),
      depositCap: new BN(depositCap),
      configTemp2: new BN(configTemp2),
    };
  }
};

export { infos };

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: types.PoolInfo) {}

  getTokenAmounts(lpAmount: number): { tokenAAmount: number; tokenBAmount: number } {
    // TODO
    return { tokenAAmount: 0, tokenBAmount: 0 };
  }
  getLpAmount(tokenAmount: number, tokenMint: PublicKey): number {
    // TODO
    return 0;
  }
  getLpPrice(tokenAPrice: number, tokenBPrice: number): number {
    // TODO
    return 0;
  }

  getApr(tradingVolumeIn24Hours: number, lpPrice: number): number {
    // TODO
    return 0;
  }

  getLiquidityUpperCap() {
    return this.poolInfo.poolConfig.depositCap;
  }
}
