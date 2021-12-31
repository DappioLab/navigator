import {
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
let privateKey = Uint8Array.from(PrivateKey);
const wallet = Keypair.fromSecretKey(privateKey)
const walletPublicKey = wallet.publicKey;




async function main() {

  const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed" });
  //const connection = new Connection("https://raydium.genesysgo.net");

  let allVault = await katana.getAllVault(connection)
  for (let vault of allVault ){
    if(vault.underlyingTokenMint.toString() == NATIVE_MINT.toString()){
      let tx = new Transaction
      let depositTx = await katana.deposit(vault,walletPublicKey,new BN(1000),connection)
      tx.add(depositTx);
      var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = walletPublicKey;
      let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
      console.log(simulation.value.err);
      
      let result = await sendAndConfirmTransaction(connection, tx, [wallet])
      console.log(result);
    }
  }
}
main()
