import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import {
  claimReward,
  createDepositTx,
  createWithdrawTx,
  getAllLendingInfo,
  getMiner,
} from "../src/larix";
import { NATIVE_MINT } from "@solana/spl-token-v2";
import BN from "bn.js";
import { lendingInfo } from "../src/larix/larix";
import { MinerInfo } from "../src/larix/mineInfo";

const keyPairPath = os.homedir() + "/.config/solana/dappio-1.json";
describe("Lend Unit Test", async () => {
  // let connection = new Connection("https://solana-api.projectserum.com", {
  //   wsEndpoint: "wss://solana-api.projectserum.com",
  //   commitment: "recent",
  // });
  let connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
    wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws",
    commitment: "processed",
  });
  let wallet = (() => {
    const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
    let u8Key = new Uint8Array(PrivateKey);
    return Keypair.fromSecretKey(u8Key);
  })();
  let allLarixLending: lendingInfo[];
  let allLarixMiner: MinerInfo[];
  beforeEach(async () => {
    allLarixLending = await getAllLendingInfo(connection);
    allLarixMiner = await getMiner(connection, wallet.publicKey);
  });
  it("Larix Deposit", async () => {
    let minerPub = undefined;
    if (allLarixMiner.length > 0) {
      minerPub = allLarixMiner[0].infoPub;
    }

    // Find the SOL lending market(Reserve) as testing target
    for (let lending of allLarixLending) {
      if (lending.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
        let tx = new Transaction();
        let deposit = await createDepositTx(
          lending,
          wallet.publicKey,
          new BN(150000000),
          connection,
          minerPub
        );
        tx.add(deposit);
        var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        tx.feePayer = wallet.publicKey;
        let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
        console.log("Supply 0.15 SOL successfully, tx:", result);
      }
    }
  });
  it("Larix Withdraw", async () => {
    // TODO --> check the new feature isLp in reserve
    let minerPub = undefined;
    if (allLarixMiner.length > 0) {
      minerPub = allLarixMiner[0].infoPub;
    }
    for (let lending of allLarixLending) {
      if (lending.supplyTokenMint.toString() == NATIVE_MINT.toString()) {
        let tx = new Transaction();
        let deposit = await createWithdrawTx(
          wallet.publicKey,
          new BN(100000000),
          lending,
          minerPub as PublicKey,
          connection
        );
        tx.add(deposit);
        var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        tx.feePayer = wallet.publicKey;
        let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
        console.log("Withdraw 0.1 SOL successfully, tx:", result);
      }
    }
  });
  it("Larix claimReward", async () => {
    // TODO: Difference between Ix#20 & Ix#26
    let tx = new Transaction();
    let claim = await claimReward(
      wallet.publicKey,
      allLarixMiner[0],
      connection
    );
    tx.add(claim);
    var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    tx.recentBlockhash = recentBlockhash;
    tx.feePayer = wallet.publicKey;
    //console.log(tx.serializeMessage().toString("base64"), "\n");
    //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
    //console.log(simulation.value.err);
    let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Claim Reward successfully, tx:", result);
  });
});
