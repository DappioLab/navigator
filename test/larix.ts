import { PublicKey, Connection } from "@solana/web3.js";
import { larix } from "../src";
import { FarmInfoWrapper, ReserveInfo, ReserveInfoWrapper } from "../src/larix";

describe("Larix", () => {
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

  // const options = anchor.AnchorProvider.defaultOptions();
  // const wallet = NodeWallet.local();
  // const provider = new anchor.AnchorProvider(connection, wallet, options);

  // anchor.setProvider(provider);

  // const supplyAmount = 20000;

  it("fetches reserve", async () => {
    const reserves = (await larix.infos.getAllReserves(connection)) as ReserveInfo[];
    const poolId = reserves[reserves.length - 1].reserveId;
    console.log("PoolID", poolId.toString());

    const pool = (await larix.infos.getReserve(connection, poolId)) as ReserveInfo;
    console.log(pool);
    console.log(pool.lendingMarket.toBase58());
  });

  it("fetches reserve wrapper", async () => {
    const reserveWrappers = (await larix.infos.getAllReserveWrappers(connection)) as ReserveInfoWrapper[];
    const reserveInfo = reserveWrappers[0];
    console.log(reserveInfo.supplyApy());
  });

  it("fetches farm wrapper", async () => {
    const farms = (await larix.infos.getAllFarmWrappers(connection)) as FarmInfoWrapper[];
    console.log(farms[0].farmInfo);
  });
  it("test pagination", async () => {
    const page1 = await larix.infos.getAllReserves(connection, undefined, { pageIndex: 0, pageSize: 4 });
    const lastReserve = await larix.infos.getAllReserves(connection, undefined, { pageIndex: 3, pageSize: 4 });
    console.log(page1[page1.length - 1].reserveId.toString());
    console.log(lastReserve[lastReserve.length - 1].reserveId.toString());
  });
});
