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
import * as francium from "./Francium";
import * as raydium from "./Raydium";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import * as util from "./util";
import { initializeUser } from "./Francium/raydium/instructions";

const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
let privateKey = Uint8Array.from(PrivateKey);
const wallet = Keypair.fromSecretKey(privateKey);
const walletPublicKey = wallet.publicKey;

async function main() {
  //const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed",});
  const connection = new Connection("https://raydium.genesysgo.net",{ commitment: "processed",});
  //let allFarm = await raydium.getAllFarm(connection);
  //let allAMM = await raydium.getAllAmmPool(connection);
  let allRayFran = await francium.raydium.getAllFarm(connection);
  let user = await francium.raydium.getAllUserPosition(walletPublicKey,connection)
  console.log(user.length)
  for (let farm of allRayFran) {
    if (
      farm.infoPubkey.toString() ==
      "34eXEXypQiwyQhMRAMbCEJSs16SVaN3C6wzPicEcBTH1"
    ) {
      let deposit = await francium.raydium.getDepositTx(farm, walletPublicKey, new BN(75), new BN(0), new BN(1000), new BN(0), new BN(0), connection)
      for (let tx of deposit) {
        var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        tx.feePayer = walletPublicKey;

        let simulation = await connection.simulateTransaction(
          tx.compileMessage(),
          [wallet],
        );
        if (simulation.value.err) {
          console.log(simulation.value.logs);
          console.log(tx.serializeMessage().toString("base64"), "\n");
        } else {
          //console.log( simulation.value.err)
          let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
          console.log(result);
        }
      }
    }


    
  }
}

main();
