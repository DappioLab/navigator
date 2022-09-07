import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { find } from "lodash";
import { AllInfo, NFTFarmInfo, NFTInfo, NFTPoolInfo, NFTRarityInfo, UserNFTInfo } from ".";

export function getStakedAmount(allInfos: AllInfo[], collection: string = "", rarity: string = "") {
  const targetAllInfos = allInfos.filter(
    (allInfo) =>
      (allInfo.rarityInfo.collection == collection || collection == "") &&
      (allInfo.rarityInfo.rarity == rarity || rarity == "")
  );
  const totalStaked = targetAllInfos
    .map((allInfo) => Number(allInfo.poolInfo.totalStakedAmount))
    .reduce((total, staked) => total + staked);

  return totalStaked;
}

export async function getNFTUUnclaimedAmount(
  allInfos: AllInfo[],
  userInfo: UserNFTInfo,
  connection: Connection,
  collection: string = "",
  rarity: string = ""
) {
  const currentSlot = await connection.getSlot();
  const allInfoMap = new Map<string, number>();
  allInfos.forEach((allInfo, index) => {
    allInfoMap.set(allInfo.farmInfo.farmId.toString(), index);
  });

  let totalUnclaimAmount = 0;
  userInfo.farmers.forEach((farmer) => {
    const allInfoIndex = allInfoMap.get(farmer.farmId.toString());
    if (allInfoIndex != undefined) {
      const allInfo = allInfos[allInfoIndex];
      if (
        (collection == "" || allInfo.rarityInfo.collection == collection) &&
        (rarity == "" || allInfo.rarityInfo.rarity == rarity)
      ) {
        const rewardTokenPerSlot = Number(allInfo.farmInfo.rewardTokenPerSlot);
        const unclaimedAmount = Number(farmer.unclaimedAmount);
        const depositedAmount = Number(farmer.depositedAmount);
        const lastUpdateSlot = Number(farmer.lastUpdateSlot);

        totalUnclaimAmount += unclaimedAmount + (currentSlot - lastUpdateSlot) * rewardTokenPerSlot * depositedAmount;
      }
    }
  });
  return totalUnclaimAmount;
}

// infoAndNftMatcher (deprecated)
export function filterAllInfosByNFTMint(allInfos: AllInfo[], nftMints: PublicKey[]): NFTInfo[] {
  let nftInfos: NFTInfo[] = [];
  for (let nftMint of nftMints) {
    for (let allInfo of allInfos) {
      if (find(allInfo.rarityInfo.mintList, (allowedMint) => allowedMint.equals(nftMint))) {
        nftInfos.push({
          allInfo: allInfo,
          nftMint: nftMint,
        });
        break;
      }
    }
  }

  return nftInfos;
}

// getAllInfoFromPoolInfoKey (deprecated)
export function filterAllInfosByPoolId(allInfos: AllInfo[], poolId: PublicKey): AllInfo | undefined {
  let targetInfo: AllInfo | undefined = undefined;
  for (let allInfo of allInfos) {
    if (allInfo.poolInfo.poolId.equals(poolId)) {
      return allInfo;
    }
  }

  return targetInfo;
}

// getFarmInfosFromFarmInfoKeys (deprecated)
export function filterFarmInfosByFarmIds(allInfos: AllInfo[], farmIds: PublicKey[]) {
  const allInfoMap = new Map<string, number>();
  allInfos.forEach((allInfo, index) => {
    allInfoMap.set(allInfo.farmInfo.farmId.toString(), index);
  });

  let farmInfos: NFTFarmInfo[] = [];
  farmIds.forEach((farmId) => {
    const allInfoIndex = allInfoMap.get(farmId.toString());
    if (allInfoIndex != undefined) {
      farmInfos.push(allInfos[allInfoIndex].farmInfo);
    }
  });

  return farmInfos;
}
