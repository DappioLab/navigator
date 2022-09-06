import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { find } from "lodash";
import { AllInfo, NFTFarmInfo, NFTInfo, NFTPoolInfo, NFTRarityInfo, UserNFTInfo } from ".";

export function getStakedAmount(allInfos: AllInfo[], collection: string = "", rarity: string = "") {
  let staked = 0;
  for (let allInfo of allInfos) {
    if (allInfo.rarityInfo.collection == collection || collection == "") {
      if (allInfo.rarityInfo.rarity == rarity || rarity == "") {
        staked += Number(allInfo.poolInfo.totalStakedAmount);
      }
    }
  }
  return staked;
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
  allInfos.map((allInfo, index) => {
    allInfoMap.set(allInfo.farmInfo.farmId.toString(), index);
  });

  let totalUnclaimAmount = 0;
  for (let miner of userInfo.miners) {
    const allInfoIndex = allInfoMap.get(miner.farmId.toString());
    if (allInfoIndex != undefined) {
      const allInfo = allInfos[allInfoIndex];
      if (
        (collection == "" || allInfo.rarityInfo.collection == collection) &&
        (rarity == "" || allInfo.rarityInfo.rarity == rarity)
      ) {
        const rewardTokenPerSlot = Number(allInfo.farmInfo.rewardTokenPerSlot);
        const unclaimedAmount = Number(miner.unclaimedAmount);
        const depositedAmount = Number(miner.depositedAmount);
        const lastUpdateSlot = Number(miner.lastUpdateSlot);

        totalUnclaimAmount += unclaimedAmount + (currentSlot - lastUpdateSlot) * rewardTokenPerSlot * depositedAmount;
      }
    }
  }
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
export function filterAllInfosByPoolId(allInfos: AllInfo[], poolId: PublicKey): AllInfo {
  let targetInfo: AllInfo = defaultAllInfo;
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
  allInfos.map((allInfo, index) => {
    allInfoMap.set(allInfo.farmInfo.farmId.toString(), index);
  });

  let farmInfos: NFTFarmInfo[] = [];
  for (let farmId of farmIds) {
    const allInfoIndex = allInfoMap.get(farmId.toString());
    if (allInfoIndex != undefined) {
      farmInfos.push(allInfos[allInfoIndex].farmInfo);
    }
  }

  return farmInfos;
}

// default objects
export const defaultRarityInfo: NFTRarityInfo = {
  rarityId: PublicKey.default,
  admin: PublicKey.default,
  collection: "",
  rarity: "",
  mintList: [],
};

export const defaultPoolInfo: NFTPoolInfo = {
  poolId: PublicKey.default,
  proveTokenMint: PublicKey.default,
  admin: PublicKey.default,
  rarityInfo: PublicKey.default,
  proveTokenAuthority: PublicKey.default,
  proveTokenVault: PublicKey.default,
  totalStakedAmount: new BN(0),
};

export const defaultFarmInfo: NFTFarmInfo = {
  farmId: PublicKey.default,
  farmTokenMint: PublicKey.default,
  rewardTokenMint: PublicKey.default,
  admin: PublicKey.default,
  proveTokenMint: PublicKey.default,
  rewardTokenPerSlot: new BN(0),
  rewardVault: PublicKey.default,
  farmAuthority: PublicKey.default,
  farmAuthorityBump: new BN(0),
  totalProveTokenDeposited: new BN(0),
};

export const defaultAllInfo: AllInfo = {
  rarityInfo: defaultRarityInfo,
  poolInfo: defaultPoolInfo,
  farmInfo: defaultFarmInfo,
};
