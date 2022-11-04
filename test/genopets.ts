import { Connection, PublicKey } from "@solana/web3.js";
import { genopets } from "../src";

describe("Genopets", () => {
  // const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  //   commitment: "confirmed",
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

  const userKey = new PublicKey("3bnAKgVhM1MihYpJQ6hK83BirWhVFbyhkvvCQqJ8tZ25");

  it("Fetch all farms", async () => {
    const farms = await genopets.infos.getAllFarms(connection);
    const farm0 = farms[0];
    const farm = (await genopets.infos.getFarm(connection, farm0.farmId)) as genopets.FarmInfo;
    console.log("farm:", farm);
    console.log("farm pool token:", farm.poolToken.toBase58());
    console.log("farm master authority:", farm.master.authority.toBase58());
    console.log("farm master geneMint:", farm.master.geneMint.toBase58());
    console.log("farm master mintSgene:", farm.master.mintSgene.toBase58());

    const farmerWrapper = new genopets.FarmInfoWrapper(farm);
    const userDeposit = genopets.getFarmerInstanceKey(userKey, 0);
    console.log("userDeposit:", userDeposit.toBase58());
  });

  it("Fetch all farmers", async () => {
    const farmer = (await genopets.infos.getAllFarmers(connection, userKey)) as genopets.FarmerInfo[];
    console.log("farmer:", farmer);
    console.log("farmer:", farmer[0].farmerId.toBase58());
    farmer[0].instance.forEach((farmer, index) => {
      if (farmer?.user.equals(userKey))
        console.log(
          `# ${index}:`,
          farmer?.id.toBase58(),
          ", is_yield:",
          farmer.isYield,
          ", timestamp:",
          Number(farmer.lockUntil)
        );
    });
  });
});
