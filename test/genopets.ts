import { Connection, PublicKey } from "@solana/web3.js";
import { genopets } from "../src";

describe("Genopets", () => {
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

  const userKey = new PublicKey("D6fo1sf7natK7fdtdGMHZPV4b7HXrNBVdndV5qtHzNsw");

  it("Fetch all farms", async () => {
    const farms = await genopets.infos.getAllFarms(connection);
    const farm0 = farms[0];
    const farm = (await genopets.infos.getFarm(connection, farm0.farmId)) as genopets.FarmInfo;
    console.log("farm:", farm);
    console.log("farm authority:", farm.authority.toBase58());
    console.log("farm geneMint:", farm.geneMint.toBase58());
    console.log("farm mintSgene:", farm.mintSgene.toBase58());

    const farmerWrapper = new genopets.FarmInfoWrapper(farm);
    const userDeposit = farmerWrapper.calcUserDeposit(userKey);
    console.log("userDeposit:", userDeposit.toBase58());
  });

  it("Fetch all farmers", async () => {
    const farmer = await genopets.infos.getAllFarmers(connection, userKey);
    console.log("farmer:", farmer);
  });
});
