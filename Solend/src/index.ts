import {
  Account,
  Connection,
  Keypair,
  Ed25519Keypair,
  Ed25519Program,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "fs";
import os, { type } from "os";
import * as solend from "./solend";
import * as obligation from "./obligation"
import * as transaction from "./transaction"
import { NATIVE_MINT } from "@solana/spl-token";
const keyPairPath = os.homedir() + "/.config/solana/id.json";
const _private_key = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const wallet = new Account(_private_key);
const wallet_public_key = wallet.publicKey;




async function main() {

  const connection = new Connection(
    "https://solana-api.projectserum.com"
  );
  let tx = new Transaction
  const lending_markets = await solend.get_all_lending_info(connection);
  for (let markets of lending_markets){
    console.log(markets.supply_token_mint.toString(),NATIVE_MINT.toString());
    if(markets.reserve_info.liquidity.mint_pubkey.toString() == NATIVE_MINT.toString()){
      tx.add(await transaction.create_deposit_tx(markets,wallet_public_key,connection,1));

    }
  }
  var recent_blockhash = (await connection.getRecentBlockhash()).blockhash;
  tx.recentBlockhash = recent_blockhash;
  tx.feePayer = wallet_public_key;
  console.log(tx.serializeMessage().toString("base64"));
  let result = await sendAndConfirmTransaction(connection,tx,[wallet])
  console.log(result);
}

main()