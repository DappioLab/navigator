import {
  Account,
  Connection,
  Keypair,
  Ed25519Keypair,
  Ed25519Program,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import * as solend from "./Solend";
import * as saber from "./Saber";
import * as larix from "./Larix";
import * as katana from "./Katana";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import * as util from "./util"


const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const wallet = new Account(PrivateKey);
const walletPublicKey = wallet.publicKey;




async function main() {

  //const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed" });
  const connection = new Connection("https://raydium.genesysgo.net");

  let allVault = await katana.getAllVault(connection)
  for (let vault of allVault ){
    
    let user = await katana.getUserVaultAddress(walletPublicKey,vault.infoPubkey)
    console.log(user[0].toString(),vault.infoPubkey.toString(),"\n")
    
  }
  let allUserVault = await katana.getAllUserVault(connection,walletPublicKey)
  for (let userVault of allUserVault ){
    
    console.log(userVault.infoPubkey.toString())
    
  }
}
main()
