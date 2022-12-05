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
  const connection = new Connection("https://rpc.ankr.com/solana", {
    wsEndpoint: "wss://solana-mainnet.g.alchemy.com/v2/LhVpGFciWuulV_aAmsr6HbBlddZVM2TX",
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
    //console.log(friktion.ENTROPY_METADATA_LAYOUT.decode(Buffer.alloc(1000)));
    let wallet = new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4");
    let vaults = (await friktion.infos.getAllVaults(connection)) as friktion.VaultInfo[];
    vaults.forEach((v) => {
      let wrapp = new friktion.VaultInfoWrapper(v);
      if (v.roundInfos.length > 1) {
        console.log("https://explorer.solana.com/address/" + wrapp.getEpochInfoAddress(new BN(1)));
        console.log(v.epochInfos.length, v.roundInfos.length,v.roundNumber.toString());
        console.log(wrapp.getAPR());
      }
    });
    let userDeposits = await friktion.infos.getAllDepositors(connection, wallet);

    let withdrawer = await friktion.infos.getAllWithdrawers!(connection, wallet);
    let addre = new friktion.VaultInfoWrapper(vaults[3]).getRoundInfoAddress(new BN(4));
  });
});
