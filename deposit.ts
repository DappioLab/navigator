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
import * as util from "./util";
import { getAllLedgers } from "./Raydium";
import { parseFarmV1, parseFarmV45 } from "./Raydium/farmInfo";
import {
  FarmPoolKeys,
  FarmUserKeys,
  makeDepositInstructionV3,
  makeDepositInstructionV5,
} from "./Raydium/farmInstruction";
import {
  FARM_LEDGER_LAYOUT_V3_1,
  FARM_LEDGER_LAYOUT_V5_1,
  STAKE_PROGRAM_ID,
  STAKE_PROGRAM_ID_V5,
} from "./Raydium/info";
import {
  getAssociatedLedgerAccount,
  getLegerInfos,
} from "./Raydium/ledgerInfo";
const keyPairPath = os.homedir() + "/.config/solana/dappio-1.json";

const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
let u8Key = new Uint8Array(PrivateKey);
const wallet = Keypair.fromSecretKey(u8Key);
// const wallet = new Account(PrivateKey);
const walletPublicKey = wallet.publicKey;
console.log("The public key of wallet: ", walletPublicKey.toBase58());
const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws",
  commitment: "processed",
});

async function main() {
  //const connection = new Connection("https://raydium.genesysgo.net");
  let tx = new Transaction();
  let swap = await saber.getAllSwap(connection);
  console.log(swap);
  for (let info of swap) {
    if (info.mintB.toString() == NATIVE_MINT.toString()) {
      let tx = new Transaction();
      await info.updateAmount(connection);
      let deposit = await saber.createDepositTx(
        info,
        new BN(0),
        new BN(10),
        new BN(0),
        walletPublicKey,
        connection
      );
      tx.add(deposit);
      var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = walletPublicKey;
      //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
      //console.log(simulation.value.err);
      let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log(result);
      let amount = new BN(0);
      let LPAccount = await util.findAssociatedTokenAddress(
        walletPublicKey,
        info.poolMint
      );
      if (!(await util.checkTokenAccount(LPAccount, connection))) {
        continue;
      }
      amount = new BN(await util.getTokenAccountAmount(connection, LPAccount));
      if (amount.eq(new BN(0))) {
        continue;
      }
      if (info.isFarming) {
        let farm = info.farmingInfo as saber.FarmInfo;
        let depositLeftToFarm = await saber.depositToFarm(
          farm,
          walletPublicKey,
          amount,
          connection
        );
        let newTx = new Transaction();
        newTx.add(depositLeftToFarm);
        let newresult = await sendAndConfirmTransaction(connection, newTx, [
          wallet,
        ]);
        console.log(newresult);
      }
    }
  }
  await depositRaydiumFarmWithVersion(
    // RAY vs RAY --> RAY
    "100",
    3,
    "4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW"
  );
  await depositRaydiumFarmWithVersion(
    // RAY vs SOL (LP) --> RAY
    "100",
    3,
    "HUDr9BDaAGqi37xbQHzxCyXvfMCKPTPNF8g9c9bPu1Fu"
  );
}

// Test stake Raydium - Raydium staking pool
async function depositRaydiumFarmV3() {
  let ledgers = await getAllLedgers(connection, wallet.publicKey);
  console.log(ledgers);
  let tx = new Transaction();
  for (let ledger of ledgers) {
    let walletATA = await util.findAssociatedTokenAddress(
      wallet.publicKey,
      new PublicKey(ledger.mints.stakedTokenMint)
    );
    console.log(walletATA.toBase58());
    let userKeys: FarmUserKeys = {
      ledger: ledger.pubkey,
      owner: new PublicKey(ledger.owner),
      lpTokenAccount: new PublicKey(walletATA),
      rewardTokenAccounts: [walletATA],
    };
    let farm = await connection.getAccountInfo(
      new PublicKey(ledger.farmId),
      "confirmed"
    );
    let farmInfo = await parseFarmV1(farm?.data, new PublicKey(ledger.farmId));
    let poolKeys: FarmPoolKeys = {
      id: new PublicKey(ledger.farmId),
      lpMint: new PublicKey(ledger.mints.stakedTokenMint),
      rewardMints: [new PublicKey(ledger.mints.rewardAMint)],
      version: 3,
      programId: STAKE_PROGRAM_ID,
      authority: (await farmInfo.authority())[0],
      lpVault: farmInfo.poolLpTokenAccountPubkey,
      rewardVaults: [farmInfo.poolRewardTokenAccountPubkey],
    };
    let ix = await makeDepositInstructionV3({
      poolKeys,
      userKeys,
      amount: new BN(100),
    });
    tx.add(ix);
  }
  let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log(result);
}

async function depositRaydiumFarmWithVersion(
  amount: BN | string | number,
  version: 3 | 5,
  farmId: string
) {
  let tx = new Transaction();
  let ledgerPubkey = await getAssociatedLedgerAccount({
    programId: version === 3 ? STAKE_PROGRAM_ID : STAKE_PROGRAM_ID_V5,
    poolId: new PublicKey(farmId),
    owner: wallet.publicKey,
  });
  let ledgerAccInfo = await connection.getAccountInfo(
    ledgerPubkey,
    "confirmed"
  );

  let ledger =
    ledgerAccInfo &&
    (
      await getLegerInfos(
        connection,
        [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
        version === 3 ? FARM_LEDGER_LAYOUT_V3_1 : FARM_LEDGER_LAYOUT_V5_1,
        version
      )
    )[0];
  console.log("Staked amount before deposted: ", ledger?.deposited);
  if (ledger) {
    let stakedWalletATA = await util.findAssociatedTokenAddress(
      wallet.publicKey,
      new PublicKey(ledger.mints.stakedTokenMint)
    );
    let rewardWalletATA = await util.findAssociatedTokenAddress(
      wallet.publicKey,
      new PublicKey(ledger.mints.rewardAMint)
    );
    let rewardBWalletATA =
      ledger.mints.rewardBMint &&
      (await util.findAssociatedTokenAddress(
        wallet.publicKey,
        new PublicKey(ledger.mints.rewardBMint)
      ));
    console.log("Staked token ATA", stakedWalletATA.toBase58());
    let userKeys: FarmUserKeys = {
      ledger: ledger.pubkey,
      owner: new PublicKey(ledger.owner),
      lpTokenAccount: new PublicKey(stakedWalletATA),
      rewardTokenAccounts: !rewardBWalletATA
        ? [rewardWalletATA]
        : [rewardWalletATA, rewardBWalletATA],
    };
    let farm = await connection.getAccountInfo(
      new PublicKey(ledger.farmId),
      "confirmed"
    );
    let farmInfo =
      version === 3
        ? await parseFarmV1(farm?.data, new PublicKey(ledger.farmId))
        : await parseFarmV45(farm?.data, new PublicKey(ledger.farmId), 5);
    let poolKeys: FarmPoolKeys = {
      id: new PublicKey(ledger.farmId),
      lpMint: new PublicKey(ledger.mints.stakedTokenMint),
      rewardMints: !ledger.mints.rewardBMint
        ? [new PublicKey(ledger.mints.rewardAMint)]
        : [
            new PublicKey(ledger.mints.rewardAMint),
            new PublicKey(ledger.mints.rewardBMint),
          ],
      version: version,
      programId: version === 3 ? STAKE_PROGRAM_ID : STAKE_PROGRAM_ID_V5,
      authority: (await farmInfo.authority())[0],
      lpVault: farmInfo.poolLpTokenAccountPubkey,
      rewardVaults: [farmInfo.poolRewardTokenAccountPubkey],
    };
    let ix =
      version === 3
        ? await makeDepositInstructionV3({
            poolKeys,
            userKeys,
            amount: new BN(amount),
          })
        : await makeDepositInstructionV5({
            poolKeys,
            userKeys,
            amount: new BN(amount),
          });
    tx.add(ix);
  }
  let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log("Transaction hash", result);
  ledgerAccInfo = await connection.getAccountInfo(ledgerPubkey, "confirmed");

  ledger =
    ledgerAccInfo &&
    (
      await getLegerInfos(
        connection,
        [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
        version === 3 ? FARM_LEDGER_LAYOUT_V3_1 : FARM_LEDGER_LAYOUT_V5_1,
        version
      )
    )[0];
  console.log("Staked amount After deposted: ", ledger?.deposited);
}

main();
