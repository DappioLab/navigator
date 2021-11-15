import {
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import fs from "fs";
import os, { type } from "os";
import * as solend from "./solend";
const keyPairPath = os.homedir() + "/.config/solana/id.json";
const _private_key = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));

const payer_keypair = new Keypair(_private_key);




async function main() {

  const connection = new Connection(
    "https://solana-api.projectserum.com"
  );
  const lending_markets = await solend.get_all_lending_info(connection);
  await console.log(lending_markets);
  //const account = await getReservedata(USDC_RESERVE, connection);
  //console.log(account.liquidity.market_price.toLocaleString());
}

main()