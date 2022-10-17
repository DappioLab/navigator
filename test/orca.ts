import { Connection } from "@solana/web3.js";
import { orca, utils } from "../src";
import { FarmInfo, FarmInfoWrapper, PoolInfo, PoolInfoWrapper } from "../src/orca";

describe("Orca", () => {
  // const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  //   commitment,
  //   wsEndpoint: "wss://rpc-mainnet-fork.dappio.xyz/ws",
  // });
  // const connection = new Connection("https://solana-api.tt-prod.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https://ssc-dao.genesysgo.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https:////api.mainnet-beta.solana.com", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  //   wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  // });

  const connection = new Connection("https://ssc-dao.genesysgo.net", {
    commitment: "confirmed",
  });

  // it("fetches pool data", async () => {
  //   const pools = await orca.infos.getAllPools(connection);
  //   const poolId = pools[0].poolId;
  //   console.log(poolId.toString());

  //   const pool = await orca.infos.getPool(connection, poolId);
  //   console.log(pool);
  // });

  // it("fetches farm data", async () => {
  //   const farms = (await orca.infos.getAllFarms(connection)) as FarmInfo[];
  //   const farmId = farms[0].farmId;

  //   const farm = await orca.infos.getFarm(connection, farmId);
  // });

  // it("fetches pool wrapper", async () => {
  //   const pools = (await orca.infos.getAllPoolWrappers(connection)) as PoolInfoWrapper[];
  //   // pools.map((item) => console.log(item.getApr()));
  // });

  it("fetches farm wrapper", async () => {
    const pools = (await orca.infos.getAllPools(connection)) as PoolInfo[];
    const farms = (await orca.infos.getAllFarmWrappers(connection)) as FarmInfoWrapper[];
    const tokenList = await utils.getTokenList();
    console.log("# of farms:", farms.length);

    farms.forEach((farm) => {
      const apr = farm.getAprs(0, 0, 0);
      const doubleDipApr = farm.getAprs(0, 0, 0, true);

      if ((apr || doubleDipApr) && farm.farmInfo.poolId) {
        let pool = pools.find((item) => item.poolId.equals(farm.farmInfo.poolId!));
        let tokenA = tokenList.find((t) => t.mint === pool?.tokenAMint.toBase58());
        let tokenB = tokenList.find((t) => t.mint === pool?.tokenBMint.toBase58());
        console.log(tokenA?.symbol, "-", tokenB?.symbol, ":");
        console.log("pool id:", pool!.poolId.toBase58());
        console.log(`apr: ${apr}`);
        console.log(`apr (double dip): ${doubleDipApr}\n`);
      }
    });
  });
});
