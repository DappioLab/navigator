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
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import * as util from "./util"

const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const wallet = new Account(PrivateKey);
const walletPublicKey = wallet.publicKey;




async function main() {

  const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed" });
  //const connection = new Connection("https://raydium.genesysgo.net");

  let alllending = await larix.getAllLendingInfo(connection)
  let allMiner = await larix.getMiner(connection,walletPublicKey);
  //console.log(allMiner[0])
  let minerPub  = undefined
  if (allMiner.length > 0){
    minerPub = allMiner[0].infoPub;
  }
  for (let lending of alllending) {
    if (lending.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
      let tx = new Transaction;
      let deposit = await larix.createDepositTx(lending,walletPublicKey,new BN(1000000),connection,minerPub)
      tx.add(deposit)
      var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = walletPublicKey;
      //console.log(tx.serializeMessage().toString("base64"), "\n");
      //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
      //console.log(simulation.value.err);
      let result = await sendAndConfirmTransaction(connection, tx, [wallet])

      console.log(result);
    }
  }
  for (let lending of alllending) {
    if (lending.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
      let tx = new Transaction;
      let deposit = await larix.createWithdrawTx(walletPublicKey,new BN(1),lending,minerPub as PublicKey,connection);
      tx.add(deposit)
      var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = walletPublicKey;
      //console.log(tx.serializeMessage().toString("base64"), "\n");
      //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
      //console.log(simulation.value.err);
      let result = await sendAndConfirmTransaction(connection, tx, [wallet])
      console.log(result);
    }
  }
  let tx = new Transaction;
      let claim = await larix.claimReward(walletPublicKey,allMiner[0],connection)
      tx.add(claim)
      var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = walletPublicKey;
      //console.log(tx.serializeMessage().toString("base64"), "\n");
      //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
      //console.log(simulation.value.err);
      let result = await sendAndConfirmTransaction(connection, tx, [wallet])
      console.log(result);



}
main()
