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
  import * as solend from "../solend";
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
    const lendingMarkets = await solend.getAllLendingInfo(connection);
    const positionInfo = await solend.getObligation(connection, walletPublicKey) as solend.Obligation ;
    for (let markets of lendingMarkets) {
  
      if (markets.reserveInfo.liquidity.mintPubkey.toString() == NATIVE_MINT.toString()) {
  
        tx.add(await solend.createDepositTx(markets, walletPublicKey, new BN(10000000), connection));
        tx.add(await solend.createWithdrawTx(walletPublicKey, markets.reserveAddress, new BN(1), positionInfo, markets, connection,false));
  
      }
    }
    var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    tx.recentBlockhash = recentBlockhash;
    tx.feePayer = walletPublicKey;
    console.log(tx.serializeMessage().toString("base64"),"\n");
    let result = await sendAndConfirmTransaction(connection,tx,[wallet])
    console.log(result);
  
  
  }
  main()