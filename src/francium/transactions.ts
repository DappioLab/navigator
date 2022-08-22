import {
  createATAWithoutCheckIx,
  findAssociatedTokenAddress,
  wrapNative,
} from "../utils";
import {
  NATIVE_MINT,
  createCloseAccountInstruction,
} from "@solana/spl-token-v2";
import BN from "bn.js";
import {
  Connection,
  PublicKey,
  Transaction,
  MemcmpFilter,
  DataSizeFilter,
  GetProgramAccountsConfig,
  TransactionInstruction,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  swap,
  transfer,
  borrow,
  addLiquidity,
  removeLiquidity,
  swapAndWithdraw,
  unstake,
  initializeRaydiumPosition,
  closeRaydiumPosition,
} from "./instructions";
import {
  getRaydiumPositionKeySet,
  parseReserveInfo,
  RaydiumStrategyState,
} from "./infos";
import { parseV4PoolInfo, parseFarmV45, FARM_PROGRAM_ID_V5 } from "../raydium";
import { Market } from "@project-serum/serum";
import { FRANCIUM_LENDING_PROGRAM_ID, LENDING_MARKET } from "./ids";

// Raydium-specific
export async function getDepositTx(
  strategy: RaydiumStrategyState,
  wallet: PublicKey,
  stopLoss: BN,
  amount0: BN,
  amount1: BN,
  borrow0: BN,
  borrow1: BN,
  connection: Connection
): Promise<Transaction[]> {
  let preTx = new Transaction();
  let moneyMarketTx = new Transaction();
  let poolTx = new Transaction();
  let cleanUpTx = new Transaction();

  const positionKeySet = await getRaydiumPositionKeySet(
    wallet,
    strategy.infoPubkey
  );
  const initIx = initializeRaydiumPosition(wallet, strategy, positionKeySet);
  let pubkeys = [strategy.lendingPool0, strategy.lendingPool1, strategy.ammId];
  let accountsInfo = await connection.getMultipleAccountsInfo(pubkeys);
  let lending0 = parseReserveInfo(accountsInfo[0]?.data, pubkeys[0]);
  let lending1 = parseReserveInfo(accountsInfo[1]?.data, pubkeys[1]);
  let ammInfo = parseV4PoolInfo(accountsInfo[2]?.data, pubkeys[2]).poolInfo;
  let serumMarket = await Market.load(
    connection,
    ammInfo.serumMarket,
    undefined,
    ammInfo.serumProgramId
  );

  preTx.add(initIx);
  preTx.add(await createATAWithoutCheckIx(wallet, ammInfo.tokenBMint));
  preTx.add(await createATAWithoutCheckIx(wallet, ammInfo.tokenAMint));

  let usrATA0 = await findAssociatedTokenAddress(wallet, ammInfo.tokenBMint);
  let usrATA1 = await findAssociatedTokenAddress(wallet, ammInfo.tokenAMint);

  if (ammInfo.tokenBMint.equals(NATIVE_MINT)) {
    preTx.add(await wrapNative(amount0, wallet, connection, false));
    cleanUpTx.add(createCloseAccountInstruction(usrATA0, wallet, wallet, []));
  }
  if (ammInfo.tokenAMint.equals(NATIVE_MINT)) {
    preTx.add(await wrapNative(amount1, wallet, connection, false));
    cleanUpTx.add(createCloseAccountInstruction(usrATA1, wallet, wallet, []));
  }

  moneyMarketTx.add(
    // TODO: Rename to supply?
    transfer(
      wallet,
      strategy,
      positionKeySet.address,
      stopLoss,
      amount0,
      amount1,
      usrATA0,
      usrATA1
    )
  );

  moneyMarketTx.add(
    borrow(
      wallet,
      strategy,
      lending0,
      lending1,
      ammInfo,
      positionKeySet.address,
      new BN(0),
      borrow1
    )
  );

  moneyMarketTx.add(
    borrow(
      wallet,
      strategy,
      lending0,
      lending1,
      ammInfo,
      positionKeySet.address,
      borrow0,
      new BN(0)
    )
  );

  poolTx.add(
    await swap(wallet, strategy, ammInfo, serumMarket, positionKeySet.address)
  );
  poolTx.add(addLiquidity(wallet, strategy, ammInfo, positionKeySet.address));

  // TODO: Miss staking?

  return [preTx, moneyMarketTx, poolTx, cleanUpTx];
}

// Raydium-specific
export async function getWithdrawTx(
  strategy: RaydiumStrategyState,
  userInfoAccount: PublicKey,
  wallet: PublicKey,
  lpAmount: BN,
  withdrawType: number,
  //0,1,2 2 is without trading
  connection: Connection
): Promise<Transaction[]> {
  let preTx = new Transaction();
  let poolTx = new Transaction();
  let withdrawTx = new Transaction();
  let cleanUpTx = new Transaction();

  let pubkeys = [strategy.ammId, strategy.stakePoolId];
  let accountsInfo = await connection.getMultipleAccountsInfo(pubkeys);
  let ammInfo = parseV4PoolInfo(accountsInfo[0]?.data, pubkeys[0]).poolInfo;
  let stakeInfo = parseFarmV45(accountsInfo[1]?.data, pubkeys[1], 4);
  let serumMarket = await Market.load(
    connection,
    ammInfo.serumMarket,
    undefined,
    ammInfo.serumProgramId
  );

  preTx.add(await createATAWithoutCheckIx(wallet, ammInfo.tokenBMint));
  preTx.add(await createATAWithoutCheckIx(wallet, ammInfo.tokenAMint));

  let usrATA0 = await findAssociatedTokenAddress(wallet, ammInfo.tokenBMint);
  let usrATA1 = await findAssociatedTokenAddress(wallet, ammInfo.tokenAMint);

  if (ammInfo.tokenBMint.equals(NATIVE_MINT)) {
    cleanUpTx.add(createCloseAccountInstruction(usrATA0, wallet, wallet, []));
  }
  if (ammInfo.tokenAMint.equals(NATIVE_MINT)) {
    cleanUpTx.add(createCloseAccountInstruction(usrATA1, wallet, wallet, []));
  }
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8 + 32,
      bytes: strategy.authority.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 96,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const [strategyFarmInfo, bump] = await PublicKey.findProgramAddress(
    [
      strategy.stakePoolId.toBuffer(),
      strategy.authority.toBuffer(),
      Buffer.from("staker_info_v2_associated_seed", "utf-8"),
    ],
    FARM_PROGRAM_ID_V5
  );

  preTx.add(updateLending(strategy));
  preTx.add(
    await unstake(
      strategy,
      stakeInfo,
      wallet,
      strategyFarmInfo,
      userInfoAccount,
      lpAmount,
      new BN(withdrawType)
    )
  );

  poolTx.add(
    await removeLiquidity(
      wallet,
      strategy,
      ammInfo,
      serumMarket,
      userInfoAccount
    )
  );

  withdrawTx.add(
    await swapAndWithdraw(
      wallet,
      strategy,
      ammInfo,
      serumMarket,
      userInfoAccount,
      usrATA0,
      usrATA1,
      new BN(withdrawType)
    )
  );

  cleanUpTx.add(closeRaydiumPosition(userInfoAccount, wallet));

  return [preTx, poolTx, withdrawTx, cleanUpTx];
}

// Raydium-specific
export function getCloseRaydiumPositionTx(
  userInfoAccount: PublicKey,
  wallet: PublicKey
): Transaction {
  let tx = new Transaction();
  tx.add(closeRaydiumPosition(userInfoAccount, wallet));
  return tx;
}

// Raydium-specific
export function updateLending(strategy: RaydiumStrategyState): Transaction {
  let keys0 = [
    {
      pubkey: LENDING_MARKET,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: strategy.lendingPool0,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  let keys1 = [
    {
      pubkey: LENDING_MARKET,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: strategy.lendingPool1,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
  ];
  let data = Buffer.alloc(1, 12);

  let tx = new Transaction();
  tx.add(
    new TransactionInstruction({
      keys: keys0,
      programId: FRANCIUM_LENDING_PROGRAM_ID,
      data,
    })
  );
  tx.add(
    new TransactionInstruction({
      keys: keys1,
      programId: FRANCIUM_LENDING_PROGRAM_ID,
      data,
    })
  );

  return tx;
}
