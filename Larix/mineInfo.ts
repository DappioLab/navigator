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
import {
  Connection,
  PublicKey,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
} from "@solana/web3.js";
import { LARIX_PROGRAM_ID } from "./larixInfo";
import BN from "bn.js";

export class MinerInfo {
  infoPub: PublicKey;
  version: BN;
  owner: PublicKey;
  lendingMarket: PublicKey;
  reservesLen: BN;
  unclaimedMine: BN;
  indexs: MinerIndex[];
  constructor(
    infoPub: PublicKey,
    version: BN,
    owner: PublicKey,
    lendingMarket: PublicKey,
    reservesLen: BN,
    unclaimedMine: BN,
    indexs: MinerIndex[],
  ) {
    this.infoPub = infoPub;
    this.version = version;
    this.owner = owner;
    this.lendingMarket = lendingMarket;
    this.reservesLen = reservesLen;
    this.unclaimedMine = unclaimedMine;
    this.indexs = indexs;
  }
}
export class MinerIndex {
  reserve: PublicKey;
  unCollLTokenAmount: BN;
  index: BN;
  constructor(reserve: PublicKey, unCollLTokenAmount: BN, index: BN) {
    this.reserve = reserve;
    this.unCollLTokenAmount = unCollLTokenAmount;
    this.index = index;
  }
}

const MINER_LAYOUT = struct([
  u8("version"),
  publicKey("owner"),
  publicKey("lendingMarket"),
  u8("reservesLen"),
  u128("unclaimedMine"),
]);
const MINER_INDEX_LAYOUT = struct([
  publicKey("reserve"),
  u64("unCollLTokenAmount"),
  u128("index"),
]);

export function parseMinerInfo(data: any, miner: PublicKey) {
  let dataBuffer = data as Buffer;
  let infoData = dataBuffer;
  let indexData = dataBuffer.slice(MINER_LAYOUT.span);
  let newMinerInfo = MINER_LAYOUT.decode(infoData);
  let { version, owner, lendingMarket, reservesLen, unclaimedMine } =
    newMinerInfo;
  let indexs: MinerIndex[] = [];
  for (let i = 0; i < new BN(reservesLen).toNumber(); i++) {
    let currentIndexData = indexData.slice(i * MINER_INDEX_LAYOUT.span);
    let decodedIndex = MINER_INDEX_LAYOUT.decode(currentIndexData);
    let { reserve, unCollLTokenAmount, index } = decodedIndex;
    indexs.push(new MinerIndex(reserve, unCollLTokenAmount, index));
  }
  return new MinerInfo(
    miner,
    new BN(version),
    owner,
    lendingMarket,
    new BN(reservesLen),
    new BN(unclaimedMine),
    indexs,
  );
}

export async function getMiner(connection: Connection, wallet: PublicKey) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 1,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 642,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allMinerAccount = await connection.getProgramAccounts(
    LARIX_PROGRAM_ID,
    config,
  );
  let allMinerInfo: MinerInfo[] = [];
  for (let account of allMinerAccount) {
    let currentFarmInfo = parseMinerInfo(account.account.data, account.pubkey);
    allMinerInfo.push(currentFarmInfo);
  }
  return allMinerInfo;
}
export async function checkMinerCreated(
  connection: Connection,
  wallet: PublicKey,
) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 1,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 642,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allMinerAccount = await connection.getProgramAccounts(
    LARIX_PROGRAM_ID,
    config,
  );
  if (allMinerAccount.length == 0) {
    return false;
  }
  return true;
}

export async function newMinerAccountPub(wallet: PublicKey) {
  let newMiner = await PublicKey.createWithSeed(
    wallet,
    "Dappio",
    LARIX_PROGRAM_ID,
  );
  return newMiner;
}
