import {
  createATAWithoutCheckIx,
  findAssociatedTokenAddress,
  wrapNative,
} from "../utils";
import { NATIVE_MINT, createCloseAccountInstruction } from "@solana/spl-token";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import * as ins from "./instructions";
import { IOU_TOKEN_MINT, SABER_TOKEN_MINT } from "./ids";
import {
  FarmInfo,
  getMinerKey,
  minerCreated,
  PoolInfo,
  WrapInfo,
} from "./infos";

export async function createDepositTx(
  poolInfo: PoolInfo,
  farmInfo: FarmInfo,
  AtokenAmount: BN,
  BtokenAmount: BN,
  minimalRecieve: BN,
  wallet: PublicKey,
  connection: Connection
) {
  let tx: Transaction = new Transaction();
  let cleanupTx = new Transaction();
  // check if Token A source account is created
  let AtokenSourceAccount = await findAssociatedTokenAddress(
    wallet,
    poolInfo.mintA
  );

  tx.add(await createATAWithoutCheckIx(wallet, poolInfo.mintA));
  // check if Token B source account is created
  let BtokenSourceAccount = await findAssociatedTokenAddress(
    wallet,
    poolInfo.mintB
  );

  tx.add(await createATAWithoutCheckIx(wallet, poolInfo.mintB));
  // check if LP Token account is created
  let LPtokenAccount = await findAssociatedTokenAddress(
    wallet,
    poolInfo.poolMint
  );

  tx.add(await createATAWithoutCheckIx(wallet, poolInfo.poolMint));
  // check Token A is wSol
  if (poolInfo.mintA.toString() == NATIVE_MINT.toString()) {
    // if true add a wrapNative IX
    let wrapNativeIns = await wrapNative(
      AtokenAmount,
      wallet,
      connection,
      false
    );
    cleanupTx.add(
      createCloseAccountInstruction(AtokenSourceAccount, wallet, wallet, [])
    );
    tx.add(wrapNativeIns);
  }
  // if Token A source account is created in this tx

  // check Token A is wSol
  if (poolInfo.mintB.toString() == NATIVE_MINT.toString()) {
    // if true add a wrapNative IX
    let wrapNativeIns = await wrapNative(
      BtokenAmount,
      wallet,
      connection,
      false
    );
    cleanupTx.add(
      createCloseAccountInstruction(BtokenSourceAccount, wallet, wallet, [])
    );
    tx.add(wrapNativeIns);
  }

  // if Token A is wrapped
  if (poolInfo.mintAWrapped) {
    // check underlying tokan account is created
    let wrapMintAtokenAddress = await findAssociatedTokenAddress(
      wallet,
      poolInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey
    );
    tx.add(
      await createATAWithoutCheckIx(
        wallet,
        poolInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey
      )
    );

    let multiplyer = new BN(poolInfo.mintAWrapInfo?.multiplyer as BN);
    let wrapAIns = ins.wrapToken(
      poolInfo.mintAWrapInfo as WrapInfo,
      wallet,
      AtokenAmount.div(multiplyer),
      wrapMintAtokenAddress,
      AtokenSourceAccount
    );

    tx.add(wrapAIns);
  }
  // if Token B is wrapped
  if (poolInfo.mintBWrapped == true) {
    let wrapMintBtokenAddress = await findAssociatedTokenAddress(
      wallet,
      poolInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey
    );
    tx.add(
      await createATAWithoutCheckIx(
        wallet,
        poolInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey
      )
    );
    let multiplyer = new BN(poolInfo.mintBWrapInfo?.multiplyer as BN);
    let wrapBIns = ins.wrapToken(
      poolInfo.mintBWrapInfo as WrapInfo,
      wallet,
      BtokenAmount.div(multiplyer),
      wrapMintBtokenAddress,
      BtokenSourceAccount
    );

    tx.add(wrapBIns);
  }
  //console.log(BtokenAmount);
  let depositIns = ins.deposit(
    poolInfo,
    AtokenAmount,
    BtokenAmount,
    minimalRecieve,
    wallet,
    AtokenSourceAccount,
    BtokenSourceAccount,
    LPtokenAccount
  );
  tx.add(depositIns);
  if (poolInfo.isFarming) {
    let depositToFarmIns = await depositToFarm(
      farmInfo,
      wallet,
      minimalRecieve,
      connection
    );
    tx.add(depositToFarmIns);
  }

  tx.add(cleanupTx);
  return tx;
}

export async function depositToFarm(
  farm: FarmInfo,
  wallet: PublicKey,
  amount: BN,
  connection: Connection
) {
  let tx = new Transaction();
  let createMinerIx = await createMiner(farm, wallet, connection);
  tx.add(createMinerIx);
  let depositToFarm = await ins.depositToFarmIx(farm, wallet, amount);
  tx.add(depositToFarm);
  return tx;
}

export async function createMiner(
  farm: FarmInfo,
  wallet: PublicKey,
  connection: Connection
) {
  let tx = new Transaction();
  let miner = await getMinerKey(wallet, farm.infoPubkey);
  if (!(await minerCreated(wallet, farm, connection))) {
    tx.add(await createATAWithoutCheckIx(miner[0], farm.tokenMintKey, wallet));
    let createMinerIx = await ins.createMinerAccountIx(
      farm as FarmInfo,
      wallet
    );
    tx.add(createMinerIx);
  }
  return tx;
}

export async function createWithdrawTx(
  poolInfo: PoolInfo,
  farmInfo: FarmInfo,
  tokenType: String,
  farmTokenAmount: BN,
  LPtokenAmount: BN,
  minimalRecieve: BN,
  wallet: PublicKey,
  connection: Connection
) {
  let tx: Transaction = new Transaction();
  let cleanupTx = new Transaction();
  let LPtokenSourceAccount = await findAssociatedTokenAddress(
    wallet,
    poolInfo.poolMint
  );
  let recieveTokenAccountMint = new PublicKey(0);
  if (tokenType == "A") {
    recieveTokenAccountMint = poolInfo.mintA;
  } else if (tokenType == "B") {
    recieveTokenAccountMint = poolInfo.mintB;
  }
  tx.add(await createATAWithoutCheckIx(wallet, poolInfo.poolMint));
  let recieveTokenAccount = await findAssociatedTokenAddress(
    wallet,
    recieveTokenAccountMint
  );

  tx.add(await createATAWithoutCheckIx(wallet, recieveTokenAccountMint));
  if (poolInfo.isFarming) {
    let withdrawFromfram = await withdrawFromMiner(
      farmInfo,
      wallet,
      farmTokenAmount,
      connection,
      false
    );
    tx.add(withdrawFromfram);
    LPtokenAmount = farmTokenAmount.add(LPtokenAmount);
  }
  if (!LPtokenAmount.eq(new BN(0))) {
    tx.add(
      ins.withdrawOne(
        poolInfo,
        tokenType,
        LPtokenAmount,
        minimalRecieve,
        wallet,
        LPtokenSourceAccount,
        recieveTokenAccount
      )
    );
  }

  if (tokenType == "A" && poolInfo.mintAWrapped) {
    let wrappedmint = poolInfo.mintAWrapInfo
      ?.underlyingWrappedTokenMint as PublicKey;
    let mintAUnderlyingTokenAccount = await findAssociatedTokenAddress(
      wallet,
      wrappedmint
    );

    tx.add(await createATAWithoutCheckIx(wallet, wrappedmint));
    tx.add(
      ins.unwrapToken(
        poolInfo.mintAWrapInfo as WrapInfo,
        wallet,
        recieveTokenAccount,
        mintAUnderlyingTokenAccount
      )
    );
  } else if (tokenType == "B" && poolInfo.mintBWrapped) {
    let wrappedmint = poolInfo.mintBWrapInfo
      ?.underlyingWrappedTokenMint as PublicKey;
    let mintBUnderlyingTokenAccount = await findAssociatedTokenAddress(
      wallet,
      wrappedmint
    );

    tx.add(await createATAWithoutCheckIx(wallet, wrappedmint));
    tx.add(
      ins.unwrapToken(
        poolInfo.mintBWrapInfo as WrapInfo,
        wallet,
        recieveTokenAccount,
        mintBUnderlyingTokenAccount
      )
    );
  }
  if (recieveTokenAccountMint.toString() == NATIVE_MINT.toString()) {
    cleanupTx.add(
      createCloseAccountInstruction(recieveTokenAccount, wallet, wallet, [])
    );
  }
  tx.add(cleanupTx);
  return tx;
}

export async function withdrawFromMiner(
  farm: FarmInfo,
  wallet: PublicKey,
  amount: BN,
  connection: Connection,
  createLPaccount: boolean = true
) {
  let tx = new Transaction();
  let withdrawTokenAccount = await findAssociatedTokenAddress(
    wallet,
    farm.tokenMintKey
  );

  if (!amount.eq(new BN(0))) {
    tx.add(await createATAWithoutCheckIx(wallet, farm.tokenMintKey));
    let withdrawFromFarmIns = await ins.withdrawFromFarmIx(
      farm,
      wallet,
      amount
    );
    tx.add(withdrawFromFarmIns);
  }

  return tx;
}

export async function claimRewardTx(
  farm: FarmInfo,
  wallet: PublicKey,
  connection: Connection
) {
  let tx = new Transaction();
  let createMinerIx = await createMiner(farm, wallet, connection);
  tx.add(createMinerIx);
  let iouTokenAccount = await findAssociatedTokenAddress(
    wallet,
    IOU_TOKEN_MINT
  );
  tx.add(await createATAWithoutCheckIx(wallet, IOU_TOKEN_MINT));
  tx.add(await createATAWithoutCheckIx(wallet, SABER_TOKEN_MINT));
  tx.add(await ins.claimReward(farm, wallet));
  tx.add(createCloseAccountInstruction(iouTokenAccount, wallet, wallet, []));
  return tx;
}
