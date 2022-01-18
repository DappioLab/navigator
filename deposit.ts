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
import * as saber from "./Saber";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import * as util from "./util"
const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const wallet = new Account(PrivateKey);
const walletPublicKey = wallet.publicKey;




async function main() {

  const connection = new Connection(  "https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed"});
  //const connection = new Connection("https://raydium.genesysgo.net");
  let tx = new Transaction
  let swap = await saber.getAllSwap(connection);
  //console.log(swap);
  for (let info of swap) {
    if (info.mintB.toString() == NATIVE_MINT.toString()) {
      let tx = new Transaction
      await info.updateAmount(connection);
      let deposit = await saber.createDepositTx(info, new BN(0), new BN(10), new BN(0), walletPublicKey, connection);
      tx.add(deposit);



      var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = walletPublicKey;
      //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
      //console.log(simulation.value.err);

      let result = await sendAndConfirmTransaction(connection, tx, [wallet])
      console.log(result)


      let amount = new BN(0)

      let LPAccount = await util.findAssociatedTokenAddress(walletPublicKey,info.poolMint);
      if ( !(await util.checkTokenAccount(LPAccount,connection))){
        continue;
      }
      amount =new BN( await util.getTokenAccountAmount(connection,LPAccount))
      if (amount.eq(new BN(0))){
        continue;
      }
      if (info.isFarming){
        let farm = info.farmingInfo as saber.FarmInfo;
        let depositLeftToFarm = await saber.depositToFarm(farm,walletPublicKey,amount,connection);
        let newTx = new Transaction;
        newTx.add(depositLeftToFarm);
        let newresult = await sendAndConfirmTransaction(connection, newTx, [wallet])
        console.log(newresult)
      }




    }


  }

}
main()
