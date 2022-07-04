import {
  checkTokenAccount,
  createATAWithoutCheckIx,
  findAssociatedTokenAddress,
  wrapNative,
} from "../../utils";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
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
} from "@solana/web3.js";
import { StrategyState } from "./StrategyState";
import {
  swap,
  transfer,
  borrow,
  initializeUser,
  addLiquidity,
  removeLiquidity,
  stakeLp,
  unstakeLp,
  updateLending,
  swapAndWithdraw,
  closeAccount,
} from "./instructions";
import { parseLendingInfo } from "../lending/lendingInfo";
import {
  parseV4PoolInfo,
  parseFarmV45,
  FARM_PROGRAM_ID_V5,
} from "../../raydium";
import { Market } from "@project-serum/serum";

export async function getDepositTx(
  strategy: StrategyState,
  wallet: PublicKey,
  stopLoss: BN,
  amount0: BN,
  amount1: BN,
  borrow0: BN,
  borrow1: BN,
  connection: Connection
) {
  let swapTx = new Transaction();
  let depositTx = new Transaction();
  let preTx = new Transaction();
  let cleanUpTx = new Transaction();
  let init = await initializeUser(wallet, strategy);
  let pubkeys = [strategy.lendingPool0, strategy.lendingPool1, strategy.ammId];
  let accountsInfo = await connection.getMultipleAccountsInfo(pubkeys);
  let lending0 = parseLendingInfo(accountsInfo[0]?.data, pubkeys[0]);
  let lending1 = parseLendingInfo(accountsInfo[1]?.data, pubkeys[1]);
  let ammInfo = parseV4PoolInfo(accountsInfo[2]?.data, pubkeys[2]).poolInfo;
  let serumMarket = await Market.load(
    connection,
    ammInfo.serumMarket,
    undefined,
    ammInfo.serumProgramId
  );

  preTx.add(init.instruction);
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

  depositTx.add(
    await transfer(
      wallet,
      strategy,
      init.userKey,
      stopLoss,
      amount0,
      amount1,
      usrATA0,
      usrATA1
    )
  );
  depositTx.add(
    await borrow(
      wallet,
      strategy,
      lending0,
      lending1,
      ammInfo,
      init.userKey,
      new BN(0),
      borrow1
    )
  );
  depositTx.add(
    await borrow(
      wallet,
      strategy,
      lending0,
      lending1,
      ammInfo,
      init.userKey,
      borrow0,
      new BN(0)
    )
  );
  swapTx.add(await swap(wallet, strategy, ammInfo, serumMarket, init.userKey));
  swapTx.add(await addLiquidity(wallet, strategy, ammInfo, init.userKey));

  return [preTx, depositTx, swapTx, cleanUpTx];
}
export async function getWithdrawTx(
  strategy: StrategyState,
  userInfoAccount: PublicKey,
  wallet: PublicKey,
  LPamount: BN,
  withdrawType: number,
  //0,1,2 2 is without trading
  connection: Connection
) {
  let swapTx = new Transaction();
  let withdrawTx = new Transaction();
  let preTx = new Transaction();
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
    await unstakeLp(
      strategy,
      stakeInfo,
      wallet,
      strategyFarmInfo,
      userInfoAccount,
      LPamount,
      new BN(withdrawType)
    )
  );
  withdrawTx.add(
    await removeLiquidity(
      wallet,
      strategy,
      ammInfo,
      serumMarket,
      userInfoAccount
    )
  );
  swapTx.add(
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
  cleanUpTx.add(await closeAccount(userInfoAccount, wallet));

  return [preTx, withdrawTx, swapTx, cleanUpTx];
}
export function getCloseAccountTx(
  userInfoAccount: PublicKey,
  wallet: PublicKey
) {
  let tx = new Transaction();
  tx.add(closeAccount(userInfoAccount, wallet));
  return tx;
}
