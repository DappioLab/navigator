import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { friktion } from "../src";
import fs from "fs";
import os from "os";
import * as katana from "../src/katana";
import BN from "bn.js";
import { NATIVE_MINT } from "@solana/spl-token-v2";

describe("Friktion", () => {
  // const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  //   commitment,
  //   wsEndpoint: "wss://rpc-mainnet-fork.dappio.xyz/ws",
  // });
  const connection = new Connection("https://solana-api.projectserum.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });
  // const connection = new Connection("https://ssc-dao.genesysgo.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https://api.mainnet-beta.solana.com", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  //   wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  // });

  // const options = anchor.AnchorProvider.defaultOptions();

  // const provider = new anchor.AnchorProvider(connection, wallet, options);

  // anchor.setProvider(provider);

  it("test", async () => {
    let wallet = new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4");
    let vaults = await friktion.infos.getAllVaults(connection);
    let userDeposits = await friktion.infos.getAllDepositors(connection, wallet);
    console.table(vaults,["roundNumber","roundInfos"]);
    console.table(userDeposits, ["depositorId"]);
    let withdrawer = friktion.infos.getAllWithdrawers
      ? await friktion.infos.getAllWithdrawers(connection, wallet)
      : undefined;
    console.table(withdrawer, ["depositorId"]);
  });
});
