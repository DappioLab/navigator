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
import { obligation } from "./obligation";
import { getSlndPrice } from "./util";
const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const wallet = new Account(PrivateKey);
const walletPublicKey = wallet.publicKey;




async function main() {

  const connection = new Connection(
    "https://rpc-mainnet-fork.dappio.xyz"
  );
  let tx = new Transaction
  const lendingMarkets = await solend.getAllLendingInfo(connection);
  const positionInfo = await solend.getObligation(connection, walletPublicKey) as obligation;
  for (let markets of lendingMarkets) {

    if (markets.reserveInfo.liquidity.mintPubkey.toString() == NATIVE_MINT.toString()) {

      tx.add(await transaction.createDepositTx(markets, walletPublicKey, new BN(100000), connection));
      tx.add(await transaction.createWithdrawTx(walletPublicKey, markets.reserveAddress, new BN(100000), positionInfo, markets, connection,false));

    }
    console.log(markets)
  }
  var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = walletPublicKey;
  console.log(tx.serializeMessage().toString("base64"));
  let result = await sendAndConfirmTransaction(connection,tx,[wallet])
  console.log(result);


}
main()