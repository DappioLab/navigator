import { Connection, PublicKey, AccountInfo, DataSizeFilter, GetProgramAccountsConfig } from "@solana/web3.js";
import { IFarmInfoWrapper, IInstanceFarm } from "../types";
import { FARM_MASTER_ID, GENOPETS_FARM_PROGRAM_ID } from "./ids";
import { FARMER_INSTANCE_LAYOUT, FARMER_LAYOUT, FARM_MASTER_LAYOUT, FARM_LAYOUT } from "./layouts";
import * as types from ".";
import { getMultipleAccounts } from "../utils";
import { getFarmerInstanceKey } from "./utils";

let infos: IInstanceFarm;
infos = class InstanceGenopets {
  static async getAllFarms(connection: Connection): Promise<types.FarmInfo[]> {
    const farmMasterAccount = await connection.getAccountInfo(FARM_MASTER_ID);
    const farmMaster = this._parseFarmMaster(farmMasterAccount?.data!, FARM_MASTER_ID);

    const sizeFilter: DataSizeFilter = {
      dataSize: 250,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allFarms = await connection.getProgramAccounts(GENOPETS_FARM_PROGRAM_ID, config);
    const farms = allFarms.map((account) => {
      let farm = this.parseFarm(account.account.data, account.pubkey);
      farm.master = farmMaster;
      return farm;
    });

    return farms;
  }

  static async getAllFarmWrappers(connection: Connection): Promise<types.FarmInfoWrapper[]> {
    return (await this.getAllFarms(connection)).map((farmInfo) => new FarmInfoWrapper(farmInfo));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
    const [farmMasterAccount, farmAccount] = await getMultipleAccounts(connection, [FARM_MASTER_ID, farmId]);
    if (!farmMasterAccount || !farmAccount) throw "Error: Failed to get farm";
    const farmMaster = this._parseFarmMaster(farmMasterAccount.account?.data!, FARM_MASTER_ID);
    let farm = this.parseFarm(farmAccount.account?.data!, farmId);
    farm.master = farmMaster;

    return farm;
  }

  static async getFarmWrapper(connection: Connection, farmId: PublicKey): Promise<FarmInfoWrapper> {
    const farm = await this.getFarm(connection, farmId);

    return new FarmInfoWrapper(farm);
  }

  static parseFarm(data: Buffer, farmId: PublicKey): types.FarmInfo {
    const decodedData = FARM_LAYOUT.decode(data);

    let {
      poolToken,
      tokenDecimals,
      weight,
      earliestUnlockDate,
      usersLockingWeight,
      poolTokenReserve,
      weightPerToken,
      governanceEligible,
    } = decodedData;

    return {
      farmId,
      master: types.defaultFarmerMaster,
      poolToken,
      tokenDecimals,
      weight,
      earliestUnlockDate,
      usersLockingWeight,
      poolTokenReserve,
      weightPerToken,
      governanceEligible,
    };
  }

  private static _parseFarmMaster(data: Buffer, id: PublicKey): types.FarmMaster {
    const decodedData = FARM_MASTER_LAYOUT.decode(data);

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
      id,
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
    const farmer = await this.getFarmer(connection, farmerId);

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
    const farmerInstanceKeys: PublicKey[] = [];
    for (let i = 0; i < Number(farmer.currentDepositIndex); i++) {
      farmerInstanceKeys.push(getFarmerInstanceKey(farmer.userKey, i));
    }
    const farmerInstanceAccounts = await getMultipleAccounts(connection, farmerInstanceKeys);
    farmer.instance = farmerInstanceAccounts
      .map((farmerInstance) => {
        return farmerInstance.account?.data
          ? this._parseFarmerInstance(farmerInstance.account?.data, farmerInstance.pubkey)
          : null;
      })
      .filter((farmerInstance) => Boolean(farmerInstance)) as types.FarmerInstance[];

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
      instance: [],
    };
  }

  private static _parseFarmerInstance(data: Buffer, depositId: PublicKey): types.FarmerInstance {
    let decodedData = FARMER_INSTANCE_LAYOUT.decode(data);
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
}

export class FarmerInfoWrapper {
  constructor(public farmerInfo: types.FarmerInfo) {}

  getFarmerInstance() {
    return getFarmerInstanceKey(this.farmerInfo.userKey, Number(this.farmerInfo.currentDepositIndex));
  }

  getLatestFarmerInstance() {
    return getFarmerInstanceKey(this.farmerInfo.userKey, Number(this.farmerInfo.currentDepositIndex) + 1);
  }
}
