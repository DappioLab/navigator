import { Connection, PublicKey } from "@solana/web3.js";
import { NFTFarmInfo, NFTPoolInfo, NFTRarityInfo, infos, NFTFarmerInfo, NFTLockerInfo } from ".";

export async function getStakedAmount(
  connection: Connection,
  collection: string = "",
  rarity: string = "",
  fullInfos?: { rarityInfo: NFTRarityInfo; poolInfo: NFTPoolInfo; farmInfo: NFTFarmInfo }[]
): Promise<number> {
  fullInfos ||= await getFullInfo(connection);

  const totalStaked = fullInfos
    .filter(
      (fullInfo) =>
        (fullInfo!.rarityInfo.collection == collection || collection == "") &&
        (fullInfo!.rarityInfo.rarity == rarity || rarity == "")
    )
    .map((fullInfo) => Number(fullInfo!.poolInfo.totalStakedAmount))
    .reduce((total, staked) => total + staked);

  return totalStaked;
}

export async function getNFTUUnclaimedAmount(
  connection: Connection,
  userKey: PublicKey,
  collection: string = "",
  rarity: string = "",
  fullInfos?: { rarityInfo: NFTRarityInfo; poolInfo: NFTPoolInfo; farmInfo: NFTFarmInfo }[],
  farmerInfos?: NFTFarmerInfo[]
): Promise<number> {
  fullInfos ||= await getFullInfo(connection);

  const fullInfoMap = new Map<string, number>();
  const allFarmerInfos = farmerInfos
    ? farmerInfos
    : ((await infos.getAllNFTFarmers(connection)).filter((farmer) =>
        farmer.userKey.equals(userKey)
      ) as NFTFarmerInfo[]);

  const currentSlot = await connection.getSlot();
  fullInfos.forEach((fullInfo, index) => {
    if (fullInfo) fullInfoMap.set(fullInfo.farmInfo.farmId.toString(), index);
  });

  let totalUnclaimAmount = 0;
  allFarmerInfos.forEach((farmer) => {
    const fullInfoIndex = fullInfoMap.get(farmer.farmId.toString());
    const fullInfo = fullInfos![fullInfoIndex || 0];
    if (
      fullInfoIndex !== undefined &&
      fullInfo &&
      (collection == "" || fullInfo.rarityInfo.collection == collection) &&
      (rarity == "" || fullInfo.rarityInfo.rarity == rarity)
    ) {
      const rewardTokenPerSlot = Number(fullInfo.farmInfo.rewardTokenPerSlot);
      const unclaimedAmount = Number(farmer.unclaimedAmount);
      const depositedAmount = Number(farmer.depositedAmount);
      const lastUpdateSlot = Number(farmer.lastUpdateSlot);

      totalUnclaimAmount += unclaimedAmount + (currentSlot - lastUpdateSlot) * rewardTokenPerSlot * depositedAmount;
    }
  });
  return totalUnclaimAmount;
}

// infoAndNftMatcher (deprecated)
export async function getFullInfosByMints(
  connection: Connection,
  nftMints: PublicKey[],
  fullInfos?: { rarityInfo: NFTRarityInfo; poolInfo: NFTPoolInfo; farmInfo: NFTFarmInfo }[]
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
  fullInfos ||= await getFullInfo(connection);

  const mintMap = new Map<string, string>();
  const fullInfoMap = new Map<string, number>();
  fullInfos!.forEach((fullInfo, index) => {
    fullInfo!.rarityInfo.mintList.forEach((mint) => {
      mintMap.set(mint.toString(), fullInfo!.rarityInfo.rarityId.toString());
    });
    fullInfoMap.set(fullInfo!.rarityInfo.rarityId.toString(), index);
  });

  let targetFullInfos = nftMints.map((nftMint) => {
    const rarityId = mintMap.get(nftMint.toString());
    const fullInfoIndex = rarityId !== undefined ? fullInfoMap.get(rarityId) : undefined;

    return fullInfoIndex !== undefined ? fullInfos![fullInfoIndex] : undefined;
  });

  return targetFullInfos;
}

// getAllInfoFromPoolInfoKey (deprecated)
export async function getFullInfoByPoolId(
  connection: Connection,
  poolId: PublicKey,
  fullInfos?: { rarityInfo: NFTRarityInfo; poolInfo: NFTPoolInfo; farmInfo: NFTFarmInfo }[]
): Promise<
  | {
      rarityInfo: NFTRarityInfo;
      poolInfo: NFTPoolInfo;
      farmInfo: NFTFarmInfo;
    }
  | undefined
> {
  fullInfos ||= await getFullInfo(connection);
  return fullInfos.find((fullInfo) => fullInfo.poolInfo.poolId.equals(poolId));
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
    if (farmIndex !== undefined) {
      targetFarmInfos.push(allFarmInfos[farmIndex]);
    }
  });

  return targetFarmInfos;
}

// fetchAll (deprecated)
export async function getFullInfo(connection: Connection): Promise<
  {
    rarityInfo: NFTRarityInfo;
    poolInfo: NFTPoolInfo;
    farmInfo: NFTFarmInfo;
  }[]
> {
  const rarityMap = new Map<string, number>();
  const farmMap = new Map<string, number>();
  const allRarityInfos = (await infos.getAllRarities(connection)) as NFTRarityInfo[];
  const allPoolInfos = (await infos.getAllPools(connection)) as NFTPoolInfo[];
  const allFarmInfos = (await infos.getAllFarms(connection)) as NFTFarmInfo[];
  allRarityInfos.forEach((rarityInfo, index) => {
    rarityMap.set(rarityInfo.rarityId.toString(), index);
  });
  allFarmInfos.forEach((farmInfo, index) => {
    farmMap.set(farmInfo.proveTokenMint.toString(), index);
  });

  // bind infos
  const fullInfos = allPoolInfos
    .map((poolInfo) => {
      const rarityIndex = rarityMap.get(poolInfo.rarityId.toString());
      const farmIndex = farmMap.get(poolInfo.proveTokenMint.toString());

      return rarityIndex !== undefined && farmIndex !== undefined
        ? { rarityInfo: allRarityInfos[rarityIndex], poolInfo: poolInfo, farmInfo: allFarmInfos[farmIndex] }
        : null;
    })
    .filter((info) => Boolean(info)) as { rarityInfo: NFTRarityInfo; poolInfo: NFTPoolInfo; farmInfo: NFTFarmInfo }[];

  return fullInfos;
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
