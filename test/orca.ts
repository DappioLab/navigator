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
import * as orca from "../src/orca";

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
  let pools = await orca.getAllPools(connection);
  let farms = await orca.getAllFarms(connection)
  let farmers = await orca.getAllFarmers(connection,walletPublicKey)

  console.log(pools.length);
  console.log(farms.length);
  console.log(farmers.length);
}
main();
