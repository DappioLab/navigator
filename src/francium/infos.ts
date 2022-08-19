import {
  AccountInfo,
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
  LENDING_REWARD_LAYOUT,
  USER_LENDING_REWARD_LAYOUT,
} from "./layouts";
import BN from "bn.js";
import {
  LYF_ORCA_PROGRAM_ID,
  ADMIN,
  LFY_RAYDIUM_PROGRAM_ID,
  LENDING_MARKET,
  FRANCIUM_LENDING_PROGRAM_ID,
  FRANCIUM_LENDING_REWARD_PROGRAM_ID,
} from "./ids";
import { IReserveInfo, IReserveInfoWrapper } from "../types";
import { utils } from "..";
export interface ReserveInfo extends IReserveInfo {
  market: PublicKey;
  tokenMint: PublicKey;
  tknAccount: PublicKey;
  feeAccount: PublicKey;
  shareMint: PublicKey;
  shareAccount: PublicKey;
  creditMint: PublicKey;
  creditAccount: PublicKey;
  decimal: BN;
  liquidityAvailableAmount: BN;
  liquidityBorrowedAmount: BN;
  marketPrice: BN;
  shareMintTotalSupply: BN;
  creditMintTotalSupply: BN;
  interestReverseRate: BN;
  accumulatedInterestReverse: BN;
  threshold1: number;
  threshold2: number;
  base1: number;
  factor1: number;
  base2: number;
  factor2: number;
  base3: number;
  factor3: number;
  rewardInfo?: LendingReward;
}
export class ReserveInfoWrapper implements IReserveInfoWrapper {
  constructor(public reserveInfo: ReserveInfo) {}
  supplyTokenMint() {
    return this.reserveInfo.tokenMint;
  }
  supplyTokenDecimal() {
    return this.reserveInfo.decimal;
  }
  reserveTokenMint() {
    return this.reserveInfo.shareMint;
  }
  reserveTokenDecimal() {
    return this.reserveInfo.decimal;
  }
  reserveTokenSupply() {
    return this.reserveInfo.shareMintTotalSupply;
  }
  supplyAmount() {
    return this.reserveInfo.liquidityAvailableAmount.add(
      this.reserveInfo.liquidityBorrowedAmount
    );
  }
  borrowedAmount() {
    return this.reserveInfo.liquidityBorrowedAmount;
  }
  supplyApy() {
    return this.rates().apy;
  }

  rates() {
    const {
      threshold1,
      threshold2,
      base1,
      factor1,
      base2,
      factor2,
      base3,
      factor3,
    } = { ...this.reserveInfo };
    let borrowInterest = 0;
    let utilization = this.calculateUtilizationRatio();
    if (utilization > 0 && utilization <= threshold1 / 100) {
      borrowInterest = base1 / 100 + (factor1 / 100) * utilization;
    } else if (
      utilization > threshold1 / 100 &&
      utilization <= threshold2 / 100
    ) {
      borrowInterest =
        base2 / 100 + (factor2 / 100) * (utilization - threshold1 / 100);
    } else if (utilization > threshold2 / 100) {
      borrowInterest =
        base3 / 100 + (factor3 / 100) * (utilization - threshold2 / 100);
    }
    const apr = utilization * borrowInterest * 100;
    const apy = ((1 + apr / 100 / 365) ** 365 - 1) * 100;
    return {
      borrowInterest: borrowInterest * 100,
      apr,
      apy,
    };
  }
  calculateUtilizationRatio() {
    return (
      this.borrowedAmount()
        .muln(10 ** 6)
        .div(this.supplyAmount())
        .toNumber() /
      10 ** 6
    );
  }
}

export function parseReserveInfo(
  data: any,
  infoPubkey: PublicKey
): ReserveInfo {
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
    threshold_1,
    threshold_2,
    base_1,
    factor_1,
    base_2,
    factor_2,
    base_3,
    factor_3,
    interestReverseRate,
    accumulated_interestReverse,
  } = rawLending;

  return {
    tokenMint: liquidityMintPubkey,
    reserveId: infoPubkey,
    tknAccount: liquiditySupplyPubkey,
    feeAccount: liquidityFeeReceiver,
    shareMint: shareMintPubkey,
    shareAccount: shareSupplyPubkey,
    creditMint: creditMintPubkey,
    creditAccount: creditSupplyPubkey,
    market: lendingMarket,
    decimal: new BN(liquidityMint_decimals),
    liquidityAvailableAmount: new BN(liquidity_available_amount),
    liquidityBorrowedAmount: new BN(liquidity_borrowed_amount_wads).div(
      new BN(`1${"".padEnd(18, "0")}`)
    ),
    marketPrice: new BN(liquidityMarketPrice),
    shareMintTotalSupply: new BN(shareMintTotalSupply),
    creditMintTotalSupply: new BN(creditMintTotalSupply),
    interestReverseRate: new BN(interestReverseRate),
    accumulatedInterestReverse: new BN(accumulated_interestReverse),
    threshold1: new BN(threshold_1).toNumber(),
    threshold2: new BN(threshold_2).toNumber(),
    base1: new BN(base_1).toNumber(),
    factor1: new BN(factor_1).toNumber(),
    base2: new BN(base_2).toNumber(),
    factor2: new BN(factor_2).toNumber(),
    base3: new BN(base_3).toNumber(),
    factor3: new BN(factor_3).toNumber(),
  };
}

export interface LendingReward {
  version: BN;
  isDualRewards: BN;
  infoPubkey: PublicKey;
  admin: PublicKey;
  tokenProgramId: PublicKey;
  poolAuthority: PublicKey;
  stakedTokenMint: PublicKey;
  stakedTokenAccount: PublicKey;
  rewardsTokenMint: PublicKey;
  rewardsTokenAccount: PublicKey;
  rewardsTokenMintB: PublicKey;
  rewardsTokenAccountB: PublicKey;
  poolStakeCap: BN;
  userStakeCap: BN;
  rewardsStartSlot: BN;
  rewardsEndSlot: BN;
  rewardsPerDay: BN;
  rewardsStartSlotB: BN;
  rewardsEndSlotB: BN;
  rewardsPerDayB: BN;
  totalStakedAmount: BN;
  lastUpdateSlot: BN;
  accumulatedRewardsPerShare: BN;
  accumulatedRewardsPerShareB: BN;
}
export function parseLendingReward(
  data: any,
  infoPubkey: PublicKey
): LendingReward {
  let buffer = Buffer.from(data);
  let rawReward = LENDING_REWARD_LAYOUT.decode(buffer);
  let {
    version,
    is_dual_rewards,
    admin,
    token_program_id,
    pool_authority,
    staked_token_mint,
    staked_token_account,
    rewards_token_mint,
    rewards_token_account,
    rewards_token_mint_b,
    rewards_token_account_b,
    pool_stake_cap,
    user_stake_cap,
    rewards_start_slot,
    rewards_end_slot,
    rewards_per_day,
    rewards_start_slot_b,
    rewards_end_slot_b,
    rewards_per_day_b,
    total_staked_amount,
    last_update_slot,
    accumulated_rewards_per_share,
    accumulated_rewards_per_share_b,
  } = rawReward;
  return {
    version: new BN(version),
    isDualRewards: new BN(is_dual_rewards),
    infoPubkey: infoPubkey,
    admin: admin,
    tokenProgramId: token_program_id,
    poolAuthority: pool_authority,
    stakedTokenMint: staked_token_mint,
    stakedTokenAccount: staked_token_account,
    rewardsTokenMint: rewards_token_mint,
    rewardsTokenAccount: rewards_token_account,
    rewardsTokenMintB: rewards_token_mint_b,
    rewardsTokenAccountB: rewards_token_account_b,
    poolStakeCap: new BN(pool_stake_cap),
    userStakeCap: new BN(user_stake_cap),
    rewardsStartSlot: new BN(rewards_start_slot),
    rewardsEndSlot: new BN(rewards_end_slot),
    rewardsPerDay: new BN(rewards_per_day),
    rewardsStartSlotB: new BN(rewards_start_slot_b),
    rewardsEndSlotB: new BN(rewards_end_slot_b),
    rewardsPerDayB: new BN(rewards_per_day_b),
    totalStakedAmount: new BN(total_staked_amount),
    lastUpdateSlot: new BN(last_update_slot),
    accumulatedRewardsPerShare: new BN(accumulated_rewards_per_share),
    accumulatedRewardsPerShareB: new BN(accumulated_rewards_per_share_b),
  };
}
export interface UserLendingReward {
  version: BN;
  infoPubkey: PublicKey;
  stakedAmount: BN;
  rewardsDebt: BN;
  rewardsDebtB: BN;
  farmingPool: PublicKey;
  wallet: PublicKey;
  stakeTokenAccount: PublicKey;
  rewardsTokenAccount: PublicKey;
  rewardsTokenAccountB: PublicKey;
}
export function parseUserRewardData(
  data: any,
  infoPubkey: PublicKey
): UserLendingReward {
  let buffer = Buffer.from(data);
  let rawReward = USER_LENDING_REWARD_LAYOUT.decode(buffer);
  let {
    version,
    staked_amount,
    rewards_debt,
    rewards_debt_b,
    farming_pool,
    user_main,
    stake_token_account,
    rewards_token_account,
    rewards_token_account_b,
  } = rawReward;
  return {
    version: new BN(version),
    infoPubkey: infoPubkey,
    stakedAmount: new BN(staked_amount),
    rewardsDebt: new BN(rewards_debt),
    rewardsDebtB: new BN(rewards_debt_b),
    farmingPool: farming_pool,
    wallet: user_main,
    stakeTokenAccount: stake_token_account,
    rewardsTokenAccount: rewards_token_account,
    rewardsTokenAccountB: rewards_token_account_b,
  };
}

export async function getAllReserveWrappers(connection: Connection) {
  let reserves = await getAllReserve(connection);
  let rewards = await getAllLendingRewards(connection);
  let wrappers = [];
  for (let reserve of reserves) {
    if (reserve.liquidityAvailableAmount.cmpn(100) > 0) {
      reserve.rewardInfo = rewards.get(reserve.shareMint.toString());
      wrappers.push(new ReserveInfoWrapper(reserve));
    }
  }
  return wrappers;
}

export async function getAllReserve(connection: Connection) {
  const programIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 10,
      //offset 10byte
      bytes: LENDING_MARKET.toString(),
    },
  };
  const dataSizeFilters: DataSizeFilter = {
    dataSize: LendingPoolLayout.span,
  };

  const filters = [programIdMemcmp, dataSizeFilters];

  const config: GetProgramAccountsConfig = { filters: filters };
  const reserveAccounts = await connection.getProgramAccounts(
    FRANCIUM_LENDING_PROGRAM_ID,
    config
  );

  let reserves = [] as ReserveInfo[];
  for (let account of reserveAccounts) {
    let info = parseReserveInfo(account.account.data, account.pubkey);
    reserves.push(info);
  }

  return reserves;
}
export async function getReserve(connection: Connection, reserveId: PublicKey) {
  let reserveAccount = (await connection.getAccountInfo(
    reserveId
  )) as AccountInfo<Buffer>;
  let info = parseReserveInfo(reserveAccount.data, reserveId);
  let rewards = await getAllLendingRewards(connection);
  info.rewardInfo = rewards.get(info.shareMint.toString());
  return info;
}
export async function getAllLendingRewards(connection: Connection) {
  const dataSizeFilters: DataSizeFilter = {
    dataSize: LENDING_REWARD_LAYOUT.span,
  };

  const filters = [dataSizeFilters];

  const config: GetProgramAccountsConfig = { filters: filters };
  const reserveAccounts = await connection.getProgramAccounts(
    FRANCIUM_LENDING_REWARD_PROGRAM_ID,
    config
  );
  const currentSlot = new BN(await connection.getSlot());
  let rewardsMap: Map<String, LendingReward> = new Map();
  for (let account of reserveAccounts) {
    let info = parseLendingReward(account.account.data, account.pubkey);
    if (info.rewardsEndSlot.cmp(currentSlot)) {
      rewardsMap.set(info.stakedTokenMint.toString(), info);
    } else if (info.rewardsEndSlotB.cmp(currentSlot)) {
      rewardsMap.set(info.stakedTokenMint.toString(), info);
    }
  }

  return rewardsMap;
}
export async function getUserRewardPubkey(
  wallet: PublicKey,
  lendingReward: LendingReward
) {
  const ata = await utils.findAssociatedTokenAddress(
    wallet,
    lendingReward.stakedTokenMint
  );
  const [farmInfoPub, nonce] = await PublicKey.findProgramAddress(
    [wallet.toBuffer(), lendingReward.infoPubkey.toBuffer(), ata.toBuffer()],
    FRANCIUM_LENDING_REWARD_PROGRAM_ID
  );
  return { pda: farmInfoPub, bump: nonce };
}

export async function checkUserRewardCreated(
  wallet: PublicKey,
  lendingReward: LendingReward,
  connection: Connection
) {
  const { pda, bump } = await getUserRewardPubkey(wallet, lendingReward);
  const userRewardAccount = (await connection.getAccountInfo(
    pda
  )) as AccountInfo<Buffer>;
  return userRewardAccount.data.length > 0;
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
  return parseOrcaStrategyStateData(accountInfo?.data, strategyStateKey);
}

export async function getAllOrcaStrategyStates(
  connection: Connection
): Promise<OrcaStrategyState[]> {
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

  const allAccountInfos = await connection.getProgramAccounts(
    LYF_ORCA_PROGRAM_ID,
    config
  );

  return allAccountInfos.map((info) =>
    parseOrcaStrategyStateData(info.account.data, info.pubkey)
  );
}

export async function getRaydiumStrategyState(
  strategyStateKey: PublicKey,
  connection: Connection
): Promise<RaydiumStrategyState> {
  let accountInfo = await connection.getAccountInfo(strategyStateKey);
  return parseRaydiumStrategyStateData(accountInfo?.data, strategyStateKey);
}

export async function getAllRaydiumStrategyStates(
  connection: Connection
): Promise<RaydiumStrategyState[]> {
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

  const allAccountInfos = await connection.getProgramAccounts(
    LFY_RAYDIUM_PROGRAM_ID,
    config
  );

  return allAccountInfos.map((info) =>
    parseRaydiumStrategyStateData(info.account.data, info.pubkey)
  );
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
): Promise<RaydiumPosition[]> {
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

  const allPositionInfos = await connection.getProgramAccounts(
    LFY_RAYDIUM_PROGRAM_ID,
    config
  );

  return allPositionInfos.map((info) =>
    parseRaydiumPositionData(info.account.data, info.pubkey)
  );
}

export async function getRaydiumPositionKeySet(
  wallet: PublicKey,
  strategyAccount: PublicKey
): Promise<{ address: PublicKey; nonce: BN; bump: BN }> {
  let seed = Buffer.from([97, 110, 99, 104, 111, 114]);
  let nonce = Math.trunc(Date.now() / 1000);
  const nonceLeBytes = Buffer.from([0, 0, 0, 0]);
  nonceLeBytes.writeUInt32LE(nonce);

  const [pda, bump] = await PublicKey.findProgramAddress(
    [seed, wallet.toBuffer(), strategyAccount.toBuffer(), nonceLeBytes],
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
): Promise<OrcaPosition[]> {
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

  const allPositionInfos = await connection.getProgramAccounts(
    LYF_ORCA_PROGRAM_ID,
    config
  );

  return allPositionInfos.map((info) =>
    parseOrcaPositionData(info.account.data, info.pubkey)
  );
}
