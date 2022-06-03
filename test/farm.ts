import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import * as util from "../src/util";
import * as saber from "../src/saber";
import * as raydium from "../src/raydium";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";

const keyPairPath = os.homedir() + "/.config/solana/dappio-1.json";

describe("Farm Test", async () => {
  let connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
    wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws",
    commitment: "processed",
  });
  // let connection = new Connection("https://solana-api.projectserum.com", {
  //   wsEndpoint: "wss://solana-api.projectserum.com/",
  //   commitment: "processed",
  // });
  let wallet = (() => {
    const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
    let u8Key = new Uint8Array(PrivateKey);
    return Keypair.fromSecretKey(u8Key);
  })();

  console.log("Debug 1");
  // const saberFarms = await saber.getAllFarms(connection, SABER_QUARRY_REWARDER);
  console.log("Debug 2");

  it("get Ledgers", async () => {
    let res = await raydium.getAllLedgers(
      connection,
      new PublicKey("BgdtDEEmn95wakgQRx4jAVqn8jsSPBhDwxE8NTPnmyon") // JIM
      // new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4") // MC
    );
    console.log(res.map((i) => i.farmId));
    // for (let i of res) {
    //   console.log(i.farmId);
    // }
    // console.log(res);
  });

  it("can deposit through Raydium protocol", async () => {
    console.log("The public key of wallet: ", wallet.publicKey.toBase58());
    let depositAmt = "100";
    console.log("Deposit amount: ", depositAmt);
    // get the value before and after depositing
    let [before, after] = await depositRaydiumFarmWithVersion(
      // RAY vs RAY --> RAY
      depositAmt,
      3,
      "4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW"
    );
    // let [before, after] = await depositRaydiumFarmWithVersion(
    //   // RAY vs SOL (LP) --> RAY
    //   depositAmt,
    //   3,
    //   "HUDr9BDaAGqi37xbQHzxCyXvfMCKPTPNF8g9c9bPu1Fu"
    // );
    // assert(before && after, "No data output");
    // assert(after! - before! === Number(depositAmt));
  });

  it("can withdraw through Raydium protocol", async () => {
    console.log("The public key of wallet: ", wallet.publicKey.toBase58());
    let withdrawAmt = "100";
    console.log("Deposit amount: ", withdrawAmt);
    // get the value before and after depositing
    let [before, after] = await withdrawRaydiumFarmWithVersion(
      // RAY vs RAY --> RAY
      withdrawAmt,
      3,
      "4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW"
    );
    // let [before, after] = await withdrawRaydiumFarmWithVersion(
    //   // RAY vs SOL (LP) --> RAY
    //   withdrawAmt,
    //   3,
    //   "HUDr9BDaAGqi37xbQHzxCyXvfMCKPTPNF8g9c9bPu1Fu"
    // );
    // assert(before && after, "No data output");
    // assert(after! - before! === Number(withdrawAmt));
  });

  it("can deposit through Saber protocol", async () => {
    console.log("The public key of wallet: ", wallet.publicKey.toBase58());
    await depositWithSaber();
  });

  it("can withdraw through Saber protocol", async () => {
    console.log("The public key of wallet: ", wallet.publicKey.toBase58());
    await withdrawWithSaber();
  });

  it("can claim rewards through Saber protocol", async () => {
    console.log("The public key of wallet: ", wallet.publicKey.toBase58());
    await claimWithSaber();
  });

  // Test Functions from here
  async function depositRaydiumFarmWithVersion(
    amount: BN | string | number,
    version: 3 | 5,
    farmId: string
  ) {
    let tx = new Transaction();
    let ledgerPubkey = await raydium.getAssociatedLedgerAccount({
      programId:
        version === 3 ? raydium.STAKE_PROGRAM_ID : raydium.STAKE_PROGRAM_ID_V5,
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
        await raydium.getLegerInfos(
          connection,
          [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
          version === 3
            ? raydium.FARM_LEDGER_LAYOUT_V3_1
            : raydium.FARM_LEDGER_LAYOUT_V5_1,
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
      let userKeys: raydium.FarmUserKeys = {
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
          ? raydium.parseFarmV1(farm?.data, new PublicKey(ledger.farmId))
          : raydium.parseFarmV45(farm?.data, new PublicKey(ledger.farmId), 5);
      let poolKeys: raydium.FarmPoolKeys = {
        id: new PublicKey(ledger.farmId),
        lpMint: new PublicKey(ledger.mints.stakedTokenMint),
        rewardMints: !ledger.mints.rewardBMint
          ? [new PublicKey(ledger.mints.rewardAMint)]
          : [
              new PublicKey(ledger.mints.rewardAMint),
              new PublicKey(ledger.mints.rewardBMint),
            ],
        version: version,
        programId:
          version === 3
            ? raydium.STAKE_PROGRAM_ID
            : raydium.STAKE_PROGRAM_ID_V5,
        authority: (await farmInfo.authority())[0],
        lpVault: farmInfo.poolLpTokenAccountPubkey,
        rewardVaults: [farmInfo.poolRewardTokenAccountPubkey],
      };
      let ix =
        version === 3
          ? await raydium.makeDepositInstructionV3({
              poolKeys,
              userKeys,
              amount: new BN(amount),
            })
          : await raydium.makeDepositInstructionV5({
              poolKeys,
              userKeys,
              amount: new BN(amount),
            });
      tx.add(ix);
    }
    let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Transaction hash", result);
    ledgerAccInfo = await connection.getAccountInfo(ledgerPubkey, "confirmed");
    let ledgerBeforeDeposit = ledger;
    ledger =
      ledgerAccInfo &&
      (
        await raydium.getLegerInfos(
          connection,
          [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
          version === 3
            ? raydium.FARM_LEDGER_LAYOUT_V3_1
            : raydium.FARM_LEDGER_LAYOUT_V5_1,
          version
        )
      )[0];
    console.log("Staked amount After deposited: ", ledger?.deposited);
    return [ledgerBeforeDeposit?.deposited, ledger?.deposited];
  }
  async function withdrawRaydiumFarmWithVersion(
    amount: BN | string | number,
    version: 3 | 5,
    farmId: string
  ) {
    let tx = new Transaction();
    let ledgerPubkey = await raydium.getAssociatedLedgerAccount({
      programId:
        version === 3 ? raydium.STAKE_PROGRAM_ID : raydium.STAKE_PROGRAM_ID_V5,
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
        await raydium.getLegerInfos(
          connection,
          [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
          version === 3
            ? raydium.FARM_LEDGER_LAYOUT_V3_1
            : raydium.FARM_LEDGER_LAYOUT_V5_1,
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
      let userKeys: raydium.FarmUserKeys = {
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
          ? raydium.parseFarmV1(farm?.data, new PublicKey(ledger.farmId))
          : raydium.parseFarmV45(farm?.data, new PublicKey(ledger.farmId), 5);
      let poolKeys: raydium.FarmPoolKeys = {
        id: new PublicKey(ledger.farmId),
        lpMint: new PublicKey(ledger.mints.stakedTokenMint),
        rewardMints: !ledger.mints.rewardBMint
          ? [new PublicKey(ledger.mints.rewardAMint)]
          : [
              new PublicKey(ledger.mints.rewardAMint),
              new PublicKey(ledger.mints.rewardBMint),
            ],
        version: version,
        programId:
          version === 3
            ? raydium.STAKE_PROGRAM_ID
            : raydium.STAKE_PROGRAM_ID_V5,
        authority: (await farmInfo.authority())[0],
        lpVault: farmInfo.poolLpTokenAccountPubkey,
        rewardVaults: [farmInfo.poolRewardTokenAccountPubkey],
      };
      let ix = await raydium.makeWithdrawInstruction({
        poolKeys,
        userKeys,
        amount: new BN(amount),
      });
      !(ix instanceof Error) && tx.add(ix);
    }
    let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Transaction hash: ", result);
    ledgerAccInfo = await connection.getAccountInfo(ledgerPubkey, "confirmed");
    let ledgerBeforeWithdraw = ledger;
    ledger =
      ledgerAccInfo &&
      (
        await raydium.getLegerInfos(
          connection,
          [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
          version === 3
            ? raydium.FARM_LEDGER_LAYOUT_V3_1
            : raydium.FARM_LEDGER_LAYOUT_V5_1,
          version
        )
      )[0];

    console.log("Deposited amount after withdraw", ledger?.deposited);
    return [ledgerBeforeWithdraw?.deposited, ledger?.deposited];
  }

  async function depositWithSaber() {
    const saberFarms = await saber.getAllFarms(
      connection,
      saber.SABER_QUARRY_REWARDER
    );
    let pools = await saber.getAllPools(connection);
    // console.log(swap);
    for (let pool of pools) {
      if (pool.mintB.toString() == NATIVE_MINT.toString()) {
        const poolInfoWrapper = new saber.PoolInfoWrapper(pool);
        await poolInfoWrapper.updateAmount(connection);
        const farm = saber.getFarm(saberFarms, pool.poolMint) as saber.FarmInfo;

        let tx = new Transaction();
        let deposit = await saber.createDepositTx(
          pool,
          farm,
          new BN(0),
          new BN(10),
          new BN(0),
          wallet.publicKey,
          connection
        );
        tx.add(deposit);
        var recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.recentBlockhash = recentBlockhash;
        tx.feePayer = wallet.publicKey;

        let result = await sendAndConfirmTransaction(connection, tx, [wallet]);
        // console.log(result);
        let amount = new BN(0);
        let LPAccount = await util.findAssociatedTokenAddress(
          wallet.publicKey,
          pool.poolMint
        );
        if (!(await util.checkTokenAccount(LPAccount, connection))) {
          continue;
        }
        amount = new BN(
          await util.getTokenAccountAmount(connection, LPAccount)
        );
        if (amount.eq(new BN(0))) {
          continue;
        }
        if (pool.isFarming) {
          const farm = saber.getFarm(
            saberFarms,
            pool.poolMint
          ) as saber.FarmInfo;

          let newTx = new Transaction();
          let depositLeftToFarm = await saber.depositToFarm(
            farm,
            wallet.publicKey,
            amount,
            connection
          );
          newTx.add(depositLeftToFarm);
          let newresult = await sendAndConfirmTransaction(connection, newTx, [
            wallet,
          ]);
          // console.log(newresult);
        }
      }
    }
  }

  async function withdrawWithSaber() {
    const saberFarms = await saber.getAllFarms(
      connection,
      saber.SABER_QUARRY_REWARDER
    );
    let pools = await saber.getAllPools(connection);
    let allMiner = await saber.getAllMiner(connection, wallet.publicKey);

    for (let miner of allMiner) {
      for (let pool of pools) {
        const farm = saber.getFarm(saberFarms, pool.poolMint) as saber.FarmInfo;
        if (farm?.infoPubkey.toString() == miner.farmKey.toString()) {
          let tx = new Transaction();
          let amount = new BN(0);

          let withdrawAccount = await util.findAssociatedTokenAddress(
            wallet.publicKey,
            pool.poolMint
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
            pool,
            farm,
            "B",
            miner.balance,
            amount,
            new BN(0),
            wallet.publicKey,
            connection
          );
          tx.add(withdrawIns);
          var recentBlockhash = (await connection.getLatestBlockhash())
            .blockhash;
          tx.recentBlockhash = recentBlockhash;
          tx.feePayer = wallet.publicKey;
          //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
          //console.log(simulation.value.err);
          let result = await sendAndConfirmTransaction(connection, tx, [
            wallet,
          ]);
        }
      }
    }
  }

  async function claimWithSaber() {
    const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
      wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws",
      commitment: "processed",
    });
    //const connection = new Connection("https://raydium.genesysgo.net", { commitment: "processed" });
    const saberFarms = await saber.getAllFarms(
      connection,
      saber.SABER_QUARRY_REWARDER
    );
    let pools = await saber.getAllPools(connection);
    let allMiner = await saber.getAllMiner(connection, wallet.publicKey);

    for (let miner of allMiner) {
      for (let pool of pools) {
        const farm = saber.getFarm(saberFarms, pool.poolMint) as saber.FarmInfo;
        if (farm?.infoPubkey.toString() == miner.farmKey.toString()) {
          let tx = new Transaction();
          let claimIns = await saber.claimRewardTx(
            farm,
            wallet.publicKey,
            connection
          );
          tx.add(claimIns);
          var recentBlockhash = (await connection.getLatestBlockhash())
            .blockhash;
          tx.recentBlockhash = recentBlockhash;
          tx.feePayer = wallet.publicKey;
          //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
          //console.log(simulation.value.err);
          let result = await sendAndConfirmTransaction(connection, tx, [
            wallet,
          ]);
        }
      }
    }
  }
});
