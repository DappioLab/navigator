import {
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  Keypair,
  MemcmpFilter,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import * as francium from "../src/francium";

import BN from "bn.js";
import { NATIVE_MINT } from "@solana/spl-token-v2";

const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
let privateKey = Uint8Array.from(PrivateKey);
const wallet = Keypair.fromSecretKey(privateKey);
const walletPublicKey = wallet.publicKey;
async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", {
    commitment: "processed",
  });
  let reserves = await francium.getAllReserveWrappers(connection);
  reserves.forEach((reserve) => {
    console.log(
      reserve.reserveInfo.rewardInfo?.tokenProgramId.toString()
    );
  });

  console.log(reserves.length);
}
main();
