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

  //const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed" });
  const connection = new Connection("https://raydium.genesysgo.net");

  let allVault = await katana.getAllVault(connection)
  for (let vault of allVault ){
    if(vault.underlyingTokenMint.toString() == NATIVE_MINT.toString()){
      let tx = new Transaction
      let depositTx = await katana.deposit(vault,walletPublicKey, new BN(1),connection)
      tx.add(depositTx);
      let withdrawTx = await katana.instantWithdraw(vault,walletPublicKey,new BN(1))
      tx.add(withdrawTx)
      let initiateWithdraw = await katana.initiateWithdraw(vault,walletPublicKey,new BN(0))
      tx.add(initiateWithdraw);
      let completeWithdraw = await katana.completeWithdraw(vault,walletPublicKey)
      //tx.add(completeWithdraw)
      let claimshare = await katana.claimShares(vault,walletPublicKey);
      //tx.add(claimshare);
      var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = walletPublicKey;
      let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
      console.log(tx.serializeMessage().toString("base64"), "\n");
      console.log("simulation",simulation.value.err,"error");
      
      //let result = await sendAndConfirmTransaction(connection, tx, [wallet])
      //console.log("txid:\t",result);
    }
    let ppspAccount = await katana.getPricePerPageAccount(vault,connection)
    console.log(ppspAccount.prices[2].toString())
  }
  let allUserVault = await katana.getAllUserVault(connection,walletPublicKey);
  for(let user of allUserVault ){
    //console.log(user)
  }
}


main()
