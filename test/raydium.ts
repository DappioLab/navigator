import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PoolDirection, raydium } from "../src";
import { PoolInfo, PoolInfoWrapper } from "../src/raydium";

describe("Raydium", () => {
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
  const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
    wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  });

  const userKey = new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4");

  it("fetches pool data", async () => {
    const pools = await raydium.infos.getAllPools(connection, { pageSize: 10, pageIndex: 0 });
    console.log(pools[pools.length - 1].poolId.toString());
    const pools2 = await raydium.infos.getAllPools(connection, { pageSize: 10, pageIndex: 9 });
    console.log(pools2[0].poolId.toString());
    const poolId = pools[20].poolId;

    const pool0 = pools[20];
    console.log(poolId.toString());
    console.log(pool0);

    const wrapper = new PoolInfoWrapper(pool0 as PoolInfo);
    const amountOut = await wrapper.getSwapOutAmount(PoolDirection.Reverse, new BN(100000000));
    console.log(Number(amountOut));

    const pool1 = await raydium.infos.getPool(connection, poolId);
    console.log(pool1);
  });

  it("fetches farm data", async () => {
    const farms = await raydium.infos.getAllFarms(connection);
    const farmId = farms[20].farmId;
    console.log(farmId.toString());
    const farm0 = farms[20];
    console.log(farm0);

    const farm1 = await raydium.infos.getFarm(connection, farmId);
    console.log(farm1);
  });

  it("fetches farmer data", async () => {
    const farmers = await raydium.infos.getAllFarmers(connection, userKey);
    console.log(farmers);
    console.log("total # of farmers:", farmers.length);
    const farmerId = farmers[0].farmerId;
    console.log(farmerId.toString());

    const farmer1 = await raydium.infos.getFarmer(connection, farmerId);
    console.log(farmer1);
  });
});
