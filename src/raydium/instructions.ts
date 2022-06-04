import {
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { struct, u64, u8 } from "@project-serum/borsh";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import BN from "bn.js";
export function swapInstruction(
  programId: PublicKey,
  // tokenProgramId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  // serum
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumBids: PublicKey,
  serumAsks: PublicKey,
  serumEventQueue: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  // user
  userSourceTokenAccount: PublicKey,
  userDestTokenAccount: PublicKey,
  userOwner: PublicKey,

  amountIn: BN,
  minAmountOut: BN
): TransactionInstruction {
  const dataLayout = struct([
    u8("instruction"),
    u64("amountIn"),
    u64("minAmountOut"),
  ]);

  const keys = [
    // spl token
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    // amm
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    // serum
    { pubkey: serumProgramId, isSigner: false, isWritable: false },
    { pubkey: serumMarket, isSigner: false, isWritable: true },
    { pubkey: serumBids, isSigner: false, isWritable: true },
    { pubkey: serumAsks, isSigner: false, isWritable: true },
    { pubkey: serumEventQueue, isSigner: false, isWritable: true },
    { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 9,
      amountIn,
      minAmountOut,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export function addLiquidityInstruction(
  programId: PublicKey,
  // tokenProgramId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammQuantities: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  // serum
  serumMarket: PublicKey,
  // user
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userLpTokenAccount: PublicKey,
  userOwner: PublicKey,

  maxCoinAmount: BN,
  maxPcAmount: BN,
  fixedFromCoin: BN
): TransactionInstruction {
  const dataLayout = struct([
    u8("instruction"),
    u64("maxCoinAmount"),
    u64("maxPcAmount"),
    u64("fixedFromCoin"),
  ]);

  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: false },
    { pubkey: ammQuantities, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumMarket, isSigner: false, isWritable: false },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 3,
      maxCoinAmount,
      maxPcAmount,
      fixedFromCoin,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
export function addLiquidityInstructionV4(
  programId: PublicKey,
  // tokenProgramId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  // serum
  serumMarket: PublicKey,
  // user
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userLpTokenAccount: PublicKey,
  userOwner: PublicKey,

  maxCoinAmount: BN,
  maxPcAmount: BN,
  fixedFromCoin: BN
): TransactionInstruction {
  const dataLayout = struct([
    u8("instruction"),
    u64("maxCoinAmount"),
    u64("maxPcAmount"),
    u64("fixedFromCoin"),
  ]);

  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: false },
    { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumMarket, isSigner: false, isWritable: false },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 3,
      maxCoinAmount,
      maxPcAmount,
      fixedFromCoin,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export function removeLiquidityInstruction(
  programId: PublicKey,
  // tokenProgramId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammQuantities: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  poolWithdrawQueue: PublicKey,
  poolTempLpTokenAccount: PublicKey,
  // serum
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  // user
  userLpTokenAccount: PublicKey,
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userOwner: PublicKey,

  amount: BN
): TransactionInstruction {
  const dataLayout = struct([u8("instruction"), u64("amount")]);

  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammQuantities, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolWithdrawQueue, isSigner: false, isWritable: true },
    { pubkey: poolTempLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumProgramId, isSigner: false, isWritable: false },
    { pubkey: serumMarket, isSigner: false, isWritable: true },
    { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 4,
      amount: amount,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
export function removeLiquidityInstructionV4(
  programId: PublicKey,
  // tokenProgramId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  poolWithdrawQueue: PublicKey,
  poolTempLpTokenAccount: PublicKey,
  // serum
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  // user
  userLpTokenAccount: PublicKey,
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userOwner: PublicKey,

  amount: BN
): TransactionInstruction {
  const dataLayout = struct([u8("instruction"), u64("amount")]);

  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolWithdrawQueue, isSigner: false, isWritable: true },
    { pubkey: poolTempLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumProgramId, isSigner: false, isWritable: false },
    { pubkey: serumMarket, isSigner: false, isWritable: true },
    { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 4,
      amount: amount,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export type FarmPoolKeys = {
  readonly id: PublicKey;
  readonly lpMint: PublicKey;
  readonly rewardMints: PublicKey[];
  readonly version: number;
  readonly programId: PublicKey;
  readonly authority: PublicKey;
  readonly lpVault: PublicKey;
  readonly rewardVaults: PublicKey[];
};
export interface FarmUserKeys {
  ledger: PublicKey;
  auxiliaryLedgers?: PublicKey[];
  lpTokenAccount: PublicKey;
  rewardTokenAccounts: PublicKey[];
  owner: PublicKey;
}
export interface FarmDepositInstructionParams {
  poolKeys: FarmPoolKeys;
  userKeys: FarmUserKeys;
  amount: string | number | bigint | BN;
}
export type FarmWithdrawInstructionParams = FarmDepositInstructionParams;
export interface FarmCreateAssociatedLedgerAccountInstructionParams {
  poolKeys: FarmPoolKeys;
  userKeys: {
    ledger: PublicKey;
    owner: PublicKey;
  };
}

export function makeDepositInstruction(params: FarmDepositInstructionParams) {
  const { poolKeys } = params;
  const { version } = poolKeys;

  if (version === 3) {
    return makeDepositInstructionV3(params);
  } else if (version === 5) {
    return makeDepositInstructionV5(params);
  }
  return new Error(`invalid version, poolKeys.version ${version}`);
}

export async function makeDepositInstructionV3({
  poolKeys,
  userKeys,
  amount,
}: FarmDepositInstructionParams) {
  // assert(
  //   poolKeys.rewardVaults.length === 1,
  //   "poolKeys.rewardVaults lengths not equal 1"
  // );
  if (poolKeys.rewardVaults.length !== 1) {
    console.log("poolKeys.rewardVaults lengths not equal 1");
    // return new Error(`"poolKeys.rewardVaults lengths not equal 1"`);
  }
  // assert(
  //   userKeys.rewardTokenAccounts.length === 1,
  //   "userKeys.rewardTokenAccounts lengths not equal 1"
  // );
  if (userKeys.rewardTokenAccounts.length !== 1) {
    console.log("poolKeys.rewardVaults lengths not equal 1");
    // return new Error("poolKeys.rewardVaults lengths not equal 1");
  }

  const LAYOUT = struct([u8("instruction"), u64("amount")]);
  const data = Buffer.alloc(LAYOUT.span);
  LAYOUT.encode(
    {
      instruction: 10,
      // TODO: Check parseBigNumberish
      amount: new BN(String(amount)),
    },
    data
  );

  const keys = [
    { pubkey: poolKeys.id, isWritable: true, isSigner: false },
    { pubkey: poolKeys.authority, isWritable: false, isSigner: false },
    { pubkey: userKeys.ledger, isWritable: true, isSigner: false },
    { pubkey: userKeys.owner, isWritable: false, isSigner: true },
    { pubkey: userKeys.lpTokenAccount, isWritable: true, isSigner: false },
    { pubkey: poolKeys.lpVault, isWritable: true, isSigner: false },
    {
      pubkey: userKeys.rewardTokenAccounts[0],
      isWritable: true,
      isSigner: false,
    },
    { pubkey: poolKeys.rewardVaults[0], isWritable: true, isSigner: false },
    // system
    { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
  ];

  if (userKeys.auxiliaryLedgers) {
    for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
      keys.push({ pubkey: auxiliaryLedger, isWritable: true, isSigner: false });
    }
  }

  return new TransactionInstruction({
    programId: poolKeys.programId,
    keys,
    data,
  });
}

export async function makeDepositInstructionV5({
  poolKeys,
  userKeys,
  amount,
}: FarmDepositInstructionParams) {
  // assert(
  //   userKeys.rewardTokenAccounts.length === poolKeys.rewardVaults.length,
  //   "lengths not equal with poolKeys.rewardVaults userKeys.rewardTokenAccounts"
  // );
  if (userKeys.rewardTokenAccounts.length !== poolKeys.rewardVaults.length) {
    console.log(
      "lengths not equal with poolKeys.rewardVaults userKeys.rewardTokenAccounts"
    );
    // return new Error(
    //   "lengths not equal with poolKeys.rewardVaults userKeys.rewardTokenAccounts"
    // );
  }

  const LAYOUT = struct([u8("instruction"), u64("amount")]);
  const data = Buffer.alloc(LAYOUT.span);
  LAYOUT.encode(
    {
      instruction: 11,
      // amount: parseBigNumberish(amount),
      amount: new BN(String(amount)),
    },
    data
  );

  const keys = [
    { pubkey: poolKeys.id, isWritable: true, isSigner: false },
    { pubkey: poolKeys.authority, isWritable: false, isSigner: false },
    { pubkey: userKeys.ledger, isWritable: true, isSigner: false },
    { pubkey: userKeys.owner, isWritable: false, isSigner: true },
    { pubkey: userKeys.lpTokenAccount, isWritable: true, isSigner: false },
    { pubkey: poolKeys.lpVault, isWritable: true, isSigner: false },
    {
      pubkey: userKeys.rewardTokenAccounts[0],
      isWritable: true,
      isSigner: false,
    },
    { pubkey: poolKeys.rewardVaults[0], isWritable: true, isSigner: false },
    // system
    { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
  ];

  for (let index = 1; index < poolKeys.rewardVaults.length; index++) {
    // keys.push(AccountMeta(userKeys.rewardTokenAccounts[index], false));
    keys.push({
      pubkey: userKeys.rewardTokenAccounts[index],
      isWritable: true,
      isSigner: false,
    });
    // keys.push(AccountMeta(poolKeys.rewardVaults[index], false));
    keys.push({
      pubkey: poolKeys.rewardVaults[index],
      isWritable: true,
      isSigner: false,
    });
  }

  if (userKeys.auxiliaryLedgers) {
    for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
      // keys.push(AccountMeta(auxiliaryLedger, false));
      keys.push({ pubkey: auxiliaryLedger, isWritable: true, isSigner: false });
    }
  }

  return new TransactionInstruction({
    programId: poolKeys.programId,
    keys,
    data,
  });
}

export async function makeWithdrawInstruction(
  params: FarmWithdrawInstructionParams
) {
  const { poolKeys } = params;
  const { version } = poolKeys;

  if (version === 3) {
    return makeWithdrawInstructionV3(params);
  } else if (version === 5) {
    return makeWithdrawInstructionV5(params);
  }

  return new Error(`invalid version, poolKeys.version ${version}`);
}

export async function makeWithdrawInstructionV3({
  poolKeys,
  userKeys,
  amount,
}: FarmWithdrawInstructionParams) {
  // assert(
  //   poolKeys.rewardVaults.length === 1,
  //   "poolKeys.rewardVaults lengths not equal 1"
  // );
  if (poolKeys.rewardVaults.length !== 1) {
    console.log("poolKeys.rewardVaults lengths not equal 1");
    // return new Error("poolKeys.rewardVaults lengths not equal 1");
  }
  // assert(
  //   userKeys.rewardTokenAccounts.length === 1,
  //   "userKeys.rewardTokenAccounts lengths not equal 1"
  // );
  if (userKeys.rewardTokenAccounts.length !== 1) {
    console.log("userKeys.rewardTokenAccounts lengths not equal 1");
    return new Error("userKeys.rewardTokenAccounts lengths not equal 1");
  }

  const LAYOUT = struct([u8("instruction"), u64("amount")]);
  const data = Buffer.alloc(LAYOUT.span);
  LAYOUT.encode(
    {
      instruction: 11,
      // TODO: Check parseBigNumberish
      amount: new BN(String(amount)),
    },
    data
  );

  const keys = [
    // AccountMeta(poolKeys.id, false),
    { pubkey: poolKeys.id, isWritable: true, isSigner: false },
    // AccountMetaReadonly(poolKeys.authority, false),
    { pubkey: poolKeys.authority, isWritable: false, isSigner: false },
    // AccountMeta(userKeys.ledger, false),
    { pubkey: userKeys.ledger, isWritable: true, isSigner: false },
    // AccountMetaReadonly(userKeys.owner, true),
    { pubkey: userKeys.owner, isWritable: false, isSigner: true },
    // AccountMeta(userKeys.lpTokenAccount, false),
    { pubkey: userKeys.lpTokenAccount, isWritable: true, isSigner: false },
    // AccountMeta(poolKeys.lpVault, false),
    { pubkey: poolKeys.lpVault, isWritable: true, isSigner: false },
    // AccountMeta(userKeys.rewardTokenAccounts[0], false),
    {
      pubkey: userKeys.rewardTokenAccounts[0],
      isWritable: true,
      isSigner: false,
    },
    // AccountMeta(poolKeys.rewardVaults[0], false),
    { pubkey: poolKeys.rewardVaults[0], isWritable: true, isSigner: false },
    // system
    // AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
    { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
    // AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
  ];

  if (userKeys.auxiliaryLedgers) {
    for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
      // keys.push(AccountMeta(auxiliaryLedger, false));
      keys.push({ pubkey: auxiliaryLedger, isWritable: true, isSigner: false });
    }
  }

  return new TransactionInstruction({
    programId: poolKeys.programId,
    keys,
    data,
  });
}

export async function makeWithdrawInstructionV5({
  poolKeys,
  userKeys,
  amount,
}: FarmWithdrawInstructionParams) {
  // assert(
  //   userKeys.rewardTokenAccounts.length === poolKeys.rewardVaults.length,
  //   "lengths not equal with poolKeys.rewardVaults userKeys.rewardTokenAccounts"
  // );
  if (userKeys.rewardTokenAccounts.length !== poolKeys.rewardVaults.length) {
    console.log(
      "lengths not equal with poolKeys.rewardVaults userKeys.rewardTokenAccounts"
    );
    // return new Error(
    //   "lengths not equal with poolKeys.rewardVaults userKeys.rewardTokenAccounts"
    // );
  }

  const LAYOUT = struct([u8("instruction"), u64("amount")]);
  const data = Buffer.alloc(LAYOUT.span);
  LAYOUT.encode(
    {
      instruction: 12,
      // amount: parseBigNumberish(amount),
      amount: new BN(String(amount)),
    },
    data
  );

  const keys = [
    // AccountMeta(poolKeys.id, false),
    { pubkey: poolKeys.id, isWritable: true, isSigner: false },
    // AccountMetaReadonly(poolKeys.authority, false),
    { pubkey: poolKeys.authority, isWritable: false, isSigner: false },
    // AccountMeta(userKeys.ledger, false),
    { pubkey: userKeys.ledger, isWritable: true, isSigner: false },
    // AccountMetaReadonly(userKeys.owner, true),
    { pubkey: userKeys.owner, isWritable: false, isSigner: true },
    // AccountMeta(userKeys.lpTokenAccount, false),
    { pubkey: userKeys.lpTokenAccount, isWritable: true, isSigner: false },
    // AccountMeta(poolKeys.lpVault, false),
    { pubkey: poolKeys.lpVault, isWritable: true, isSigner: false },
    // AccountMeta(userKeys.rewardTokenAccounts[0], false),
    {
      pubkey: userKeys.rewardTokenAccounts[0],
      isWritable: true,
      isSigner: false,
    },
    // AccountMeta(poolKeys.rewardVaults[0], false),
    { pubkey: poolKeys.rewardVaults[0], isWritable: true, isSigner: false },
    // system
    // AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
    { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
    // AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
  ];

  for (let index = 1; index < poolKeys.rewardVaults.length; index++) {
    // keys.push(AccountMeta(userKeys.rewardTokenAccounts[index], false));
    keys.push({
      pubkey: userKeys.rewardTokenAccounts[index],
      isWritable: true,
      isSigner: false,
    });
    // keys.push(AccountMeta(poolKeys.rewardVaults[index], false));
    keys.push({
      pubkey: poolKeys.rewardVaults[index],
      isWritable: true,
      isSigner: false,
    });
  }

  if (userKeys.auxiliaryLedgers) {
    for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
      // keys.push(AccountMeta(auxiliaryLedger, false));
      keys.push({ pubkey: auxiliaryLedger, isWritable: true, isSigner: false });
    }
  }

  return new TransactionInstruction({
    programId: poolKeys.programId,
    keys,
    data,
  });
}

/**
 * @deprecated Update to follow Raydium SDK2.0 (2022/3). Use makeDepositInstruction or makeDepositInstructionV3
 */
export function depositInstruction(
  programId: PublicKey,
  // staking pool
  poolId: PublicKey,
  poolAuthority: PublicKey,
  // user
  userInfoAccount: PublicKey,
  userOwner: PublicKey,
  userLpTokenAccount: PublicKey,
  poolLpTokenAccount: PublicKey,
  userRewardTokenAccount: PublicKey,
  poolRewardTokenAccount: PublicKey,
  // tokenProgramId: PublicKey,
  amount: BN
): TransactionInstruction {
  const dataLayout = struct([u8("instruction"), u64("amount")]);

  const keys = [
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userInfoAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 1,
      amount,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
/**
 * @deprecated Update to follow Raydium SDK2.0 (2022/3). Use makeDepositInstruction or makeDepositInstructionV5
 */
export function depositInstructionV4(
  programId: PublicKey,
  // staking pool
  poolId: PublicKey,
  poolAuthority: PublicKey,
  // user
  userInfoAccount: PublicKey,
  userOwner: PublicKey,
  userLpTokenAccount: PublicKey,
  poolLpTokenAccount: PublicKey,
  userRewardTokenAccount: PublicKey,
  poolRewardTokenAccount: PublicKey,
  userRewardTokenAccountB: PublicKey,
  poolRewardTokenAccountB: PublicKey,
  // tokenProgramId: PublicKey,
  amount: BN
): TransactionInstruction {
  const dataLayout = struct([u8("instruction"), u64("amount")]);

  const keys = [
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userInfoAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: userRewardTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: poolRewardTokenAccountB, isSigner: false, isWritable: true },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 1,
      amount,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
/**
 * @deprecated Update to follow Raydium SDK2.0 (2022/3). Use makeWithdrawInstruction or makeWithdrawInstructionV3
 */
export function withdrawInstruction(
  programId: PublicKey,
  // staking pool
  poolId: PublicKey,
  poolAuthority: PublicKey,
  // user
  userInfoAccount: PublicKey,
  userOwner: PublicKey,
  userLpTokenAccount: PublicKey,
  poolLpTokenAccount: PublicKey,
  userRewardTokenAccount: PublicKey,
  poolRewardTokenAccount: PublicKey,
  // tokenProgramId: PublicKey,
  amount: BN
): TransactionInstruction {
  const dataLayout = struct([u8("instruction"), u64("amount")]);

  const keys = [
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userInfoAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 2,
      amount,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
/**
 * @deprecated Update to follow Raydium SDK2.0 (2022/3). Use makeWithdrawInstruction or makeWithdrawInstructionV5
 */
export function withdrawInstructionV4(
  programId: PublicKey,
  // staking pool
  poolId: PublicKey,
  poolAuthority: PublicKey,
  // user
  userInfoAccount: PublicKey,
  userOwner: PublicKey,
  userLpTokenAccount: PublicKey,
  poolLpTokenAccount: PublicKey,
  userRewardTokenAccount: PublicKey,
  poolRewardTokenAccount: PublicKey,
  userRewardTokenAccountB: PublicKey,
  poolRewardTokenAccountB: PublicKey,
  // tokenProgramId: PublicKey,
  amount: BN
): TransactionInstruction {
  const dataLayout = struct([u8("instruction"), u64("amount")]);

  const keys = [
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: poolAuthority, isSigner: false, isWritable: false },
    { pubkey: userInfoAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: userRewardTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: poolRewardTokenAccountB, isSigner: false, isWritable: true },
  ];

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 2,
      amount,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export function makeCreateAssociatedLedgerAccountInstruction(
  params: FarmCreateAssociatedLedgerAccountInstructionParams
) {
  const { poolKeys } = params;
  const { version } = poolKeys;

  if (version === 3) {
    return makeCreateAssociatedLedgerAccountInstructionV3(params);
  } else if (version === 5) {
    return makeCreateAssociatedLedgerAccountInstructionV5(params);
  }

  return new Error(`invalid version, poolKeys.version ${version}`);
}

export function makeCreateAssociatedLedgerAccountInstructionV3({
  poolKeys,
  userKeys,
}: FarmCreateAssociatedLedgerAccountInstructionParams) {
  const LAYOUT = struct([u8("instruction")]);
  const data = Buffer.alloc(LAYOUT.span);
  LAYOUT.encode(
    {
      instruction: 9,
    },
    data
  );

  const keys = [
    { pubkey: poolKeys.id, isSigner: false, isWritable: true },
    { pubkey: userKeys.ledger, isSigner: false, isWritable: true },
    { pubkey: userKeys.owner, isSigner: true, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: poolKeys.programId,
    keys,
    data,
  });
}

export function makeCreateAssociatedLedgerAccountInstructionV5({
  poolKeys,
  userKeys,
}: FarmCreateAssociatedLedgerAccountInstructionParams) {
  const LAYOUT = struct([u8("instruction")]);
  const data = Buffer.alloc(LAYOUT.span);
  LAYOUT.encode(
    {
      instruction: 10,
    },
    data
  );

  const keys = [
    { pubkey: poolKeys.id, isSigner: false, isWritable: true },
    { pubkey: userKeys.ledger, isSigner: false, isWritable: true },
    { pubkey: userKeys.owner, isSigner: true, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: poolKeys.programId,
    keys,
    data,
  });
}