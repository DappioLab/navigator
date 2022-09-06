import { Connection, PublicKey } from "@solana/web3.js";
import { lifinity } from "../src";
import { getTokenList } from "../src/utils";

describe("Lifinity", () => {
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
  const connection = new Connection("https:////api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });
  // const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  //   wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  // });

  it("Can fetch all pools", async () => {
    const pools = await lifinity.infos.getAllPools(connection);
    const tokenList = await getTokenList();
    console.log(`Fetched ${pools.length} pools`);
    console.log(`First poolId: ${pools[0].poolId.toBase58()}`);
    const allPoolSymbols = pools.map((p) => {
      const symbolA = tokenList.find(
        (t) => t.mint === p.tokenAMint.toBase58()
      )?.symbol;
      const symbolB = tokenList.find(
        (t) => t.mint === p.tokenBMint.toBase58()
      )?.symbol;
      return `${symbolA}-${symbolB}`;
    });
    console.log(`All pool symbols: ${JSON.stringify(allPoolSymbols)}`);
  });
  it("Can fetch pool", async () => {
    const poolId = new PublicKey("amgK1WE8Cvae4mVdj4AhXSsknWsjaGgo1coYicasBnM");
    const pool = await lifinity.infos.getPool(connection, poolId);
    console.log(
      `Fetched pool: ${JSON.stringify({
        id: pool.poolId.toBase58(),
        mint: pool.lpMint.toBase58(),
        coin: pool.tokenAMint.toBase58(),
        pc: pool.tokenBMint.toBase58(),
      })}`
    );
  });
});
