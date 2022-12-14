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
  const connection = new Connection("https://cache-rpc.dappio.xyz/", {
    wsEndpoint: "wss://api.mainnet-beta.solana.com",

    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
    httpHeaders: { referer: "https://app.dappio.xyz" },
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
    let withdrawer = new Map(
      ((await friktion.infos.getAllWithdrawers!(connection, wallet)) as friktion.withdrawerInfo[]).map((w) => [
        w.withdrawerId.toString(),
        w,
      ])
    );
    let userDeposits = new Map(
      ((await friktion.infos.getAllDepositors(connection, wallet)) as friktion.DepositorInfo[]).map((w) => [
        w.depositorId.toString(),
        w,
      ])
    );
    console.log("vault");
    let vaults = (await friktion.infos.getAllVaults(connection)) as friktion.VaultInfo[];
    for (let v of vaults) {
      let wrrp = new friktion.VaultInfoWrapper(v);
      let withdrawerInfo = withdrawer.get(friktion.infos.getWithdrawerId!(v.vaultId, wallet).toString());
      let DepositorInfo = userDeposits.get(friktion.infos.getDepositorId!(v.vaultId, wallet).toString());
      let option = v.snapshotInfo?.lastTradedOption;
      if (option != "N/A" && option) {
        console.log(v.vaultId.toString());
        console.log(await wrrp.getLastTradedOptipon(connection));
      }
      if (withdrawerInfo) {
        let price = await wrrp.getSharePrice(connection, withdrawerInfo.roundNumber.toNumber(), false, true);
        let amount = withdrawerInfo.amount.toNumber() * price;
        console.log(
          "withdraw",
          withdrawerInfo.withdrawerId.toString(),
          v.vaultId.toString(),
          amount,
          withdrawerInfo.amount.toNumber(),
          price,
          withdrawerInfo.roundNumber.toNumber(),
          v.roundNumber.toNumber()
        );
      }
      if (DepositorInfo) {
        let price = await wrrp.getSharePrice(connection, DepositorInfo.roundNumber.toNumber(), true, false);
        let amount = DepositorInfo.amount.toNumber() / price;
        console.log(
          "deposit",
          DepositorInfo.depositorId.toString(),
          v.vaultId.toString(),
          amount,
          DepositorInfo.amount.toNumber()
        );
      }
    }
    let vaultMap = new Map(vaults.map((v) => [v.vaultId.toString(), new friktion.VaultInfoWrapper(v)]));
  });
});
