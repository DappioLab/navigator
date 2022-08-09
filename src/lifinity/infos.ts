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
  // poolMint: PublicKey; // lpMint
  // tokenAMint: PublicKey;
  // tokenBMint: PublicKey;
  poolFeeAccount: PublicKey;
  pythAccount: PublicKey;
  pythPcAccount: PublicKey;
  configAccount: ConfigAccount;
  // ammTemp1: PublicKey;
  // ammTemp2: PublicKey;
  // ammTemp3: PublicKey;
  tradeFee: BN;
  hostFee: BN;
  curveType: BN;
  curveParameters: BN;
}

interface PoolLayout extends IPoolInfo {
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
  // poolMint: PublicKey; // lpMint
  // tokenAMint: PublicKey;
  // tokenBMint: PublicKey;
  poolFeeAccount: PublicKey;
  pythAccount: PublicKey;
  pythPcAccount: PublicKey;
  configAccount: PublicKey;
  // ammTemp1: PublicKey;
  // ammTemp2: PublicKey;
  // ammTemp3: PublicKey;
  tradeFee: BN;
  hostFee: BN;
  curveType: BN;
  curveParameters: BN;
}

interface ConfigAccount {
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
    return this.poolInfo.configAccount.depositCap;
  }
}

export async function getAllPools(connection: Connection): Promise<PoolInfo[]> {
  const sizeFilter: DataSizeFilter = {
    dataSize: 136,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allLifinityConfigAccount = await connection.getProgramAccounts(
    LIFINITY_PROGRAM_ID,
    config
  );
  const allLifinityAccount = await connection.getMultipleAccountsInfo(
    LIFINITY_ALL_AMM_ID
  );

  let rawPoolInfoArray: PoolLayout[] = [];
  let configAccountArray: PublicKey[] = [];
  let poolInfoArray: PoolInfo[] = [];

  for (let index in allLifinityAccount) {
    const lifinityAccount = allLifinityAccount[index];
    const poolInfo = parsePoolInfoData(
      lifinityAccount?.data,
      LIFINITY_ALL_AMM_ID[index]
    );
    rawPoolInfoArray.push(poolInfo);
    configAccountArray.push(poolInfo.configAccount);
  }

  const allConfigAccountInfo = await connection.getMultipleAccountsInfo(
    configAccountArray
  );

  rawPoolInfoArray.forEach((rawPoolInfo, index) => {
    const configAccount = parseConfigAccountData(
      allConfigAccountInfo[index]?.data,
      configAccountArray[index]
    );
    const poolInfo: PoolInfo = {
      ...rawPoolInfo,
      configAccount: configAccount,
    };
    poolInfoArray.push(poolInfo);
  });

  return poolInfoArray;
}

export async function getPool(
  connection: Connection,
  poolInfoKey: PublicKey
): Promise<PoolInfo> {
  const lifinityAccount = await connection.getAccountInfo(poolInfoKey);

  const rawPoolInfo = parsePoolInfoData(lifinityAccount?.data, poolInfoKey);
  const configAccount = await connection.getAccountInfo(
    rawPoolInfo.configAccount
  );
  const configAccountInfo = parseConfigAccountData(
    configAccount?.data,
    rawPoolInfo.configAccount
  );
  const poolInfo: PoolInfo = {
    ...rawPoolInfo,
    configAccount: configAccountInfo,
  };

  return poolInfo;
}

const DIGIT = new BN(10000000000);

export function parsePoolInfoData(data: any, pubkey: PublicKey): PoolLayout {
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
    // ammTemp1,
    // ammTemp2,
    // ammTemp3,
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

  let poolInfo: PoolLayout = {
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
    configAccount,
    // ammTemp1,
    // ammTemp2,
    // ammTemp3,
    tradeFee: new BN(tradeFee),
    hostFee: new BN(hostFee),
    curveType: new BN(curveType),
    curveParameters: new BN(curveParameters),
  };

  return poolInfo;
}

export function parseConfigAccountData(
  data: any,
  pubkey: PublicKey
): ConfigAccount {
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

  const configAccount: ConfigAccount = {
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

  return configAccount;
}
