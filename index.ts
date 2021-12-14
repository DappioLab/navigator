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
  import { NATIVE_MINT } from "@solana/spl-token";
  import BN from "bn.js";
  
 
  const keyPairPath = os.homedir() + "/.config/solana/id.json";
  const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
  const wallet = new Account(PrivateKey);
  const walletPublicKey = wallet.publicKey;
  
  
  
  
  async function main() {
  
    const connection = new Connection(
      "https://rpc-mainnet-fork.dappio.xyz",{wsEndpoint :"https://rpc-mainnet-fork.dappio.xyz/ws"}
    );
    let tx = new Transaction
    let swap = await saber.getAllSwap(connection);
    console.log(swap);
  
  
  }
  main()
