enum LendingInstruction {
  InitLendingMarket = 0,
  SetLendingMarketOwner = 1,
  InitReserve = 2,
  RefreshReserve = 3,
  DepositReserveLiquidity = 4,
  RedeemReserveCollateral = 5,
  InitObligation = 6,
  RefreshObligation = 7,
  DepositObligationCollateral = 8,
  WithdrawObligationCollateral = 9,
  BorrowObligationLiquidity = 10,
  RepayObligationLiquidity = 11,
  LiquidateObligation = 12,
  FlashLoan = 13,
  DepositReserveLiquidityAndObligationCollateral = 14,
  WithdrawObligationCollateralAndRedeemReserveLiquidity = 15,
  InitMining = 16,
  SyncNative = 17,
  DepositMining = 18,
  WithdrawMining = 19,
  ClaimMiningMine = 20,
}
import * as info from "./larixInfo";

// deposit
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  publicKey,
  struct,
  u64,
  u128,
  u8,
  bool,
  u16,
} from "@project-serum/borsh";
/// Deposit liquidity into a reserve in exchange for collateral, and deposit the collateral as well.
export const depositReserveLiquidity = (
  liquidityAmount: number | BN,
  sourceLiquidity: PublicKey,
  destinationCollateral: PublicKey,
  reserve: PublicKey,
  reserveCollateralMint: PublicKey,
  reserveLiquiditySupply: PublicKey,

  lendingMarket: PublicKey,
  lendingMarketAuthority: PublicKey,
  transferAuthority: PublicKey,
): TransactionInstruction => {
  const dataLayout = struct([u8("instruction"), u64("liquidityAmount")]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: LendingInstruction.DepositReserveLiquidity,
      liquidityAmount: new BN(liquidityAmount),
    },
    data,
  );

  const keys = [
    { pubkey: sourceLiquidity, isSigner: false, isWritable: true },
    { pubkey: destinationCollateral, isSigner: false, isWritable: true },
    { pubkey: reserve, isSigner: false, isWritable: true },
    { pubkey: reserveCollateralMint, isSigner: false, isWritable: true },
    { pubkey: reserveLiquiditySupply, isSigner: false, isWritable: true },

    { pubkey: lendingMarket, isSigner: false, isWritable: true },
    { pubkey: lendingMarketAuthority, isSigner: false, isWritable: false },
    { pubkey: transferAuthority, isSigner: true, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    programId: info.LARIX_PROGRAM_ID,
    data,
  });
};

// withdraw

/// Redeem collateral from a reserve in exchange for liquidity.
export const RedeemReserveLiquidity = (
  sourceCollateral: PublicKey,
  destinationLiquidity: PublicKey,
  withdrawReserve: PublicKey,
  reserveCollateralMint: PublicKey,
  reserveLiquiditySupply: PublicKey,
  wallet: PublicKey,
): TransactionInstruction => {
  let dataString = "05ffffffffffffffff";
  let data = Buffer.from(dataString, "hex");

  const keys = [
    { pubkey: sourceCollateral, isSigner: false, isWritable: true },
    { pubkey: destinationLiquidity, isSigner: false, isWritable: true },
    { pubkey: withdrawReserve, isSigner: false, isWritable: true },
    { pubkey: reserveCollateralMint, isSigner: false, isWritable: true },
    { pubkey: reserveLiquiditySupply, isSigner: false, isWritable: true },
    { pubkey: info.LARIX_MARKET_ID, isSigner: false, isWritable: false },
    { pubkey: info.MARKETAUTHORITY, isSigner: false, isWritable: false },
    { pubkey: wallet, isSigner: true, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    programId: info.LARIX_PROGRAM_ID,
    data,
  });
};

// refresh reserve

/// Accrue interest and update market price of liquidity on a reserve.
///
/// Accounts expected by this instruction:
///
///   0. `[writable]` Reserve account.
///   1. `[]` Clock sysvar.
///   2. `[optional]` Reserve liquidity oracle account.
///                     Required if the reserve currency is not the lending market quote
///                     currency.
export const refreshReserveInstruction = (
  reserve: PublicKey,
  oracle?: PublicKey,
  larixOracle?: PublicKey,
): TransactionInstruction => {
  const dataLayout = struct([u8("instruction")]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode({ instruction: LendingInstruction.RefreshReserve }, data);

  const keys = [{ pubkey: reserve, isSigner: false, isWritable: true }];

  if (oracle) {
    keys.push({ pubkey: oracle, isSigner: false, isWritable: false });
  }
  if (larixOracle) {
    keys.push({
      pubkey: larixOracle,
      isSigner: false,
      isWritable: false,
    });
  }

  keys.push({
    pubkey: SYSVAR_CLOCK_PUBKEY,
    isSigner: false,
    isWritable: false,
  });

  return new TransactionInstruction({
    keys,
    programId: info.LARIX_PROGRAM_ID,
    data,
  });
};

export async function createInitMinningIx(wallet: PublicKey) {
  let tx = new Transaction();
  let newMiner = await PublicKey.createWithSeed(
    wallet,
    "Dappio",
    info.LARIX_PROGRAM_ID,
  );
  let config = {
    basePubkey: wallet,
    fromPubkey: wallet,
    lamports: 5359200,
    newAccountPubkey: newMiner,
    programId: info.LARIX_PROGRAM_ID,
    seed: "Dappio",
    space: 642,
  };
  let createAccountIx = SystemProgram.createAccountWithSeed(config);
  tx.add(createAccountIx);
  const dataLayout = struct([u8("instruction")]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode({ instruction: LendingInstruction.InitMining }, data);
  const keys = [
    { pubkey: newMiner, isSigner: false, isWritable: true },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: info.LARIX_MARKET_ID, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  tx.add(
    new TransactionInstruction({
      keys,
      programId: info.LARIX_PROGRAM_ID,
      data,
    }),
  );
  return tx;
}

export async function depositToMiner(
  unCollSupply: PublicKey,
  mining: PublicKey,
  reservePub: PublicKey,
  sourceAccount: PublicKey,
  wallet: PublicKey,
) {
  let dataString = "12ffffffffffffffff";
  let data = Buffer.from(dataString, "hex");
  const keys = [
    { pubkey: sourceAccount, isSigner: false, isWritable: true },
    { pubkey: unCollSupply, isSigner: false, isWritable: true },
    { pubkey: mining, isSigner: false, isWritable: true },

    { pubkey: reservePub, isSigner: false, isWritable: false },
    { pubkey: info.LARIX_MARKET_ID, isSigner: false, isWritable: false },
    { pubkey: info.MARKETAUTHORITY, isSigner: false, isWritable: false },

    { pubkey: wallet, isSigner: true, isWritable: false },
    { pubkey: wallet, isSigner: true, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: info.LARIX_PROGRAM_ID,
    data,
  });
}

export async function withdrawFromMiner(
  amount: BN,
  unCollSupply: PublicKey,
  desAccount: PublicKey,
  mining: PublicKey,
  reservePub: PublicKey,

  wallet: PublicKey,
) {
  const dataLayout = struct([u8("instruction"), u64("liquidityAmount")]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: LendingInstruction.WithdrawMining,
      liquidityAmount: new BN(amount),
    },
    data,
  );
  const keys = [
    { pubkey: unCollSupply, isSigner: false, isWritable: true },
    { pubkey: desAccount, isSigner: false, isWritable: true },
    { pubkey: mining, isSigner: false, isWritable: true },
    { pubkey: reservePub, isSigner: false, isWritable: false },
    { pubkey: info.LARIX_MARKET_ID, isSigner: false, isWritable: false },
    { pubkey: info.MARKETAUTHORITY, isSigner: false, isWritable: false },
    { pubkey: wallet, isSigner: true, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: info.LARIX_PROGRAM_ID,
    data,
  });
}
export function claimReward(
  desAccount: PublicKey,
  miner: PublicKey,
  wallet: PublicKey,
  reservePub: PublicKey[],
) {
  const dataLayout = struct([u8("instruction")]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode({ instruction: LendingInstruction.ClaimMiningMine }, data);

  let keys = [
    { pubkey: miner, isSigner: false, isWritable: true },
    { pubkey: info.MINESUPPLY, isSigner: false, isWritable: true },
    { pubkey: desAccount, isSigner: false, isWritable: true },

    { pubkey: wallet, isSigner: true, isWritable: false },
    { pubkey: info.LARIX_MARKET_ID, isSigner: false, isWritable: false },
    { pubkey: info.MARKETAUTHORITY, isSigner: false, isWritable: false },

    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  for (let reserve of reservePub) {
    keys.push({ pubkey: reserve, isSigner: false, isWritable: false });
  }
  return new TransactionInstruction({
    keys,
    programId: info.LARIX_PROGRAM_ID,
    data,
  });
}
