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
import * as util from "./util";
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
import { parseFarmV1, parseFarmV45 } from "./Raydium/farmInfo";
import {
  FarmPoolKeys,
  FarmUserKeys,
  makeWithdrawInstruction,
} from "./Raydium/farmInstruction";
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

  let allMiner = await saber.getAllMiner(connection, walletPublicKey);
  for (let miner of allMiner) {
    for (let info of swap) {
      if (info.farmingInfo?.infoPubkey.toString() == miner.farmKey.toString()) {
        let tx = new Transaction();
        let amount = new BN(0);

        let withdrawAccount = await util.findAssociatedTokenAddress(
          walletPublicKey,
          info.poolMint
        );
        if (await util.checkTokenAccount(withdrawAccount, connection)) {
          amount = new BN(
            await util.getTokenAccountAmount(connection, withdrawAccount)
          );
        }
        if (amount.add(miner.balance).eq(new BN(0))) {
          continue;
        }
        let withdrawIns = await saber.createWithdrawTx(
          info,
          "B",
          miner.balance,
          amount,
          new BN(0),
          walletPublicKey,
          connection
        );
        tx.add(withdrawIns);
        var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        tx.feePayer = walletPublicKey;
        //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
        //console.log(simulation.value.err);
        let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
      }
    }
  }

  await withdrawRaydiumFarmWithVersion(
    // RAY vs SOL (LP) --> RAY
    "100",
    3,
    "HUDr9BDaAGqi37xbQHzxCyXvfMCKPTPNF8g9c9bPu1Fu"
  );
}

async function withdrawRaydiumFarmWithVersion(
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

  console.log("Deposited amount before withdraw", ledger?.deposited);
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
    console.log("Staked Token Wallet ATA: ", stakedWalletATA.toBase58());
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
    let ix = await makeWithdrawInstruction({
      poolKeys,
      userKeys,
      amount: new BN(amount),
    });
    !(ix instanceof Error) && tx.add(ix);
  }
  let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log("Transaction hash: ", result);
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

  console.log("Deposited amount after withdraw", ledger?.deposited);
}

main();
