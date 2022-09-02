import { Connection } from "@solana/web3.js";
import { raydium } from "../src";

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

  it("fetches pool data", async () => {
    const pools = await raydium.infos.getAllPools(connection);
    const poolId = pools[0].poolId;
    console.log(poolId.toString());

    const pool = await raydium.infos.getPool(connection, poolId);
    console.log(pool);
  });

  it("fetches farm data", async () => {
    const farms = await raydium.infos.getAllFarms(connection);
    const farmId = farms[0].farmId;
    console.log(farmId.toString());

    const farm = await raydium.infos.getFarm(connection, farmId);
    console.log(farm);
  });
});
