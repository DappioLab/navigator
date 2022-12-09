import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  GetProgramAccountsFilter,
} from "@solana/web3.js";
import BN from "bn.js";
import { ICLPoolWrapper, ICLPositionInfo, IInstanceCLPool, PageConfig } from "../types";
import { CONFIG_LAYOUT, POSITION_LAYOUT, TICK_ARRAY_LAYOUT, WHIRLPOOL_LAYOUT } from "./layouts";
import { ORCA_WHIRLPOOLS_CONFIG, ORCA_WHIRLPOOLS_PROGRAM_ID } from "./ids";
import * as types from ".";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";

let infos: IInstanceCLPool;

infos = class InstanceWhirlpools {
  static async getAllPools(connection: Connection, page?: PageConfig): Promise<types.PoolInfo[]> {
    const wpConfig = await getConfig(connection);
    let filters: GetProgramAccountsFilter[] = [{ memcmp: { offset: 8, bytes: wpConfig.configId.toString() } }];

    const config: GetProgramAccountsConfig = { filters: filters };
    let whirlpoolInfos = await connection.getProgramAccounts(ORCA_WHIRLPOOLS_PROGRAM_ID, config);
    let ticksMaps = await getAllTickMap(connection);
    return whirlpoolInfos
      .filter((info) => info.account.data.length > 600)
      .map((whirlpoolInfo) => {
        const poolInfo = this.parsePool(whirlpoolInfo.account.data, whirlpoolInfo.pubkey);
        return {
          ...poolInfo,
          config: wpConfig,
          tickArray: ticksMaps.has(poolInfo.poolId.toString()) ? ticksMaps.get(poolInfo.poolId.toString())! : [],
        };
      });
  }
  static async getPool(connection: Connection, poolId: PublicKey): Promise<types.PoolInfo> {
    const wpConfig = await getConfig(connection);
    let ticksMaps = await getAllTickMap(connection);
    const poolInfoRaw = await connection.getAccountInfo(poolId);
    let poolInfo = this.parsePool(poolInfoRaw!.data, poolId);

    return {
      ...poolInfo,
      config: wpConfig,
      tickArray: ticksMaps.has(poolInfo.poolId.toString()) ? ticksMaps.get(poolInfo.poolId.toString())! : [],
    };
  }
  static async getPoolWrapper(connection: Connection, poolId: PublicKey): Promise<PoolInfoWrapper> {
    const pool = await this.getPool(connection, poolId);
    return new PoolInfoWrapper(pool);
  }

  static parsePool(data: Buffer, infoPubkey: PublicKey): types.PoolInfo {
    if (data.length < WHIRLPOOL_LAYOUT.span) throw new Error("Invalid pool data");
    let parsed = WHIRLPOOL_LAYOUT.decode(data) as types.PoolInfo;
    return { ...parsed, poolId: infoPubkey, tokenAMint: parsed.tokenMintA, tokenBMint: parsed.tokenMintB };
  }
  static async getAllPoolWrappers(connection: Connection, page?: PageConfig): Promise<PoolInfoWrapper[]> {
    return (await this.getAllPools(connection, page)).map((pool) => new PoolInfoWrapper(pool));
  }
  static async getPosition(connection: Connection, positionId: PublicKey): Promise<ICLPositionInfo> {
    const positionInfoRaw = await connection.getAccountInfo(positionId);

    return this.parsePosition(positionInfoRaw!.data, positionId);
  }
  static async getAllPositions(connection: Connection, userKey: PublicKey): Promise<ICLPositionInfo[]> {
    let allUserTokenMintSet = new Map<string, BN>();
    (await connection.getTokenAccountsByOwner(userKey, { programId: TOKEN_PROGRAM_ID })).value.forEach((info) => {
      let rawAccount = AccountLayout.decode(info.account.data);
      if (rawAccount.amount.toString() == "0") return false;
      allUserTokenMintSet.set(rawAccount.mint.toString(), new BN(rawAccount.amount.toString()));
    });
    const sizeFilter: DataSizeFilter = {
      dataSize: POSITION_LAYOUT.span,
    };
    let filters: GetProgramAccountsFilter[] = [sizeFilter];
    let allPositionRaw = await connection.getProgramAccounts(ORCA_WHIRLPOOLS_PROGRAM_ID, { filters: filters });
    return allPositionRaw
      .map((info) => {
        return this.parsePosition(info.account.data, info.pubkey);
      })
      .filter((info) => {
        return allUserTokenMintSet.has(info.mint.toString());
      });
  }
  static parsePosition(data: Buffer, positionId: PublicKey): ICLPositionInfo {
    if (data.length < POSITION_LAYOUT.span) throw new Error("Invalid position data");
    return { ...POSITION_LAYOUT.decode(data), positionId: positionId } as ICLPositionInfo;
  }
};
export class PoolInfoWrapper implements ICLPoolWrapper {
  constructor(public poolInfo: types.PoolInfo) {}
  getPositionTokenAmount(position: types.PositionInfo) {
    let liquidity = position.liquidity;
    let currentTick = this.poolInfo.tickCurrentIndex;
    let ticks = this.poolInfo.tickArray.filter(
      (tick) => tick.index >= position.tickLowerIndex && tick.index <= position.tickUpperIndex
    );
  }
}

export async function getConfig(connection: Connection): Promise<types.WhirlpoolConfig> {
  let configInfo = await connection.getAccountInfo(ORCA_WHIRLPOOLS_CONFIG);
  if (configInfo) {
    let parsed = CONFIG_LAYOUT.decode(configInfo.data);
    return { ...parsed, configId: ORCA_WHIRLPOOLS_CONFIG } as types.WhirlpoolConfig;
  } else {
    throw new Error("Config not found");
  }
}
export async function getAllTickMap(connection: Connection, whirlpoolId?: PublicKey) {
  const sizeFilter: DataSizeFilter = {
    dataSize: TICK_ARRAY_LAYOUT.span,
  };
  let filters: GetProgramAccountsFilter[] = [sizeFilter];
  if (whirlpoolId) {
    filters.push({ memcmp: { offset: TICK_ARRAY_LAYOUT.span - 32, bytes: whirlpoolId.toBase58() } });
  }
  const config: GetProgramAccountsConfig = { filters: filters };
  let tickArrayInfos = await connection.getProgramAccounts(ORCA_WHIRLPOOLS_PROGRAM_ID, config);
  let tickArraysMap = new Map<string, types.TickArray[]>();
  let ticksMaps = new Map<string, types.Tick[]>();
  for (let tickArrayInfo of tickArrayInfos) {
    let tickArray = TICK_ARRAY_LAYOUT.decode(tickArrayInfo.account.data) as types.TickArray;
    if (tickArraysMap.has(tickArray.whirlpool.toString())) {
      let array = tickArraysMap.get(tickArray.whirlpool.toString())!;
      array.push(tickArray);
    } else {
      tickArraysMap.set(tickArray.whirlpool.toString(), [tickArray]);
    }
  }
  tickArraysMap.forEach((tickArrays, whirlpoolId) => {
    let ticks: types.Tick[] = [];
    tickArrays.sort((a, b) => a.startTickIndex - b.startTickIndex);
    tickArrays.forEach((tickArray) => {
      for (let i = 0; i < tickArray.ticks.length; i++) {
        let tick = tickArray.ticks[i];
        tick.index = i + tickArray.startTickIndex;
        if (tick) {
          ticks.push(tick);
        }
      }
    });
    ticksMaps.set(whirlpoolId, ticks);
  });
  return ticksMaps;
}

export { infos };
