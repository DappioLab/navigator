import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { IFarmerInfo, IFarmInfo, IPoolInfo, IPoolInfoWrapper } from "../types";
import { MintLayout } from "@solana/spl-token-v2";
import { CONFIG_LAYOUT, LIFINITY_AMM_LAYOUT } from "./layouts";
import { LIFINITY_ALL_AMM_ID, LIFINITY_PROGRAM_ID } from "./ids";
import axios from "axios";
import { getTokenList, IServicesTokenInfo } from "../utils";

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
  symbol: string | null;
  apr: number | null;
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

function getPoolSymbol(
  tokenAMint: string,
  tokenBMint: string,
  tokenList: IServicesTokenInfo[]
) {
  let symbol = null;
  const tokenA = tokenList.find((token) => token.mint === tokenAMint)?.symbol;
  const tokenB = tokenList.find((token) => token.mint === tokenBMint)?.symbol;

  if (tokenA && tokenB) {
    symbol = `${tokenA}-${tokenB}`;
  }
  return symbol;
}

export async function getAllPools(connection: Connection): Promise<PoolInfo[]> {
  const allAPIPools: { symbol: string; aprIncPL: number }[] = await (
    await axios.get("https://lifinity.io/api/poolinfo")
  ).data;
  const tokenList = await getTokenList();

  const allLifinityAccount = await connection.getMultipleAccountsInfo(
    LIFINITY_ALL_AMM_ID
  );

  let poolConfigArray: PublicKey[] = [];
  let poolInfoArray: PoolInfo[] = [];

  for (let index in allLifinityAccount) {
    const lifinityAccount = allLifinityAccount[index];
    const poolInfo = parsePoolInfo(
      lifinityAccount?.data,
      LIFINITY_ALL_AMM_ID[index]
    );

    let symbol = getPoolSymbol(
      poolInfo.tokenAMint.toBase58(),
      poolInfo.tokenBMint.toBase58(),
      tokenList
    );
    poolInfo.symbol = symbol;

    let apr = null;
    let lifinityAPR = allAPIPools.find(
      (pool) => pool.symbol === symbol
    )?.aprIncPL;
    if (lifinityAPR) {
      apr = lifinityAPR;
    }
    poolInfo.apr = apr;

    poolInfoArray.push(poolInfo);
    poolConfigArray.push(poolInfo.poolConfig.key);
  }

  const allpoolConfigInfo = await connection.getMultipleAccountsInfo(
    poolConfigArray
  );

  poolInfoArray.forEach((poolInfo, index) => {
    const poolConfig = parsePoolConfig(
      allpoolConfigInfo[index]?.data,
      poolConfigArray[index]
    );
    poolInfoArray[index] = {
      ...poolInfo,
      poolConfig,
    };
  });

  return poolInfoArray;
}

export async function getPool(
  connection: Connection,
  poolInfoKey: PublicKey
): Promise<PoolInfo> {
  const lifinityAccount = await connection.getAccountInfo(poolInfoKey);

  let poolInfo = parsePoolInfo(lifinityAccount?.data, poolInfoKey);
  const poolConfigInfo = await connection.getAccountInfo(
    poolInfo.poolConfig.key
  );
  const poolConfig = parsePoolConfig(
    poolConfigInfo?.data,
    poolInfo.poolConfig.key
  );

  poolInfo = {
    ...poolInfo,
    poolConfig,
  };

  return poolInfo;
}

const DIGIT = new BN(10000000000);

export function parsePoolInfo(data: any, pubkey: PublicKey): PoolInfo {
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

  let poolInfo: PoolInfo = {
    poolId: pubkey,
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
    symbol: null,
    apr: null,
  };

  return poolInfo;
}

export function parsePoolConfig(data: any, pubkey: PublicKey): PoolConfig {
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

  const poolConfig: PoolConfig = {
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

  return poolConfig;
}

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
