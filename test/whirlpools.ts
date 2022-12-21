import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { whirlpools } from "../src";
import fs from "fs";
import os from "os";

import BN from "bn.js";
import { NATIVE_MINT } from "@solana/spl-token-v2";

describe("Whirlpools", () => {
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
    //console.log(whirlpools.WHIRLPOOL_LAYOUT);
    let wallet = new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4");
    let pools = (await whirlpools.infos.getAllPools(connection)) as whirlpools.PoolInfo[];
    console.log(pools.length);
    let positions = (await whirlpools.infos.getAllPositions(connection, wallet)) as whirlpools.PositionInfo[];

    positions.forEach((p) => console.log(p.positionId.toString(), p.liquidity.toString()));
  });
});
