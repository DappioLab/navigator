import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IInstancePool, IPoolInfo, IPoolInfoWrapper } from "../types";
import { CONFIG_LAYOUT, LIFINITY_AMM_LAYOUT } from "./layouts";
import { LIFINITY_ALL_AMM_ID } from "./ids";

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

let infos: IInstancePool;

infos = class InstanceLifinity {
  static async getAllPools(connection: Connection): Promise<PoolInfo[]> {
    const allLifinityAccount = await connection.getMultipleAccountsInfo(LIFINITY_ALL_AMM_ID);

    const poolInfoAndConfigKeys = allLifinityAccount
      .filter((accountInfo) => accountInfo)
      .map((accountInfo, index) => {
        const poolInfo = this.parsePool(accountInfo!.data, LIFINITY_ALL_AMM_ID[index]);
        return { poolInfo, poolConfigKey: poolInfo.poolConfig.key };
      });

    const poolConfigInfos = await connection.getMultipleAccountsInfo(poolInfoAndConfigKeys.map((p) => p.poolConfigKey));

    return poolInfoAndConfigKeys.map((poolInfoAndConfigKey, index) => ({
      ...poolInfoAndConfigKey.poolInfo,
      poolConfig: this._parsePoolConfig(poolConfigInfos[index]?.data, poolInfoAndConfigKeys[index].poolConfigKey),
    }));
  }

  static async getAllPoolWrappers(connection: Connection): Promise<IPoolInfoWrapper[]> {
    return [];
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<PoolInfo> {
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

  static parsePool(data: Buffer, poolId: PublicKey): PoolInfo {
    const decodedData = LIFINITY_AMM_LAYOUT.decode(data);
    let {
      index,
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
      index: new BN(index),
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
      poolConfig: { ...defaultPoolConfig, key: configAccount },
      tradeFee: new BN(tradeFee),
      hostFee: new BN(hostFee),
      curveType: new BN(curveType),
      curveParameters: new BN(curveParameters),
    };
  }
  private static _parsePoolConfig(data: any, pubkey: PublicKey): PoolConfig {
    const decodedData = CONFIG_LAYOUT.decode(data);
    let {
      index,
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
      index: new BN(index),
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

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

export interface PoolInfo extends IPoolInfo {
  index: BN; // discriminator
  initializerKey: PublicKey;
  initializerDepositTokenAccount: PublicKey;
  initializerReceiveTokenAccount: PublicKey;
  initializerAmount: BN;
  takerAmount: BN;
  initialized: BN;
  bumpSeed: BN;
  freezeTrade: BN;
  freezeDeposit: BN;
  freezeWithdraw: BN;
  baseDecimals: BN;
  tokenProgramId: PublicKey;
  tokenAAccount: PublicKey;
  tokenBAccount: PublicKey;
  poolFeeAccount: PublicKey;
  pythAccount: PublicKey;
  pythPcAccount: PublicKey;
  poolConfig: PoolConfig;
  tradeFee: BN;
  hostFee: BN;
  curveType: BN;
  curveParameters: BN;
}

interface PoolConfig {
  key: PublicKey;
  index: BN; // discriminator
  concentrationRatio: BN;
  lastPrice: BN;
  adjustRatio: BN;
  balanceRatio: BN;
  lastBalancedPrice: BN;
  configDenominator: BN;
  pythConfidenceLimit: BN;
  pythSlotLimit: BN;
  volumeX: BN;
  volumeY: BN;
  volumeXinY: BN;
  coefficientUp: BN;
  coefficientDown: BN;
  oracleStatus: BN;
  depositCap: BN;
  configTemp2: BN;
}

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: PoolInfo) {}

  getTargetLiquidity() {
    return this.poolInfo.poolConfig.depositCap;
  }
}

const DIGIT = new BN(10000000000);

export const defaultPoolConfig: PoolConfig = {
  key: new PublicKey(0),
  index: new BN(0),
  concentrationRatio: new BN(0),
  lastPrice: new BN(0),
  adjustRatio: new BN(0),
  balanceRatio: new BN(0),
  lastBalancedPrice: new BN(0),
  configDenominator: new BN(0),
  pythConfidenceLimit: new BN(0),
  pythSlotLimit: new BN(0),
  volumeX: new BN(0),
  volumeY: new BN(0),
  volumeXinY: new BN(0),
  coefficientUp: new BN(0),
  coefficientDown: new BN(0),
  oracleStatus: new BN(0),
  depositCap: new BN(0),
  configTemp2: new BN(0),
};
