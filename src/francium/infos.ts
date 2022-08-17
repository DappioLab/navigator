import {
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import {
  LendingPoolLayout,
  ORCA_STRATEGY_STATE_LAYOUT,
  RAYDIUM_STRATEGY_STATE_LAYOUT,
  RAYDIUM_POSITION_LAYOUT,
  ORCA_POSITION_LAYOUT,
} from "./layouts";
import BN from "bn.js";
import { LYF_ORCA_PROGRAM_ID, ADMIN, LFY_RAYDIUM_PROGRAM_ID } from "./ids";

export interface LendingInfo {
  tokenMint: PublicKey;
  lendingPoolInfoAccount: PublicKey;
  lendingPoolTknAccount: PublicKey;
  lendingPoolFeeAccount: PublicKey;
  lendingPoolShareMint: PublicKey;
  lendingPoolShareAccount: PublicKey;
  lendingPoolCreditMint: PublicKey;
  lendingPoolCreditAccount: PublicKey;
}

export function parseLendingInfo(
  data: any,
  infoPubkey: PublicKey
): LendingInfo {
  let buffer = Buffer.from(data);
  let rawLending = LendingPoolLayout.decode(buffer);
  let {
    version,
    last_updateSlot,
    last_updateStale,
    lendingMarket,
    liquidityMintPubkey,
    liquidityMint_decimals,
    liquiditySupplyPubkey,
    liquidityFeeReceiver,
    oracle,
    liquidity_available_amount,
    liquidity_borrowed_amount_wads,
    liquidity_cumulative_borrowRate_wads,
    liquidityMarketPrice,
    shareMintPubkey,
    shareMintTotalSupply,
    shareSupplyPubkey,
    creditMintPubkey,
    creditMintTotalSupply,
    creditSupplyPubkey,
  } = rawLending;

  return {
    tokenMint: liquidityMintPubkey,
    lendingPoolInfoAccount: infoPubkey,
    lendingPoolTknAccount: liquiditySupplyPubkey,
    lendingPoolFeeAccount: liquidityFeeReceiver,
    lendingPoolShareMint: shareMintPubkey,
    lendingPoolShareAccount: shareSupplyPubkey,
    lendingPoolCreditMint: creditMintPubkey,
    lendingPoolCreditAccount: creditSupplyPubkey,
  };
}

export interface RaydiumStrategyState {
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
  stakePoolId: PublicKey;
  stakePoolTkn: PublicKey;
}

export function parseRaydiumStrategyStateData(
  data: any,
  infoPubkey: PublicKey
): RaydiumStrategyState {
  let bufferedData = Buffer.from(data).slice(8);
  let rawState = RAYDIUM_STRATEGY_STATE_LAYOUT.decode(bufferedData);
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
    stakePoolId,
    stakePoolTkn,
  } = rawState;

  return {
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
    stakePoolId,
    stakePoolTkn,
  };
}

export interface OrcaStrategyState {
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

export function parseOrcaStrategyStateData(
  data: any,
  infoPubkey: PublicKey
): OrcaStrategyState {
  let bufferedData = Buffer.from(data).slice(8);
  let rawState = ORCA_STRATEGY_STATE_LAYOUT.decode(bufferedData);
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

  return {
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
    doubleDipStrategyFarmInfo,
  };
}

export async function getOrcaStrategyState(
  strategyStateKey: PublicKey,
  connection: Connection
) {
  let accountInfo = await connection.getAccountInfo(strategyStateKey);
  let farm = parseOrcaStrategyStateData(accountInfo?.data, strategyStateKey);
  return farm;
}

export async function getAllOrcaStrategyStates(connection: Connection) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 125,
      bytes: ADMIN.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 967,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allAccountInfo = await connection.getProgramAccounts(
    LYF_ORCA_PROGRAM_ID,
    config
  );
  let allStrategyStates: OrcaStrategyState[] = [];
  for (let info of allAccountInfo) {
    allStrategyStates.push(
      parseOrcaStrategyStateData(info.account.data, info.pubkey)
    );
  }
  return allStrategyStates;
}

export async function getRaydiumStrategyState(
  strategyStateKey: PublicKey,
  connection: Connection
) {
  let accountInfo = await connection.getAccountInfo(strategyStateKey);
  let farm = parseRaydiumStrategyStateData(accountInfo?.data, strategyStateKey);
  return farm;
}

export async function getAllRaydiumStrategyStates(connection: Connection) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 122,
      bytes: ADMIN.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 903,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allAccountInfo = await connection.getProgramAccounts(
    LFY_RAYDIUM_PROGRAM_ID,
    config
  );
  let allStrategyStates: RaydiumStrategyState[] = [];
  for (let info of allAccountInfo) {
    allStrategyStates.push(
      parseRaydiumStrategyStateData(info.account.data, info.pubkey)
    );
  }
  return allStrategyStates;
}

export interface RaydiumPosition {
  infoPubkey: PublicKey;
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

export function parseRaydiumPositionData(
  data: any,
  infoPubkey: PublicKey
): RaydiumPosition {
  let bufferedData = Buffer.from(data).slice(8);
  let rawInfo = RAYDIUM_POSITION_LAYOUT.decode(bufferedData);

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

  return {
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
  };
}

export async function getAllRaydiumPositions(
  wallet: PublicKey,
  connection: Connection
) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 49,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 285,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allPosition = await connection.getProgramAccounts(
    LFY_RAYDIUM_PROGRAM_ID,
    config
  );
  let allPositions: RaydiumPosition[] = [];
  for (let Position of allPosition) {
    allPositions.push(
      parseRaydiumPositionData(Position.account.data, Position.pubkey)
    );
  }
  return allPositions;
}

export async function getRaydiunPositionKey(
  wallet: PublicKey,
  strategyAccount: PublicKey
) {
  let seed = Buffer.from([97, 110, 99, 104, 111, 114]);
  let nonce = Math.trunc(Date.now() / 1000);
  const nonceLeBytes = Buffer.from([0, 0, 0, 0]);
  nonceLeBytes.writeUInt32LE(nonce);

  const [pda, bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from([97, 110, 99, 104, 111, 114]),
      wallet.toBuffer(),
      strategyAccount.toBuffer(),
      nonceLeBytes,
    ],
    LFY_RAYDIUM_PROGRAM_ID
  );

  return { address: pda, nonce: new BN(nonce), bump: new BN(bump) };
}

export interface OrcaPosition {
  infoPubkey: PublicKey;
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
  stableSwapComputeFlag: BN;
  stableSwapDirection: BN;
  stableSwapAmount: BN;
}

export function parseOrcaPositionData(
  data: any,
  infoPubkey: PublicKey
): OrcaPosition {
  let bufferedData = Buffer.from(data).slice(8);
  let rawInfo = ORCA_POSITION_LAYOUT.decode(bufferedData);

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
    stableSwapComputeFlag,
    stableSwapDirection,
    stableSwapAmount,
  } = rawInfo;

  return {
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
    stableSwapComputeFlag,
    stableSwapDirection,
    stableSwapAmount,
  };
}

export async function getAllOrcaPositions(
  wallet: PublicKey,
  connection: Connection
) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 49,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 285,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allPosition = await connection.getProgramAccounts(
    LYF_ORCA_PROGRAM_ID,
    config
  );
  let allPositions: OrcaPosition[] = [];
  for (let Position of allPosition) {
    allPositions.push(
      parseOrcaPositionData(Position.account.data, Position.pubkey)
    );
  }
  return allPositions;
}
