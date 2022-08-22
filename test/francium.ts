import { PublicKey, Connection } from "@solana/web3.js";
import { francium } from "../src";

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

  it("parses farm data", async () => {
    const farmId = new PublicKey(
      "3EhxTvGjycQSKBY4EFz7MGA5Ke7rf39oUU2nM9qBP6Cj"
    );

    const farm = await francium.getFarm(connection, farmId);

    console.log(farm);
  });
});
