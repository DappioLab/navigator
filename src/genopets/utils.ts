import { PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { GENOPETS_FARM_PROGRAM_ID } from "./ids";

export function getFarmerInstanceKey(userKey: PublicKey, nonce: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("staking-deposit"), userKey.toBuffer(), new BN(nonce).toArrayLike(Buffer, `le`, 4)],
    GENOPETS_FARM_PROGRAM_ID
  )[0];
}

export function getFarmId(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake-pool-seed"), mint.toBuffer()],
    GENOPETS_FARM_PROGRAM_ID
  )[0];
}
