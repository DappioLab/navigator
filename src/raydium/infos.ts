import {
  AccountInfo,
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import { getTokenAccount, TokenAccount } from "../utils";
import {
  LIQUIDITY_POOL_PROGRAM_ID_V4,
  STAKE_PROGRAM_ID,
  STAKE_PROGRAM_ID_V5,
} from "./ids";
import {
  FARM_LEDGER_LAYOUT_V3_2,
  FARM_LEDGER_LAYOUT_V5_2,
  STAKE_INFO_LAYOUT,
  STAKE_INFO_LAYOUT_V4,
} from "./layouts";
import { OpenOrders } from "@project-serum/serum";
import BN from "bn.js";
import { parseTokenAccount } from "../utils";
import { AMM_INFO_LAYOUT_V4 } from "./layouts";

type LedgerInfo = {
  pubkey: PublicKey;
  farmVersion: number;
  farmId: string;
  owner: string;
  deposited: number;
  rewardDebts: number[];
  mints: { stakedTokenMint: string; rewardAMint: string; rewardBMint?: string };
};

// Get all ledgers for certain user wallet.
export async function getAllLedgers(
  connection: Connection,
  ownerPubkey: PublicKey
): Promise<LedgerInfo[]> {
  let memcmpFilter: MemcmpFilter = {
    memcmp: {
      offset: 8 + 32,
      bytes: ownerPubkey.toString(),
    },
  };
  let dataSizeFilter = (datasize: any): DataSizeFilter => {
    return { dataSize: datasize };
  };
  // let filters_v3_1 = [
  //   memcmpFilter,
  //   dataSizeFilter(FARM_LEDGER_LAYOUT_V3_1.span),
  // ];
  let filters_v3_2 = [
    memcmpFilter,
    dataSizeFilter(FARM_LEDGER_LAYOUT_V3_2.span),
  ];
  // let filters_v5_1 = [
  //   memcmpFilter,
  //   dataSizeFilter(FARM_LEDGER_LAYOUT_V5_1.span),
  // ];
  let filters_v5_2 = [
    memcmpFilter,
    dataSizeFilter(FARM_LEDGER_LAYOUT_V5_2.span),
  ];

  // let allLedgersInV3_1 = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
  //   filters: filters_v3_1,
  // });
  let allLedgersInV3_2 = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
    filters: filters_v3_2,
  });
  // let allLedgersInV5_1 = await connection.getProgramAccounts(
  //   STAKE_PROGRAM_ID_V5,
  //   { filters: filters_v5_1 }
  // );
  let allLedgersInV5_2 = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID_V5,
    { filters: filters_v5_2 }
  );

  // let ledgerInfoV3_1 = await getLegerInfos(
  //   connection,
  //   allLedgersInV3_1,
  //   FARM_LEDGER_LAYOUT_V3_1,
  //   3
  // );
  let ledgerInfoV3_2 = await getLegerInfos(
    connection,
    allLedgersInV3_2,
    FARM_LEDGER_LAYOUT_V3_2,
    3
  );
  // let ledgerInfoV5_1 = await getLegerInfos(
  //   connection,
  //   allLedgersInV5_1,
  //   FARM_LEDGER_LAYOUT_V5_1,
  //   5
  // );
  let ledgerInfoV5_2 = await getLegerInfos(
    connection,
    allLedgersInV5_2,
    FARM_LEDGER_LAYOUT_V5_2,
    5
  );
  // console.log(
  //   // ledgerInfoV3_1.length,
  //   ledgerInfoV3_2.length,
  //   // ledgerInfoV5_1.length,
  //   ledgerInfoV5_2.length
  // );

  return [
    // ...ledgerInfoV3_1,
    ...ledgerInfoV3_2,
    // ...ledgerInfoV5_1,
    ...ledgerInfoV5_2,
  ];
}

export async function getLegerInfos(
  connection: Connection,
  ledgers: {
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
  }[],
  layout: any,
  farmVersion: 3 | 5
): Promise<LedgerInfo[]> {
  return await Promise.all(
    ledgers.map(async (ledger) => {
      let decoded = layout.decode(ledger.account.data);
      let relatedMints = await getFarmRelatedMints(
        connection,
        decoded,
        farmVersion
      );

      return {
        pubkey: ledger.pubkey,
        farmVersion: farmVersion,
        mints: relatedMints,
        farmId: decoded.id.toBase58(),
        owner: decoded.owner.toBase58(),
        deposited: decoded.deposited.toNumber(),
        rewardDebts: decoded.rewardDebts.map((rewardDebt: any) =>
          rewardDebt.toNumber()
        ),
      } as LedgerInfo;
    })
  );
}

// Inner fucntions used by getLedgerInfos
async function getFarmRelatedMints(
  connection: Connection,
  decoded: any,
  farmVersion: 3 | 5
) {
  let farmIdPubkey = new PublicKey(decoded.id.toBase58());
  let farmAccInfo = await connection.getAccountInfo(farmIdPubkey);
  let farmInfo: FarmInfo =
    farmVersion === 3
      ? parseFarmV1(farmAccInfo?.data, farmIdPubkey)
      : parseFarmV45(farmAccInfo?.data, farmIdPubkey, farmVersion);
  let stakedTokenMint = (
    await getTokenAccount(connection, farmInfo.poolLpTokenAccountPubkey)
  ).mint.toBase58();

  let rewardAMint = (
    await getTokenAccount(connection, farmInfo.poolRewardTokenAccountPubkey)
  ).mint.toBase58();
  let rewardBMint =
    farmVersion !== 3
      ? await (
          await getTokenAccount(
            connection,
            farmInfo.poolRewardTokenAccountPubkeyB!
          )
        ).mint.toBase58()
      : undefined;
  return { stakedTokenMint, rewardAMint, rewardBMint };
}

export async function getAssociatedLedgerAccount({
  programId,
  poolId,
  owner,
}: {
  programId: PublicKey;
  poolId: PublicKey;
  owner: PublicKey;
}) {
  const [publicKey] = await PublicKey.findProgramAddress(
    [
      poolId.toBuffer(),
      owner.toBuffer(),
      Buffer.from("staker_info_v2_associated_seed", "utf-8"),
    ],
    programId
  );
  return publicKey;
}

export interface PoolInfo {
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
  ammOrderbaseTokenTotal?: BN;
  ammOrderquoteTokenTotal?: BN;
}

export class PoolInfoWrapper {
  poolInfo: PoolInfo;
  constructor(poolInfo: PoolInfo) {
    this.poolInfo = poolInfo;
  }

  async calculateSwapOutAmount(
    fromSide: string,
    amountIn: BN,
    connection: Connection
  ) {
    let poolInfoWrapper = await this.updatePoolAmount(connection);
    if (fromSide == "coin") {
      let x1 = poolInfoWrapper.poolInfo.coinAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderbaseTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlCoin) as BN;
      let y1 = poolInfoWrapper.poolInfo.pcAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderquoteTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlPc) as BN;
      let k = x1.mul(y1);
      let x2 = x1.add(amountIn);
      let y2 = k.div(x2);
      let amountOut = y1.sub(y2);

      return amountOut;
    } else if (fromSide == "pc") {
      let x1 = poolInfoWrapper.poolInfo.pcAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderquoteTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlPc) as BN;
      let y1 = poolInfoWrapper.poolInfo.coinAccountAmount
        ?.add(poolInfoWrapper.poolInfo.ammOrderbaseTokenTotal as BN)
        .sub(poolInfoWrapper.poolInfo.needTakePnlCoin) as BN;
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
    accounts.push(this.poolInfo.poolPcTokenAccount);
    accounts.push(this.poolInfo.poolCoinTokenAccount);
    accounts.push(this.poolInfo.ammOpenOrders);
    let infos = (await connection.getMultipleAccountsInfo(
      accounts
    )) as AccountInfo<Buffer>[];

    let pc = parseTokenAccount(infos[0].data, accounts[0]);
    this.poolInfo.pcAccountAmount = pc.amount;
    let coin = parseTokenAccount(infos[1].data, accounts[1]);
    this.poolInfo.coinAccountAmount = coin.amount;
    let ammOrder = OpenOrders.fromAccountInfo(
      accounts[2],
      infos[2],
      this.poolInfo.serumProgramId
    );
    this.poolInfo.ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
    this.poolInfo.ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
    return this;
  }
}

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

  return new PoolInfoWrapper({
    infoPubkey,
    version: 4,
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
  });
}

export async function updateAllTokenAmount(
  pools: PoolInfo[],
  connection: Connection
) {
  let accounts: PublicKey[] = [];
  let allAccountInfo: AccountInfo<Buffer>[] = [];
  for (let pool of pools) {
    accounts.push(pool.poolPcTokenAccount);
    accounts.push(pool.poolCoinTokenAccount);
    accounts.push(pool.ammOpenOrders);
    if (accounts.length > 96) {
      let infos = (await connection.getMultipleAccountsInfo(
        accounts
      )) as AccountInfo<Buffer>[];
      allAccountInfo = allAccountInfo.concat(infos);
      accounts = [];
    }
  }
  let infos = (await connection.getMultipleAccountsInfo(
    accounts
  )) as AccountInfo<Buffer>[];
  allAccountInfo = allAccountInfo.concat(infos);
  for (let index = 0; index < pools.length; index++) {
    let pc = parseTokenAccount(
      allAccountInfo[index * 3].data,
      pools[index].poolPcTokenAccount
    );
    pools[index].pcAccountAmount = pc.amount;
    let coin = parseTokenAccount(
      allAccountInfo[index * 3 + 1].data,
      pools[index].poolCoinTokenAccount
    );
    pools[index].coinAccountAmount = coin.amount;
    let ammOrder = OpenOrders.fromAccountInfo(
      pools[index].ammOpenOrders,
      allAccountInfo[index * 3 + 2],
      pools[index].serumProgramId
    );
    pools[index].ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
    pools[index].ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
  }
  return pools;
}

export interface FarmInfoInterface {
  infoPubkey: PublicKey;
  version: number;
  state: BN;
  nonce: BN;
  poolLpTokenAccountPubkey: PublicKey;
  poolRewardTokenAccountPubkey: PublicKey;
  owner: PublicKey;
  totalReward: BN;
  perShare: BN;
  perBlock: BN;
  lastBlock: BN;
  totalRewardB?: BN;
  perShareB?: BN;
  perBlockB?: BN;
  poolRewardTokenAccountPubkeyB?: PublicKey;
  poolLpTokenAccount?: TokenAccount;
  poolRewardTokenAccount?: TokenAccount;
  poolRewardTokenAccountB?: TokenAccount;
}

export class FarmInfo implements FarmInfoInterface {
  infoPubkey: PublicKey;
  version: number;
  state: BN;
  nonce: BN;
  poolLpTokenAccountPubkey: PublicKey;
  poolRewardTokenAccountPubkey: PublicKey;
  owner: PublicKey;
  totalReward: BN;
  perShare: BN;
  perBlock: BN;
  lastBlock: BN;
  totalRewardB?: BN;
  perShareB?: BN;
  perBlockB?: BN;
  poolRewardTokenAccountPubkeyB?: PublicKey;
  poolLpTokenAccount?: TokenAccount;
  poolRewardTokenAccount?: TokenAccount;
  poolRewardTokenAccountB?: TokenAccount;
  constructor(
    infoPubkey: PublicKey,
    version: number,
    state: BN,
    nonce: BN,
    poolLpTokenAccountPubkey: PublicKey,
    poolRewardTokenAccountPubkey: PublicKey,
    owner: PublicKey,
    totalReward: BN,
    perShare: BN,
    perBlock: BN,
    lastBlock: BN,
    totalRewardB?: BN,
    perShareB?: BN,
    perBlockB?: BN,
    poolRewardTokenAccountPubkeyB?: PublicKey
  ) {
    this.infoPubkey = infoPubkey;
    this.version = version;
    this.state = state;
    this.nonce = nonce;
    this.poolLpTokenAccountPubkey = poolLpTokenAccountPubkey;
    this.poolRewardTokenAccountPubkey = poolRewardTokenAccountPubkey;
    this.owner = owner;
    this.totalReward = totalReward;
    this.perShare = perShare;
    this.perBlock = perBlock;
    this.lastBlock = lastBlock;
    this.totalRewardB = totalRewardB;
    this.perShareB = perShareB;
    this.perBlockB = perBlockB;
    this.poolRewardTokenAccountPubkeyB = poolRewardTokenAccountPubkeyB;
  }
  async updateAllTokenAccount(connection: Connection) {
    let pubkeys: PublicKey[] = [
      this.poolLpTokenAccountPubkey,
      this.poolRewardTokenAccountPubkey,
    ];
    if (this.poolRewardTokenAccountPubkeyB) {
      pubkeys.push(this.poolRewardTokenAccountPubkeyB);
    }
    let allToken = await connection.getMultipleAccountsInfo(pubkeys);
    this.poolLpTokenAccount = parseTokenAccount(
      allToken[0]?.data,
      this.poolLpTokenAccountPubkey
    );
    this.poolRewardTokenAccount = parseTokenAccount(
      allToken[1]?.data,
      this.poolRewardTokenAccountPubkey
    );
    if (this.poolRewardTokenAccountPubkeyB) {
      this.poolRewardTokenAccountB = parseTokenAccount(
        allToken[2]?.data,
        this.poolRewardTokenAccountPubkeyB
      );
    }
    return this;
  }
  async authority() {
    let seed = [this.infoPubkey.toBuffer()];
    if (this.version > 3) {
      return await PublicKey.findProgramAddress(seed, STAKE_PROGRAM_ID_V5);
    }
    return await PublicKey.findProgramAddress(seed, STAKE_PROGRAM_ID);
  }
}

export function parseFarmV1(data: any, infoPubkey: PublicKey) {
  let farmData = Buffer.from(data);
  let rawFarmData = STAKE_INFO_LAYOUT.decode(farmData);
  let {
    state,
    nonce,
    poolLpTokenAccountPubkey,
    poolRewardTokenAccountPubkey,
    owner,
    feeOwner,
    feeY,
    feeX,
    totalReward,
    rewardPerShareNet,
    lastBlock,
    rewardPerBlock,
  } = rawFarmData;
  return new FarmInfo(
    infoPubkey,
    1,
    state,
    nonce,
    poolLpTokenAccountPubkey,
    poolRewardTokenAccountPubkey,
    owner,
    totalReward,
    rewardPerShareNet,
    rewardPerBlock,
    lastBlock
  );
}

export function parseFarmV45(
  data: any,
  infoPubkey: PublicKey,
  version: number
) {
  let farmData = Buffer.from(data);
  let rawFarmData = STAKE_INFO_LAYOUT_V4.decode(farmData);
  let {
    state,
    nonce,
    poolLpTokenAccountPubkey,
    poolRewardTokenAccountPubkey,
    totalReward,
    perShare,
    perBlock,
    option,
    poolRewardTokenAccountPubkeyB,
    totalRewardB,
    perShareB,
    perBlockB,
    lastBlock,
    owner,
  } = rawFarmData;
  return new FarmInfo(
    infoPubkey,
    version,
    state,
    nonce,
    poolLpTokenAccountPubkey,
    poolRewardTokenAccountPubkey,
    owner,
    totalReward,
    perShare,
    perBlock,
    lastBlock,
    totalRewardB,
    perShareB,
    perBlockB,
    poolRewardTokenAccountPubkeyB
  );
}

export async function updateAllFarmToken(
  farms: FarmInfo[],
  connection: Connection
) {
  let allLPPubkey: PublicKey[] = [];
  let allAccountInfo: AccountInfo<Buffer>[] = [];
  for (let index = 0; index < farms.length; index++) {
    allLPPubkey.push(farms[index].poolLpTokenAccountPubkey);
    //console.log(allLPPubkey.length)
    if (index % 99 == 98) {
      let accounts = (await connection.getMultipleAccountsInfo(
        allLPPubkey
      )) as AccountInfo<Buffer>[];
      //console.log(accounts)
      allAccountInfo = allAccountInfo.concat(accounts);
      //console.log(allAccountInfo)
      allLPPubkey = [];
    }
  }
  allAccountInfo = allAccountInfo.concat(
    (await connection.getMultipleAccountsInfo(
      allLPPubkey
    )) as AccountInfo<Buffer>[]
  );

  for (let index = 0; index < farms.length; index++) {
    //console.log(allAccountInfo[index]?.owner.toString())
    if (allAccountInfo[index]?.data) {
      farms[index].poolLpTokenAccount = parseTokenAccount(
        allAccountInfo[index]?.data,
        farms[index].poolLpTokenAccountPubkey
      );
    }
  }
  return farms;
}

export async function getAllPools(connection: Connection): Promise<PoolInfo[]> {
  let allPool: PoolInfo[] = [];
  //V4 pools
  const v4SizeFilter: DataSizeFilter = {
    dataSize: 752,
  };
  const v4Filters = [v4SizeFilter];
  const v4config: GetProgramAccountsConfig = { filters: v4Filters };
  const allV4AMMAccount = await connection.getProgramAccounts(
    LIQUIDITY_POOL_PROGRAM_ID_V4,
    v4config
  );
  for (let v4Account of allV4AMMAccount) {
    let poolInfoWrapper = parseV4PoolInfo(
      v4Account.account.data,
      v4Account.pubkey
    );
    if (
      !(
        poolInfoWrapper.poolInfo.totalPnlCoin.isZero() ||
        poolInfoWrapper.poolInfo.totalPnlPc.isZero()
      ) &&
      poolInfoWrapper.poolInfo.status.toNumber() != 4
    ) {
      allPool.push(poolInfoWrapper.poolInfo);
    }
  }
  //allPool = await updateAllTokenAmount(allPool,connection)
  return allPool;
}

export async function getPool(
  connection: Connection,
  poolInfoKey: PublicKey
): Promise<PoolInfo> {
  let pool = null as unknown as PoolInfo;
  const poolInfoAccount = await connection.getAccountInfo(poolInfoKey);
  let poolInfoWrapper = parseV4PoolInfo(poolInfoAccount?.data, poolInfoKey);
  if (
    !(
      poolInfoWrapper.poolInfo.totalPnlCoin.isZero() ||
      poolInfoWrapper.poolInfo.totalPnlPc.isZero()
    ) &&
    poolInfoWrapper.poolInfo.status.toNumber() != 4
  ) {
    pool = poolInfoWrapper.poolInfo;
  }
  return pool;
}

export async function getAllFarms(connection: Connection) {
  let allFarm: FarmInfo[] = [];
  const v1SizeFilter: DataSizeFilter = {
    dataSize: 200,
  };
  const v1Filters = [v1SizeFilter];
  const v1Config: GetProgramAccountsConfig = { filters: v1Filters };
  const allV1FarmAccount = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID,
    v1Config
  );
  for (let v1Account of allV1FarmAccount) {
    let farm = parseFarmV1(v1Account.account.data, v1Account.pubkey);
    if (farm.state.toNumber() == 1) {
      //await farm.updateAllTokenAccount(connection);
      allFarm.push(farm);
    }
  }
  const v5SizeFilter: DataSizeFilter = {
    dataSize: 224,
  };
  const v5Filters = [v5SizeFilter];
  const v5Config: GetProgramAccountsConfig = { filters: v5Filters };
  const allV5FarmAccount = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID_V5,
    v5Config
  );
  for (let v5Account of allV5FarmAccount) {
    let farm = parseFarmV45(v5Account.account.data, v5Account.pubkey, 5);
    if (farm.state.toNumber() == 1) {
      //await farm.updateAllTokenAccount(connection);
      allFarm.push(farm);
    }
  }
  allFarm = await updateAllFarmToken(allFarm, connection);
  for (let index = 0; index < allFarm.length; index++) {
    if (allFarm[index].poolLpTokenAccount?.amount.isZero()) {
      allFarm.splice(index, 1);
      index--;
    }
    //console.log(allFarm.length)
  }
  return allFarm;
}
