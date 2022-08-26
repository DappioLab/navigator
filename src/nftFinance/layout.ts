import { publicKey, struct, u64, u128, u8, bool } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

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
