import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { find } from "lodash";
import { NFTFarmInfo, NFTPoolInfo, NFTRarityInfo, infos, NFTFarmerInfo, NFTLockerInfo } from ".";

export async function getStakedAmount(
  connection: Connection,
  collection: string = "",
  rarity: string = "",
  rarityInfos?: NFTRarityInfo[],
  poolInfos?: NFTPoolInfo[],
  farmInfos?: NFTFarmInfo[]
): Promise<number> {
  const rarityMap = new Map<string, number>();
  const farmMap = new Map<string, number>();
  const allRarityInfos = rarityInfos ? rarityInfos : ((await infos.getAllRarities(connection)) as NFTRarityInfo[]);
  const allPoolInfos = poolInfos ? poolInfos : ((await infos.getAllPools(connection)) as NFTPoolInfo[]);
  const allFarmInfos = farmInfos ? farmInfos : ((await infos.getAllFarms(connection)) as NFTFarmInfo[]);
  allRarityInfos.forEach((rarityInfo, index) => {
    rarityMap.set(rarityInfo.rarityId.toString(), index);
  });
  allFarmInfos.map((farmInfo, index) => {
    farmMap.set(farmInfo.proveTokenMint.toString(), index);
  });

  // bind infos
  const allFullInfos = allPoolInfos.map((poolInfo) => {
    const rarityIndex = rarityMap.get(poolInfo.rarityId.toString());
    const farmIndex = farmMap.get(poolInfo.proveTokenMint.toString());
    if (rarityIndex != undefined && farmIndex != undefined) {
      return { rarityInfo: allRarityInfos[rarityIndex], poolInfo: poolInfo, farmInfo: allFarmInfos[farmIndex] };
    }
  });

  const targetFullInfos = allFullInfos.filter((fullInfo) =>
    !fullInfo
      ? undefined
      : (fullInfo.rarityInfo.collection == collection || collection == "") &&
        (fullInfo.rarityInfo.rarity == rarity || rarity == "")
  );
  const totalStaked = targetFullInfos
    .filter((fullInfo) => fullInfo)
    .map((fullInfo) => Number(fullInfo!.poolInfo.totalStakedAmount))
    .reduce((total, staked) => total + staked);

  return totalStaked;
}

export async function getNFTUUnclaimedAmount(
  connection: Connection,
  userKey: PublicKey,
  collection: string = "",
  rarity: string = "",
  rarityInfos?: NFTRarityInfo[],
  poolInfos?: NFTPoolInfo[],
  farmInfos?: NFTFarmInfo[],
  farmerInfos?: NFTFarmerInfo[]
): Promise<number> {
  const rarityMap = new Map<string, number>();
  const farmMap = new Map<string, number>();
  const fullInfoMap = new Map<string, number>();
  const allRarityInfos = rarityInfos ? rarityInfos : ((await infos.getAllRarities(connection)) as NFTRarityInfo[]);
  const allPoolInfos = poolInfos ? poolInfos : ((await infos.getAllPools(connection)) as NFTPoolInfo[]);
  const allFarmInfos = farmInfos ? farmInfos : ((await infos.getAllFarms(connection)) as NFTFarmInfo[]);
  const allFarmerInfos = farmerInfos
    ? farmerInfos
    : ((await infos.getAllNFTFarmers(connection)).filter((farmer) =>
        farmer.userKey.equals(userKey)
      ) as NFTFarmerInfo[]);
  allRarityInfos.forEach((rarityInfo, index) => {
    rarityMap.set(rarityInfo.rarityId.toString(), index);
  });
  allFarmInfos.map((farmInfo, index) => {
    farmMap.set(farmInfo.proveTokenMint.toString(), index);
  });

  // bind infos
  const allFullInfos = allPoolInfos.map((poolInfo) => {
    const rarityIndex = rarityMap.get(poolInfo.rarityId.toString());
    const farmIndex = farmMap.get(poolInfo.proveTokenMint.toString());
    if (rarityIndex != undefined && farmIndex != undefined) {
      return { rarityInfo: allRarityInfos[rarityIndex], poolInfo: poolInfo, farmInfo: allFarmInfos[farmIndex] };
    }
  });

  const currentSlot = await connection.getSlot();
  allFullInfos.forEach((fullInfo, index) => {
    if (fullInfo != undefined) fullInfoMap.set(fullInfo.farmInfo.farmId.toString(), index);
  });

  let totalUnclaimAmount = 0;
  allFarmerInfos.forEach((farmer) => {
    const fullInfoIndex = fullInfoMap.get(farmer.farmId.toString());
    if (fullInfoIndex != undefined) {
      const fullInfo = allFullInfos[fullInfoIndex];
      if (fullInfo != undefined) {
        if (
          (collection == "" || fullInfo.rarityInfo.collection == collection) &&
          (rarity == "" || fullInfo.rarityInfo.rarity == rarity)
        ) {
          const rewardTokenPerSlot = Number(fullInfo.farmInfo.rewardTokenPerSlot);
          const unclaimedAmount = Number(farmer.unclaimedAmount);
          const depositedAmount = Number(farmer.depositedAmount);
          const lastUpdateSlot = Number(farmer.lastUpdateSlot);

          totalUnclaimAmount += unclaimedAmount + (currentSlot - lastUpdateSlot) * rewardTokenPerSlot * depositedAmount;
        }
      }
    }
  });
  return totalUnclaimAmount;
}

// infoAndNftMatcher (deprecated)
export async function getFullInfosByMints(
  connection: Connection,
  nftMints: PublicKey[],
  rarityInfos?: NFTRarityInfo[],
  poolInfos?: NFTPoolInfo[],
  farmInfos?: NFTFarmInfo[]
): Promise<
  (
    | {
        rarityInfo: NFTRarityInfo;
        poolInfo: NFTPoolInfo;
        farmInfo: NFTFarmInfo;
      }
    | undefined
  )[]
> {
  const rarityMap = new Map<string, number>();
  const mintMap = new Map<string, string>();
  const farmMap = new Map<string, number>();
  const allRarityInfos = rarityInfos ? rarityInfos : ((await infos.getAllRarities(connection)) as NFTRarityInfo[]);
  const allPoolInfos = poolInfos ? poolInfos : ((await infos.getAllPools(connection)) as NFTPoolInfo[]);
  const allFarmInfos = farmInfos ? farmInfos : ((await infos.getAllFarms(connection)) as NFTFarmInfo[]);
  allRarityInfos.forEach((rarityInfo, index) => {
    rarityMap.set(rarityInfo.rarityId.toString(), index);
  });
  allFarmInfos.map((farmInfo, index) => {
    farmMap.set(farmInfo.proveTokenMint.toString(), index);
  });

  // bind infos
  const allFullInfos = allPoolInfos.map((poolInfo) => {
    const rarityIndex = rarityMap.get(poolInfo.rarityId.toString());
    const farmIndex = farmMap.get(poolInfo.proveTokenMint.toString());
    if (rarityIndex != undefined && farmIndex != undefined) {
      allRarityInfos[rarityIndex].mintList.forEach((mint) => {
        mintMap.set(mint.toString(), allRarityInfos[rarityIndex].rarityId.toString());
      });
      return { rarityInfo: allRarityInfos[rarityIndex], poolInfo: poolInfo, farmInfo: allFarmInfos[farmIndex] };
    }
  });

  let fullInfos = nftMints.map((nftMint) => {
    const rarityId = mintMap.get(nftMint.toString());
    if (rarityId != undefined) {
      return allFullInfos.find((fullInfo) => fullInfo?.rarityInfo.rarityId.toString() == rarityId);
    }
  });

  return fullInfos;
}

// getAllInfoFromPoolInfoKey (deprecated)
export async function getFullInfoByPoolId(
  connection: Connection,
  poolId: PublicKey,
  rarityInfos?: NFTRarityInfo[],
  poolInfos?: NFTPoolInfo[],
  farmInfos?: NFTFarmInfo[]
): Promise<
  | {
      rarityInfo: NFTRarityInfo;
      poolInfo: NFTPoolInfo;
      farmInfo: NFTFarmInfo;
    }
  | undefined
> {
  const rarityMap = new Map<string, number>();
  const farmMap = new Map<string, number>();
  const allRarityInfos = rarityInfos ? rarityInfos : ((await infos.getAllRarities(connection)) as NFTRarityInfo[]);
  const allPoolInfos = poolInfos ? poolInfos : ((await infos.getAllPools(connection)) as NFTPoolInfo[]);
  const allFarmInfos = farmInfos ? farmInfos : ((await infos.getAllFarms(connection)) as NFTFarmInfo[]);
  allRarityInfos.forEach((rarityInfo, index) => {
    rarityMap.set(rarityInfo.rarityId.toString(), index);
  });
  allFarmInfos.map((farmInfo, index) => {
    farmMap.set(farmInfo.proveTokenMint.toString(), index);
  });

  const targetPoolInfo = allPoolInfos.find((poolInfo) => poolInfo.poolId.equals(poolId));
  if (targetPoolInfo == undefined) {
    return undefined;
  } else {
    const rarityIndex = rarityMap.get(targetPoolInfo.rarityId.toString());
    const farmIndex = farmMap.get(targetPoolInfo.proveTokenMint.toString());
    if (rarityIndex != undefined && farmIndex != undefined) {
      return { rarityInfo: allRarityInfos[rarityIndex], poolInfo: targetPoolInfo, farmInfo: allFarmInfos[farmIndex] };
    } else return undefined;
  }
}

// getFarmInfosFromFarmInfoKeys (deprecated)
export async function getFarmInfosByFarmIds(
  connection: Connection,
  farmIds: PublicKey[],
  farmInfos?: NFTFarmInfo[]
): Promise<NFTFarmInfo[]> {
  const allFarmInfos = farmInfos ? farmInfos : ((await infos.getAllFarms(connection)) as NFTFarmInfo[]);

  const farmInfoMap = new Map<string, number>();
  allFarmInfos.forEach((farmInfo, index) => {
    farmInfoMap.set(farmInfo.farmId.toString(), index);
  });

  let targetFarmInfos: NFTFarmInfo[] = [];
  farmIds.forEach((farmId) => {
    const farmIndex = farmInfoMap.get(farmId.toString());
    if (farmIndex != undefined) {
      targetFarmInfos.push(allFarmInfos[farmIndex]);
    }
  });

  return targetFarmInfos;
}

// fetchAll (deprecated)
export async function getFullInfo(connection: Connection): Promise<{
  rarityInfos: NFTRarityInfo[];
  poolInfos: NFTPoolInfo[];
  farmInfos: NFTFarmInfo[];
}> {
  const rarityInfos = (await infos.getAllRarities(connection)) as NFTRarityInfo[];
  const poolInfos = (await infos.getAllPools(connection)) as NFTPoolInfo[];
  const farmInfos = (await infos.getAllFarms(connection)) as NFTFarmInfo[];

  return { rarityInfos: rarityInfos, poolInfos: poolInfos, farmInfos: farmInfos };
}

// fetchUser (deprecated)
export async function getLockersAndFarmers(
  connection: Connection,
  userKey: PublicKey,
  lockerInfos?: NFTLockerInfo[],
  farmerInfos?: NFTFarmerInfo[]
): Promise<{
  lockers: NFTLockerInfo[];
  farmers: NFTFarmerInfo[];
}> {
  const allLockerInfos = lockerInfos
    ? lockerInfos
    : ((await infos.getAllNFTLockers(connection)).filter((locker) =>
        locker.userKey.equals(userKey)
      ) as NFTLockerInfo[]);
  const allFarmerInfos = farmerInfos
    ? farmerInfos
    : ((await infos.getAllNFTFarmers(connection)).filter((farmer) =>
        farmer.userKey.equals(userKey)
      ) as NFTFarmerInfo[]);

  return { lockers: allLockerInfos, farmers: allFarmerInfos };
}
