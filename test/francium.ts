import { PublicKey, Connection } from "@solana/web3.js";
import { francium } from "../src";
import { ReserveInfo, ReserveInfoWrapper } from "../src/francium";

describe("Francium", () => {
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
    const reserves = (await francium.infos.getAllReserves(connection)) as ReserveInfo[];
    const poolId = reserves[0].reserveId;
    console.log(poolId.toString());

    const pool = (await francium.infos.getReserve(connection, poolId)) as ReserveInfo;
    console.log(pool);
  });

  it("fetches reserve wrapper", async () => {
    const reserveWrappers = (await francium.infos.getAllReserveWrappers(connection)) as ReserveInfoWrapper[];
    const reserveInfo = reserveWrappers[0];
    console.log(reserveInfo.supplyApy());
  });

  it("fetches farm data", async () => {
    const farmId = new PublicKey("3EhxTvGjycQSKBY4EFz7MGA5Ke7rf39oUU2nM9qBP6Cj");
    const farm = await francium.infos.getFarm(connection, farmId);
    console.log(farm);
  });
});
