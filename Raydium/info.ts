import { PublicKey } from "@solana/web3.js";
import { publicKey, u8, u64, u128 } from "@project-serum/borsh";
//@ts-ignore
import { blob, seq, struct } from "buffer-layout";

// Deprecated name below, already not in Raydium SDK
export const LIQUIDITY_POOL_PROGRAM_ID_V3 = new PublicKey(
  "27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv"
);
// Deprecated name below, new one is LIQUIDITY_PROGRAM_ID_V4
export const LIQUIDITY_POOL_PROGRAM_ID_V4 = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);
// New Liquidity pool from 2022/3
export const LIQUIDITY_PROGRAM_ID_V5 = new PublicKey(
  "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h"
);
// Deprecated name below, new one is FARM_PROGRAM_ID_V3
export const STAKE_PROGRAM_ID = new PublicKey(
  "EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q"
);
// Deprecated name below, new one is FARM_PROGRAM_ID_V5
export const STAKE_PROGRAM_ID_V5 = new PublicKey(
  "9KEPoZmtHUrBbhWN1v1KWLMkkvwY6WLtAVUCPRtRjP4z"
);
export const AMM_AUTHORITY = new PublicKey(
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
);

// For summarized lp & farm info, refer to Raydium of SDK
// https://github.com/raydium-io/raydium-sdk

/* ================= state layouts ================= */

// Legacy name: STAKE_INFO_LAYOUT
export const FARM_STATE_LAYOUT_V3 = struct([
  u64("state"),
  u64("nonce"),
  publicKey("lpVault"),
  seq(publicKey(), 1, "rewardVaults"),
  publicKey("owner"), // name name defined by dappio
  publicKey("feeOwner"), // name name defined by dappio
  u64("feeY"), // name name defined by dappio
  u64("feeX"), // name name defined by dappio
  seq(u64(), 1, "totalRewards"),
  seq(u128(), 1, "perShareRewards"),
  u64("lastSlot"),
  seq(u64(), 1, "perSlotRewards"),
]);

// Legacy name: STAKE_INFO_LAYOUT_V4
export const REAL_FARM_STATE_LAYOUT_V5 = struct([
  u64("state"),
  u64("nonce"),
  publicKey("lpVault"),
  publicKey("rewardVaultA"),
  u64("totalRewardA"),
  u128("perShareRewardA"),
  u64("perSlotRewardA"),
  u8("option"),
  publicKey("rewardVaultB"),
  blob(7),
  u64("totalRewardB"),
  u128("perShareRewardB"),
  u64("perSlotRewardB"),
  u64("lastSlot"),
  publicKey("owner"), // name name defined by dappio
]);

/* ================= ledger layouts ================= */

// Legacy name:  USER_STAKE_INFO_ACCOUNT_LAYOUT
export const FARM_LEDGER_LAYOUT_V3_1 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u64(), 1, "rewardDebts"),
]);

// Legacy name: USER_STAKE_INFO_ACCOUNT_LAYOUT_V3_1
export const FARM_LEDGER_LAYOUT_V3_2 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u128(), 1, "rewardDebts"),
  seq(u64(), 17),
]);

// Legacy name: USER_STAKE_INFO_ACCOUNT_LAYOUT_V4
export const FARM_LEDGER_LAYOUT_V5_1 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u64(), 2, "rewardDebts"),
]);
// Legacy name: USER_STAKE_INFO_ACCOUNT_LAYOUT_V5
export const FARM_LEDGER_LAYOUT_V5_2 = struct([
  u64("state"),
  publicKey("id"),
  publicKey("owner"),
  u64("deposited"),
  seq(u128(), 2, "rewardDebts"),
  seq(u64(), 17),
]);
