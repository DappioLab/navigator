import {
  Connection,
  PublicKey,
  AccountInfo,
  DataSizeFilter,
  MemcmpFilter,
  GetProgramAccountsConfig,
} from "@solana/web3.js";
import { IFarmInfoWrapper, IInstanceFarm } from "../types";
import { GENOPETS_FARM_PROGRAM_ID } from "./ids";
import { DEPOSIT_LAYOUT, FARMER_LAYOUT, FARM_LAYOUT } from "./layouts";
import * as types from ".";
import { BN } from "bn.js";
import { getMultipleAccounts } from "../utils";

let infos: IInstanceFarm;
infos = class InstanceGenopets {
  static async getAllFarms(connection: Connection): Promise<types.FarmInfo[]> {
    const farmId = PublicKey.findProgramAddressSync([Buffer.from("stake-master-seed")], GENOPETS_FARM_PROGRAM_ID)[0];
    const farmAccountInfo = await connection.getAccountInfo(farmId);
    const farm = this.parseFarm(farmAccountInfo?.data!, farmId);

    return [farm];
  }

  static async getAllFarmWrappers(connection: Connection): Promise<types.FarmInfoWrapper[]> {
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
    const expectedFarmId = PublicKey.findProgramAddressSync(
      [Buffer.from("stake-master-seed")],
      GENOPETS_FARM_PROGRAM_ID
    )[0];
    if (!farmId.equals(expectedFarmId)) throw "Error: Wrong farmId.";
    let account = (await connection.getAccountInfo(farmId)) as AccountInfo<Buffer>;
    return this.parseFarm(account.data, farmId);
  }

  static async getFarmWrapper(connection: Connection, farmId: PublicKey): Promise<FarmInfoWrapper> {
    const farm = await this.getFarm(connection, farmId);

    return new FarmInfoWrapper(farm);
  }

  static parseFarm(data: Buffer, farmId: PublicKey): types.FarmInfo {
    const decodedData = FARM_LAYOUT.decode(data);

    let {
      authority,
      sgeneMinter,
      mintSgene,
      geneMint,
      geneRewarder,
      totalGeneRewarded,
      ataGeneRewarder,
      totalGeneAllocated,
      totalWeight,
      startTime,
      endTime,
      epochTime,
      decayFactorPerEpoch,
      initialGenesPerEpoch,
      stakeParams,
      pausedState,
      totalRewardWeight,
      accumulatedYieldRewardsPerWeight,
      lastYieldDistribution,
      totalGeneStaked,
      timeFactor,
    } = decodedData;

    return {
      farmId,
      authority,
      sgeneMinter,
      mintSgene,
      geneMint,
      geneRewarder,
      totalGeneRewarded,
      ataGeneRewarder,
      totalGeneAllocated,
      totalWeight,
      startTime,
      endTime,
      epochTime,
      decayFactorPerEpoch,
      initialGenesPerEpoch,
      stakeParams,
      pausedState,
      totalRewardWeight,
      accumulatedYieldRewardsPerWeight,
      lastYieldDistribution,
      totalGeneStaked,
      timeFactor,
    };
  }

  static async getAllFarmers(connection: Connection, userKey: PublicKey): Promise<types.FarmerInfo[]> {
    const farmerId = PublicKey.findProgramAddressSync(
      [Buffer.from("staker-seed"), userKey.toBuffer()],
      GENOPETS_FARM_PROGRAM_ID
    )[0];
    const farmerAccountInfo = await connection.getAccountInfo(farmerId);
    let farmer = this.parseFarmer(farmerAccountInfo?.data!, farmerId);
    const depositKeys: PublicKey[] = [];
    for (let i = 0; i < Number(farmer.currentDepositIndex); i++) {
      depositKeys.push(calcDeposit(farmer.userKey, i));
    }
    const depositAccounts = await getMultipleAccounts(connection, depositKeys);
    farmer.userDeposit = depositAccounts.map((deposit) => {
      return deposit.account?.data ? this._parseDeposit(deposit.account?.data, deposit.pubkey) : null;
    });

    return [farmer];
  }

  static async getFarmerId(farmInfo: types.FarmInfo, userKey: PublicKey): Promise<PublicKey> {
    const [farmerId, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("staker-seed"), userKey.toBuffer()],
      GENOPETS_FARM_PROGRAM_ID
    );

    return farmerId;
  }

  static async getFarmer(connection: Connection, farmerId: PublicKey, version?: number): Promise<types.FarmerInfo> {
    let data = (await connection.getAccountInfo(farmerId)) as AccountInfo<Buffer>;
    let farmer = this.parseFarmer(data.data, farmerId);
    const depositKeys: PublicKey[] = [];
    for (let i = 0; i < Number(farmer.currentDepositIndex); i++) {
      depositKeys.push(calcDeposit(farmer.userKey, i));
    }
    const depositAccounts = await getMultipleAccounts(connection, depositKeys);
    farmer.userDeposit = depositAccounts.map((deposit) => {
      return deposit.account?.data ? this._parseDeposit(deposit.account?.data, deposit.pubkey) : null;
    });

    return farmer;
  }

  static parseFarmer(data: Buffer, farmerId: PublicKey): types.FarmerInfo {
    let decodedData = FARMER_LAYOUT.decode(data);
    let { owner, totalRewardWeight, subYieldRewards, activeDeposits, totalRewards, currentDepositIndex } = decodedData;

    return {
      farmerId,
      userKey: new PublicKey(owner),
      totalRewardWeight,
      subYieldRewards,
      activeDeposits,
      totalRewards,
      currentDepositIndex,
      userDeposit: [],
    };
  }

  private static _parseDeposit(data: Buffer, depositId: PublicKey): types.Deposit {
    let decodedData = DEPOSIT_LAYOUT.decode(data);
    let {
      user,
      amount,
      poolToken,
      rewardWeight,
      depositTimestamp,
      depositMultiplier,
      lockFrom,
      lockUntil,
      isYield,
      tokenDecimals,
      active,
      governanceEligible,
    } = decodedData;

    return {
      depositId,
      user,
      amount,
      poolToken,
      rewardWeight,
      depositTimestamp,
      depositMultiplier,
      lockFrom,
      lockUntil,
      isYield,
      tokenDecimals,
      active,
      governanceEligible,
    };
  }
};

export { infos };

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: types.FarmInfo) {}

  getStakedAmount(): number {
    // TODO
    return 0;
  }

  getAprs(_x: number, _y: number, _z: number): number[] {
    // TODO
    return [];
  }

  getStakingPool(mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("stake-pool-seed"), mint.toBuffer()],
      GENOPETS_FARM_PROGRAM_ID
    )[0];
  }
}

export class FarmerInfoWrapper {
  constructor(public farmerInfo: types.FarmerInfo) {}

  getUserDeposit() {
    return calcDeposit(this.farmerInfo.userKey, Number(this.farmerInfo.currentDepositIndex));
  }

  getUserReDeposit() {
    return calcDeposit(this.farmerInfo.userKey, Number(this.farmerInfo.currentDepositIndex) + 1);
  }
}

export function calcDeposit(userKey: PublicKey, nonce: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("staking-deposit"), userKey.toBuffer(), new BN(nonce).toArrayLike(Buffer, `le`, 4)],
    GENOPETS_FARM_PROGRAM_ID
  )[0];
}
