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
    const connection = new Connection("https://raydium.genesysgo.net", { commitment: "processed" });

    let allVault = await katana.putSell.getAllVault(connection)
    for (let vault of allVault ){
      if(vault.underlyingTokenMint.toString() == "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"){
        let tx = new Transaction
        let depositTx = await katana.putSell.deposit(vault,walletPublicKey, new BN(1),connection)
        tx.add(depositTx);
        let withdrawTx = await katana.putSell.instantWithdraw(vault,walletPublicKey,new BN(1))
        tx.add(withdrawTx)
        let initiateWithdraw = await katana.putSell.initiateWithdraw(vault,walletPublicKey,new BN(0))
        tx.add(initiateWithdraw);
        let completeWithdraw = await katana.putSell.completeWithdraw(vault,walletPublicKey)
        //tx.add(completeWithdraw)
        let claimshare = await katana.putSell.claimShares(vault,walletPublicKey);
        //tx.add(claimshare);
        var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        tx.feePayer = walletPublicKey;
        let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
        console.log(tx.serializeMessage().toString("base64"));
        console.log("simulation",simulation.value.err,"error\n");
        recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        //let result = await sendAndConfirmTransaction(connection, tx, [wallet])
        //console.log("txid:\t",result);
      }
    }
    let allUserVault = await katana.putSell.getAllUserVault(connection,walletPublicKey);
    for(let user of allUserVault ){
      //console.log(user)
    }
  }
  
  
  main()
  