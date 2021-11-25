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
import os, { type } from "os";
import * as solend from "./solend";
import * as transaction from "./transaction"
import { NATIVE_MINT } from "@solana/spl-token";
import BigNumber from "bignumber.js";
import BN from "bn.js";
const keyPairPath = os.homedir() + "/.config/solana/id.json";
const _private_key = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const wallet = new Account(_private_key);
const wallet_public_key = wallet.publicKey;




async function main() {

  const connection = new Connection(
    "https://api.mainnet-beta.solana.com/"
  );
  let tx = new Transaction
  const lending_markets = await solend.get_all_lending_info(connection);
  const positionInfo = await solend.getObligation(connection,wallet_public_key);
  for (let markets of lending_markets){
   
    if(markets.reserve_info.liquidity.mint_pubkey.toString() == NATIVE_MINT.toString()){
      tx.add(await transaction.create_deposit_tx(markets,wallet_public_key,new BN(100000),connection));
      tx.add(await transaction.createWithdrawTx(wallet_public_key,markets.reserve_address,new BN(100000),positionInfo,markets,connection));

    }
  }
  var recent_blockhash = (await connection.getRecentBlockhash()).blockhash;
  tx.recentBlockhash = recent_blockhash;
  tx.feePayer = wallet_public_key;
  //console.log(tx.serializeMessage().toString("base64"));
  let result = await sendAndConfirmTransaction(connection,tx,[wallet])
  //console.log(result);
}

main()