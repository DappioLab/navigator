import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import BN from "bn.js";
import { IFarmerInfo, IFarmInfo, IPoolInfo, IPoolInfoWrapper } from "../types";
import {
  computeD,
  getTokenAccountAmount,
  getTokenSupply,
  normalizedTradeFee,
  N_COINS,
  ZERO,
} from "../utils";
import { ORCA_FARM_PROGRAM_ID, ORCA_SWAP_PROGRAM_ID } from "./ids";
import { FARMER_LAYOUT, FARM_LAYOUT, POOL_LAYOUT } from "./layouts";
import { MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import { utils } from "..";
export interface PoolInfo extends IPoolInfo {
  version: BN;
  isInitialized: BN;
  nonce: BN;
  tokenProgramId: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  feeAccount: PublicKey;
  tokenSupplyA: BN;
  tokenSupplyB: BN;
  lpSupply: BN;
}
export interface FarmInfo extends IFarmInfo {
  isInitialized: BN;
  accountType: BN;
  nonce: BN;
  tokenProgramId: PublicKey;
  emissionsAuthority: PublicKey;
  removeRewardsAuthority: PublicKey;
  baseTokenMint: PublicKey;
  baseTokenVault: PublicKey;
  rewardTokenVault: PublicKey;
  farmTokenMint: PublicKey;
  authority: PublicKey;
  emissionsPerSecondNumerator: BN;
  emissionsPerSecondDenominator: BN;
  lastUpdatedTimestamp: BN;
  cumulativeEmissionsPerFarmToken: BN;
}
export interface FarmerInfo extends IFarmerInfo {
  isInitialized: BN;
  accountType: BN;
  cumulativeEmissionsCheckpoint: BN;
}
export async function getAllPools(connection: Connection): Promise<PoolInfo[]> {
  let allPools: PoolInfo[] = [];
  let newAllPools: PoolInfo[] = [];
  let accounts: {
    tokenAccountA: BN;
    tokenAccountB: BN;
    LPsupply: BN;
  }[] = [];
  let pubKeys: PublicKey[] = [];
  const sizeFilter: DataSizeFilter = {
    dataSize: 324,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allOrcaPool = await connection.getProgramAccounts(
    ORCA_SWAP_PROGRAM_ID,
    config,
  );
  for (const accountInfo of allOrcaPool) {
    let pooldata = await parsePoolInfoData(
      accountInfo.account.data,
      accountInfo.pubkey,
    );
    allPools.push(pooldata);
    pubKeys.push(pooldata.tokenAccountA);
    pubKeys.push(pooldata.tokenAccountB);
    pubKeys.push(pooldata.lpMint);
  }
  while (pubKeys.length > 0) {
    let pubKeysChunk = pubKeys.splice(
      0,
      pubKeys.length > 99 ? 99 : pubKeys.length,
    );
    let amountInfos = await connection.getMultipleAccountsInfo(pubKeysChunk);
    for (let i = 0; i < amountInfos.length / 3; i++) {
      let tokenAAmount = utils.parseTokenAccount(
        amountInfos[i * 3]?.data,
        pubKeysChunk[i * 3],
      ).amount;
      let tokenBAmount = utils.parseTokenAccount(
        amountInfos[i * 3 + 1]?.data,
        pubKeysChunk[i * 3 + 1],
      ).amount;
      let lpSupply = new BN(
        Number(
          MintLayout.decode(amountInfos[i * 3 + 2]?.data as Buffer).supply,
        ),
      );
      accounts.push({
        tokenAccountA: tokenAAmount,
        tokenAccountB: tokenBAmount,
        LPsupply: lpSupply,
      });
    }
  }

  allPools.map((item, index) => {
    const { tokenAccountA, tokenAccountB, LPsupply } = accounts[index];
    let newItem = item;
    newItem = {
      ...newItem,
      tokenSupplyA: tokenAccountA,
      tokenSupplyB: tokenAccountB,
      lpSupply: LPsupply,
    };
    if (newItem.lpSupply.cmpn(0)) {
      newAllPools.push(newItem);
    }
  });

  return newAllPools;
}

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: PoolInfo) {}
  async calculateSwapOutAmount(fromSide: string, amountIn: BN) {
    if (fromSide == "coin") {
      let x1 = this.poolInfo.tokenSupplyA;

      let y1 = this.poolInfo.tokenSupplyB;
      let k = x1.mul(y1);
      let x2 = x1.add(amountIn);
      let y2 = k.div(x2);
      let amountOut = y1.sub(y2);

      return amountOut;
    } else if (fromSide == "pc") {
      let x1 = this.poolInfo.tokenSupplyB;
      let y1 = this.poolInfo.tokenSupplyA;
      let k = x1.mul(y1);
      let x2 = x1.add(amountIn);
      let y2 = k.div(x2);
      let amountOut = y1.sub(y2);

      return amountOut;
    }
    return new BN(0);
  }
}
export async function parsePoolInfoData(
  data: any,
  pubkey: PublicKey,
): Promise<PoolInfo> {
  const decodedData = POOL_LAYOUT.decode(data);
  let {
    version,
    isInitialized,
    nonce,
    tokenProgramId,
    tokenAccountA,
    tokenAccountB,
    LPmint,
    mintA,
    mintB,
    feeAccount,
  } = decodedData;
  let poolInfo = new PoolInfoWrapper({
    poolId: pubkey,
    version: version,
    isInitialized: new BN(isInitialized),
    nonce: new BN(nonce),
    tokenProgramId: tokenProgramId,
    tokenAccountA: tokenAccountA,
    tokenAccountB: tokenAccountB,
    feeAccount: feeAccount,
    lpMint: LPmint,
    tokenAMint: mintA,
    tokenBMint: mintB,
    lpSupply: new BN(0),
    tokenSupplyA: new BN(0),
    tokenSupplyB: new BN(0),
  });
  return poolInfo.poolInfo;
}

export async function getAllFarmers(
  connection: Connection,
  wallet: PublicKey,
): Promise<FarmerInfo[]> {
  let allFarmers: FarmerInfo[] = [];
  const sizeFilter: DataSizeFilter = {
    dataSize: 106,
  };
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 34,
      bytes: wallet.toString(),
    },
  };
  const filters = [sizeFilter, adminIdMemcmp];

  const config: GetProgramAccountsConfig = { filters: filters };
  const allOrcaPool = await connection.getProgramAccounts(
    ORCA_FARM_PROGRAM_ID,
    config,
  );
  for (const accountInfo of allOrcaPool) {
    let farmerInfo = await parseFarmerInfoData(
      accountInfo.account.data,
      accountInfo.pubkey,
    );
    allFarmers.push(farmerInfo);
  }
  return allFarmers;
}
export async function getAllFarms(connection: Connection): Promise<FarmInfo[]> {
  let allFarms: FarmInfo[] = [];
  const sizeFilter: DataSizeFilter = {
    dataSize: 283,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allOrcaFarm = await connection.getProgramAccounts(
    ORCA_FARM_PROGRAM_ID,
    config,
  );
  for (const accountInfo of allOrcaFarm) {
    let farmdata = await parseFarmInfoData(
      accountInfo.account.data,
      accountInfo.pubkey,
    );

    if (farmdata.emissionsPerSecondNumerator.cmpn(0)) {
      continue;
    }
    allFarms.push(farmdata);
  }
  return allFarms;
}
export async function parseFarmInfoData(
  data: any,
  pubkey: PublicKey,
): Promise<FarmInfo> {
  const decodedData = FARM_LAYOUT.decode(data);
  let authority = await PublicKey.findProgramAddress(
    [pubkey.toBuffer()],
    ORCA_FARM_PROGRAM_ID,
  );
  let {
    isInitialized,
    accountType,
    nonce,
    tokenProgramId,
    emissionsAuthority,
    removeRewardsAuthority,
    baseTokenMint,
    baseTokenVault,
    rewardTokenVault,
    farmTokenMint,
    emissionsPerSecondNumerator,
    emissionsPerSecondDenominator,
    lastUpdatedTimestamp,
    cumulativeEmissionsPerFarmToken,
  } = decodedData;
  let farmInfo = {
    farmId: pubkey,
    isInitialized: new BN(isInitialized),
    nonce: new BN(nonce),
    tokenProgramId: tokenProgramId,
    accountType: new BN(accountType),
    emissionsAuthority: emissionsAuthority,
    removeRewardsAuthority: removeRewardsAuthority,
    baseTokenMint: baseTokenMint,
    baseTokenVault: baseTokenVault,
    rewardTokenVault: rewardTokenVault,
    authority: authority[0],
    farmTokenMint: farmTokenMint,
    emissionsPerSecondNumerator: emissionsPerSecondNumerator,
    emissionsPerSecondDenominator: emissionsPerSecondDenominator,
    lastUpdatedTimestamp: lastUpdatedTimestamp,
    cumulativeEmissionsPerFarmToken: new BN(
      cumulativeEmissionsPerFarmToken,
      10,
      "le",
    ),
  };
  return farmInfo;
}

export async function parseFarmerInfoData(
  data: any,
  pubkey: PublicKey,
): Promise<FarmerInfo> {
  let decodedData = FARMER_LAYOUT.decode(data);
  let {
    isInitialized,
    accountType,
    globalFarm,
    owner,
    baseTokensConverted,
    cumulativeEmissionsCheckpoint,
  } = decodedData;
  let farmerInfo = {
    farmerId: pubkey,
    farmId: globalFarm,
    userKey: owner,
    amount: new BN(baseTokensConverted).toNumber(),
    isInitialized: new BN(isInitialized),
    accountType: new BN(accountType),
    cumulativeEmissionsCheckpoint: new BN(
      cumulativeEmissionsCheckpoint,
      10,
      "le",
    ),
  };
  return farmerInfo;
}

export async function getPool(poolKey: PublicKey, connection: Connection) {
  let data = (await connection.getAccountInfo(poolKey)) as AccountInfo<Buffer>;
  let pool = await parsePoolInfoData(data.data, poolKey);
  let accounts = [pool.tokenAccountA, pool.tokenAccountB, pool.lpMint];
  let balanceAccounts = (await connection.getMultipleAccountsInfo(
    accounts,
  )) as AccountInfo<Buffer>[];
  let tokenAccountABalance = utils.parseTokenAccount(
    balanceAccounts[0].data,
    accounts[0],
  ).amount;
  let tokenAccountBBalance = utils.parseTokenAccount(
    balanceAccounts[1].data,
    accounts[1],
  ).amount;
  let lpMintBalance = new BN(
    Number(MintLayout.decode(balanceAccounts[2]?.data as Buffer).supply),
  );
  pool.tokenSupplyA = tokenAccountABalance;
  pool.tokenSupplyB = tokenAccountBBalance;
  pool.lpSupply = lpMintBalance;
  return pool;
}

export async function getPoolAuthority(poolKey: PublicKey) {
  let poolAuthority = await PublicKey.findProgramAddress(
    [poolKey.toBuffer()],
    ORCA_SWAP_PROGRAM_ID,
  );
  return poolAuthority[0];
}

export async function checkFarmer(
  farmId: PublicKey,
  wallet: PublicKey,
  connection: Connection,
) {
  let farmer = await getFarmerKey(farmId, wallet);
  let farmerAccount = await connection.getAccountInfo(farmer[0]);
  if ((farmerAccount?.data.length as number) > 0) {
    return true;
  }
  return false;
}

export async function getFarmerKey(farmId: PublicKey, wallet: PublicKey) {
  let farmerKey = await PublicKey.findProgramAddress(
    [farmId.toBuffer(), wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer()],
    ORCA_FARM_PROGRAM_ID,
  );
  return farmerKey;
}

export async function getFarm(farmId: PublicKey, connection: Connection) {
  let data = (await connection.getAccountInfo(farmId)) as AccountInfo<Buffer>;
  let farm = await parseFarmInfoData(data.data, farmId);
  return farm;
}
export async function getFarmer(farmerID: PublicKey, connection: Connection) {
  let data = (await connection.getAccountInfo(farmerID)) as AccountInfo<Buffer>;
  let farmer = await parseFarmerInfoData(data.data, farmerID);
  return farmer;
}
