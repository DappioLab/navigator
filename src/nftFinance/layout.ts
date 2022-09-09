import { publicKey, struct, u64, array, u8, vec } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

export const RARITY_LAYOUT = struct([
  u64("discriminator"),
  publicKey("adminKey"), // admin
  array(u8(), 16, "collection"),
  array(u8(), 16, "rarity"),
  vec(publicKey(), "mintList"),
]);

export const POOL_LAYOUT = struct([
  u64("discriminator"),
  publicKey("adminKey"), // admin
  publicKey("proveTokenAuthority"),
  publicKey("proveTokenTreasury"), // proveTokenVault
  publicKey("proveTokenMint"),
  publicKey("rarityId"), // rarityInfo
  u64("mintListLength"),
  u64("totalStakedAmount"), // totalLocked
]);

export const NFT_LOCKER_LAYOUT = struct([
  u64("discriminator"),
  publicKey("userKey"), // user
  publicKey("poolId"), // poolInfo
  publicKey("nftMint"),
]);

export const FARM_LAYOUT = struct([
  u64("discriminator"),
  publicKey("adminKey"), // admin
  publicKey("proveTokenMint"),
  publicKey("rewardTokenMint"),
  publicKey("farmTokenMint"),
  publicKey("rewardTreasury"), // rewardVault
  publicKey("farmAuthority"),
  u8("farmAuthorityBump"),
  u64("rewardTokenPerSlot"),
  u64("totalProveTokenDeposited"),
]);

export const FARMER_LAYOUT = struct([
  u64("discriminator"),
  publicKey("userKey"), // owner
  publicKey("farmId"), // farmInfo
  publicKey("proveTokenAta"), // minerVault
  u64("lastUpdateSlot"),
  u64("unclaimedAmount"),
  u64("depositedAmount"),
  u8("farmerBump"), // minerBump
]);
