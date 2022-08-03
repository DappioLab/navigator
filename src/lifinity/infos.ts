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
import { LIFINITY_AMM_LAYOUT } from "./layouts";
import { LIFINITY_PROGRAM_ID } from "./ids";

export interface PoolInfo extends IPoolInfo {
  index: BN;
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
  // poolMint: PublicKey;
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

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: PoolInfo) {}
}

export async function getAllPool(connection: Connection): Promise<PoolInfo[]> {
  const sizeFilter: DataSizeFilter = {
    dataSize: 615,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allLifinityAccount = await connection.getProgramAccounts(
    LIFINITY_PROGRAM_ID,
    config
  );

  let poolInfoArray: PoolInfo[] = [];
  for (let lifinityAccount of allLifinityAccount) {
    const poolInfo = await parsePoolInfoData(
      lifinityAccount.account.data,
      lifinityAccount.pubkey
    );
    poolInfoArray.push(poolInfo.poolInfo);
  }

  return poolInfoArray;
}

export async function getPool(
  connection: Connection,
  poolInfoKey: PublicKey
): Promise<PoolInfo> {
  const lifinityAccount = await connection.getAccountInfo(poolInfoKey);

  let poolInfoWapper = await parsePoolInfoData(
    lifinityAccount?.data,
    poolInfoKey
  );
  return poolInfoWapper.poolInfo;
}

const DIGIT = new BN(10000000000);

export async function parsePoolInfoData(
  data: any,
  pubkey: PublicKey
): Promise<PoolInfoWrapper> {
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

  let poolInfo = new PoolInfoWrapper({
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
  });

  return poolInfo;
}
