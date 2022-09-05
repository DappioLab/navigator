import { publicKey, struct, u64, array, u8, vec } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

export const RARITY_LAYOUT = struct([
  u64("discriminator"),
  publicKey("admin"),
  array(u8(), 16, "collection"),
  array(u8(), 16, "rarity"),
  vec(publicKey(), "mintList"),
]);

export const POOL_LAYOUT = struct([
  u64("discriminator"),
  publicKey("admin"),
  publicKey("proveTokenAuthority"),
  publicKey("proveTokenVault"),
  publicKey("proveTokenMint"),
  publicKey("rarityInfo"),
  u64("mintListLength"),
  u64("totalLocked"),
]);

export const FARM_LAYOUT = struct([
  u64("discriminator"),
  publicKey("admin"),
  publicKey("proveTokenMint"),
  publicKey("rewardTokenMint"),
  publicKey("farmTokenMint"),
  publicKey("rewardVault"),
  publicKey("farmAuthority"),
  u8("farmAuthorityBump"),
  u64("rewardTokenPerSlot"),
  u64("totalProveTokenDeposited"),
]);
