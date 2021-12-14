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
  import * as util from "./util"
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
    for (let info of swap) {
      if (info.mintB.toString()== NATIVE_MINT.toString()) {
        
        let tx = new Transaction
        await info.updateAmount(connection);
        
        let deposit = await saber.createDepositTx(info,new BN(0),new BN(1000000),new BN(0),walletPublicKey,connection);
        tx.add(deposit);

        /*let amount = new BN(0)
        
        let withdrawAccount = await util.findAssociatedTokenAddress(walletPublicKey,info.poolMint);
        if ( !(await util.checkTokenAccount(withdrawAccount,connection))){
          continue;
        }
        amount =new BN( await util.getTokenAccountAmount(connection,withdrawAccount))
        if (amount.eq(new BN(0))){
          continue;
        }
        let withdraw = await saber.createWithdrawTx(info, "B", amount, new BN(0), walletPublicKey, connection);
        tx.add(withdraw);*/
  
  
        var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        tx.feePayer = walletPublicKey;
        console.log(tx.serializeMessage().toString("base64"), "\n");
        //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
        //console.log(simulation.value.err);
  
        let result = await sendAndConfirmTransaction(connection, tx, [wallet])
        console.log(result);
  
  
  
  
      } 
      
      
    }
  
  }
  main()
