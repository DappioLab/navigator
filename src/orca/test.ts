import { Connection } from "@solana/web3.js";
import { getAllPools, getAllFarms, PoolInfo, FarmInfo } from "./infos";
import { getTokenList } from "../utils";

const connection = new Connection("https://ssc-dao.genesysgo.net", {
  commitment: "confirmed",
});

(async () => {
  let farms = await getAllFarms(connection);
  let pools = await getAllPools(connection);

  let parsedPools = pools.map((item) => {
    let parsedPool: any = item;
    let doubleDip: FarmInfo | undefined = undefined;
    let farm: FarmInfo | undefined = undefined;

    farm = farms.find((f) => f.baseTokenMint.equals(item.lpMint));
    if (farm) {
      doubleDip = farms.find((f) =>
        f.baseTokenMint.equals(farm!.farmTokenMint)
      );
    }
    parsedPool.farm = farm;
    parsedPool.doubleDip = doubleDip;
    return parsedPool;
  });

  let tokenList = await getTokenList();
  let parsedAPRPools: PoolInfo[] = parsedPools.map((item) => {
    let tokenA = tokenList.find((t) => t.mint === item.tokenAMint.toBase58())!;
    let tokenB = tokenList.find((t) => t.mint === item.tokenBMint.toBase58())!;

    if (item.farm) {
      let dailyEmission =
        (Number(item.farm.emissionsPerSecondNumerator) * 60 * 60 * 24) /
        Number(item.farm.emissionsPerSecondDenominator) /
        10 ** item.farm.rewardTokenMintAccountData.decimals;

      let rewardToken = tokenList?.find(
        (t) => t.mint === item?.farm.rewardTokenMintAccountData?.mint.toBase58()
      );

      if (rewardToken && dailyEmission !== 0) {
        let rewardValueUSD = dailyEmission * 365 * rewardToken!.price;

        let poolValueUSD =
          (Number(item.tokenSupplyA) / 10 ** tokenA.decimals) * tokenA?.price +
          (Number(item.tokenSupplyB) / 10 ** tokenB.decimals) * tokenB.price;
        let stakeRate =
          Number(item.farm.baseTokenVaultAccountData.amount) /
          10 ** Number(item.farm.baseTokenMintAccountData.decimals) /
          (Number(item.lpSupply) / 10 ** item.lpDecimals);

        let emissionAPR = (rewardValueUSD / poolValueUSD) * stakeRate * 100;
        item["emissionAPR"] = emissionAPR;
      }
    }
    if (item.farm && item.doubleDip) {
      let dailyEmission =
        (Number(item.doubleDip.emissionsPerSecondNumerator) * 60 * 60 * 24) /
        Number(item.doubleDip.emissionsPerSecondDenominator) /
        10 ** item.doubleDip.rewardTokenMintAccountData.decimals;

      let rewardToken = tokenList?.find(
        (t) =>
          t.mint === item?.doubleDip.rewardTokenMintAccountData?.mint.toBase58()
      );

      if (rewardToken && dailyEmission !== 0) {
        let rewardValueUSD = dailyEmission * 365 * rewardToken!.price;

        let poolValueUSD =
          (Number(item.tokenSupplyA) / 10 ** tokenA.decimals) * tokenA?.price +
          (Number(item.tokenSupplyB) / 10 ** tokenB.decimals) * tokenB.price;
        let stakeRate =
          Number(item.doubleDip.baseTokenVaultAccountData.amount) /
          10 ** Number(item.doubleDip.baseTokenMintAccountData.decimals) /
          (Number(item.lpSupply) / 10 ** item.lpDecimals);

        let doubleDipAPR = (rewardValueUSD / poolValueUSD) * stakeRate * 100;
        item["doubleDipAPR"] = doubleDipAPR;
      }
    }
    delete item["farm"];
    delete item["doubleDip"];
    return item;
  });

  // Final Result - parsed pool with
  // 1. Trading APR
  // 2. Emissions APR
  // 3. Double dip APR
  parsedAPRPools.map((item) => {
    if (item.doubleDipAPR !== null && item.emissionAPR !== null) {
      console.log(item, "//");
    }
  });
  console.log(parsedAPRPools);
})();
