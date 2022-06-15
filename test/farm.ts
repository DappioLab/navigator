import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import { raydium, saber, utils } from "../src";
import { NATIVE_MINT } from "@solana/spl-token-v2";
import BN from "bn.js";

const keyPairPath = os.homedir() + "/.config/solana/dappio-1.json";

describe("Farm Test", async () => {
  // let connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  //   wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws",
  //   commitment: "processed",
  // });
  // const connection = new Connection("https://ssc-dao.genesysgo.net", {
  //   commitment: "processed",
  // });
  const connection = new Connection("https://solana-api.tt-prod.net", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });
  let wallet = (() => {
    const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
    let u8Key = new Uint8Array(PrivateKey);
    return Keypair.fromSecretKey(u8Key);
  })();

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

  // it("can deposit through Raydium protocol", async () => {
  //   console.log("The public key of wallet: ", wallet.publicKey.toBase58());
  //   let depositAmt = "100";
  //   console.log("Deposit amount: ", depositAmt);
  //   // get the value before and after depositing
  //   let [before, after] = await depositRaydiumFarmWithVersion(
  //     // RAY vs RAY --> RAY
  //     depositAmt,
  //     3,
  //     // "4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW"
  //     "5DFbcYNLLy5SJiBpCCDzNSs7cWCsUbYnCkLXzcPQiKnR"
  //   );
  //   // let [before, after] = await depositRaydiumFarmWithVersion(
  //   //   // RAY vs SOL (LP) --> RAY
  //   //   depositAmt,
  //   //   3,
  //   //   "HUDr9BDaAGqi37xbQHzxCyXvfMCKPTPNF8g9c9bPu1Fu"
  //   // );
  //   // assert(before && after, "No data output");
  //   // assert(after! - before! === Number(depositAmt));
  // });

  // it("can withdraw through Raydium protocol", async () => {
  //   console.log("The public key of wallet: ", wallet.publicKey.toBase58());
  //   let withdrawAmt = "100";
  //   console.log("Deposit amount: ", withdrawAmt);
  //   // get the value before and after depositing
  //   let [before, after] = await withdrawRaydiumFarmWithVersion(
  //     // RAY vs RAY --> RAY
  //     withdrawAmt,
  //     3,
  //     // "4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW"
  //     "5DFbcYNLLy5SJiBpCCDzNSs7cWCsUbYnCkLXzcPQiKnR"
  //   );
  //   // let [before, after] = await withdrawRaydiumFarmWithVersion(
  //   //   // RAY vs SOL (LP) --> RAY
  //   //   withdrawAmt,
  //   //   3,
  //   //   "HUDr9BDaAGqi37xbQHzxCyXvfMCKPTPNF8g9c9bPu1Fu"
  //   // );
  //   // assert(before && after, "No data output");
  //   // assert(after! - before! === Number(withdrawAmt));
  // });

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

    const farm = await raydium.getFarm(connection, new PublicKey(farmId));
    const ledger = await raydium.getLedger({
      farm,
      ledgerKey: ledgerPubkey,
      connection,
    });

    console.log("Staked amount before deposted: ", ledger?.amount);

    if (ledger) {
      let stakedWalletATA = await utils.findAssociatedTokenAddress(
        wallet.publicKey,
        new PublicKey(ledger.mints.stakedTokenMint)
      );
      let rewardWalletATA = await utils.findAssociatedTokenAddress(
        wallet.publicKey,
        new PublicKey(ledger.mints.rewardAMint)
      );
      let rewardBWalletATA =
        ledger.mints.rewardBMint &&
        (await utils.findAssociatedTokenAddress(
          wallet.publicKey,
          new PublicKey(ledger.mints.rewardBMint)
        ));
      console.log("Staked token ATA", stakedWalletATA.toBase58());
      let userKeys: raydium.FarmUserKeys = {
        ledger: ledger.farmerId,
        owner: new PublicKey(ledger.userKey),
        lpTokenAccount: new PublicKey(stakedWalletATA),
        rewardTokenAccounts: !rewardBWalletATA
          ? [rewardWalletATA]
          : [rewardWalletATA, rewardBWalletATA],
      };
      let farm = await connection.getAccountInfo(
        new PublicKey(ledger.farmId),
        "confirmed"
      );
      let farmInfoWrapper =
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
        authority: (await farmInfoWrapper.authority())[0],
        lpVault: farmInfoWrapper.farmInfo.poolLpTokenAccountPubkey,
        rewardVaults: [farmInfoWrapper.farmInfo.poolRewardTokenAccountPubkey],
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
    const ledgerAccInfo = await connection.getAccountInfo(
      ledgerPubkey,
      "confirmed"
    );
    let ledgerBeforeDeposit = ledger;
    const ledger2 =
      ledgerAccInfo &&
      (
        await raydium.getLedgerInfos(
          connection,
          [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
          version === 3
            ? raydium.FARM_LEDGER_LAYOUT_V3_1
            : raydium.FARM_LEDGER_LAYOUT_V5_1,
          version
        )
      )[0];
    console.log("Staked amount After deposited: ", ledger2?.amount);
    return [ledgerBeforeDeposit?.amount, ledger2?.amount];
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
        await raydium.getLedgerInfos(
          connection,
          [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
          version === 3
            ? raydium.FARM_LEDGER_LAYOUT_V3_1
            : raydium.FARM_LEDGER_LAYOUT_V5_1,
          version
        )
      )[0];

    console.log("Deposited amount before withdraw", ledger?.amount);
    if (ledger) {
      let stakedWalletATA = await utils.findAssociatedTokenAddress(
        wallet.publicKey,
        new PublicKey(ledger.mints.stakedTokenMint)
      );
      let rewardWalletATA = await utils.findAssociatedTokenAddress(
        wallet.publicKey,
        new PublicKey(ledger.mints.rewardAMint)
      );
      let rewardBWalletATA =
        ledger.mints.rewardBMint &&
        (await utils.findAssociatedTokenAddress(
          wallet.publicKey,
          new PublicKey(ledger.mints.rewardBMint)
        ));
      console.log("Staked Token Wallet ATA: ", stakedWalletATA.toBase58());
      let userKeys: raydium.FarmUserKeys = {
        ledger: ledger.farmerId,
        owner: new PublicKey(ledger.userKey),
        lpTokenAccount: new PublicKey(stakedWalletATA),
        rewardTokenAccounts: !rewardBWalletATA
          ? [rewardWalletATA]
          : [rewardWalletATA, rewardBWalletATA],
      };
      let farm = await connection.getAccountInfo(
        new PublicKey(ledger.farmId),
        "confirmed"
      );
      let farmInfoWrapper =
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
        authority: (await farmInfoWrapper.authority())[0],
        lpVault: farmInfoWrapper.farmInfo.poolLpTokenAccountPubkey,
        rewardVaults: [farmInfoWrapper.farmInfo.poolRewardTokenAccountPubkey],
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
        await raydium.getLedgerInfos(
          connection,
          [{ pubkey: ledgerPubkey, account: ledgerAccInfo }],
          version === 3
            ? raydium.FARM_LEDGER_LAYOUT_V3_1
            : raydium.FARM_LEDGER_LAYOUT_V5_1,
          version
        )
      )[0];

    console.log("Deposited amount after withdraw", ledger?.amount);
    return [ledgerBeforeWithdraw?.amount, ledger?.amount];
  }

  async function depositWithSaber() {
    const saberFarms = await saber.getAllFarms(
      connection,
      saber.SABER_QUARRY_REWARDER
    );
    let pools = await saber.getAllPools(connection);
    // console.log(swap);
    for (let pool of pools) {
      if (pool.tokenBMint.toString() == NATIVE_MINT.toString()) {
        const poolInfoWrapper = new saber.PoolInfoWrapper(pool);
        await poolInfoWrapper.updateAmount(connection);
        const farm1 = saber.getFarmFromLpMint(
          saberFarms,
          pool.lpMint
        ) as saber.FarmInfo;

        let tx = new Transaction();
        let deposit = await saber.createDepositTx(
          pool,
          farm1,
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
        let LPAccount = await utils.findAssociatedTokenAddress(
          wallet.publicKey,
          pool.lpMint
        );
        if (!(await utils.checkTokenAccount(LPAccount, connection))) {
          continue;
        }
        amount = new BN(
          await utils.getTokenAccountAmount(connection, LPAccount)
        );
        if (amount.eq(new BN(0))) {
          continue;
        }

        const farm2 = saber.getFarmFromLpMint(
          saberFarms,
          pool.lpMint
        ) as saber.FarmInfo;
        if (farm2) {
          let newTx = new Transaction();
          let depositLeftToFarm = await saber.depositToFarm(
            farm2,
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
        const farm = saber.getFarmFromLpMint(
          saberFarms,
          pool.lpMint
        ) as saber.FarmInfo;
        if (farm?.farmId.toString() == miner.farmId.toString()) {
          let tx = new Transaction();
          let amount = new BN(0);

          let withdrawAccount = await utils.findAssociatedTokenAddress(
            wallet.publicKey,
            pool.lpMint
          );
          if (await utils.checkTokenAccount(withdrawAccount, connection)) {
            amount = new BN(
              await utils.getTokenAccountAmount(connection, withdrawAccount)
            );
          }
          if (amount.add(new BN(miner.amount)).eq(new BN(0))) {
            continue;
          }
          let withdrawIns = await saber.createWithdrawTx(
            pool,
            farm,
            "B",
            new BN(miner.amount),
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
    const saberFarms = await saber.getAllFarms(
      connection,
      saber.SABER_QUARRY_REWARDER
    );
    let pools = await saber.getAllPools(connection);
    let allMiner = await saber.getAllMiner(connection, wallet.publicKey);

    for (let miner of allMiner) {
      for (let pool of pools) {
        const farm = saber.getFarmFromLpMint(
          saberFarms,
          pool.lpMint
        ) as saber.FarmInfo;
        if (farm?.farmId.toString() == miner.farmId.toString()) {
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
