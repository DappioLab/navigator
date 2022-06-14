import { PublicKey } from "@solana/web3.js";

export interface IPoolInfo {
  poolId: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  lpMint: PublicKey;
}

// TODO
export interface IFarmInfo {
  farmId: PublicKey;
}

export interface IFarmerInfo {
  farmerId: PublicKey;
  farmId: PublicKey;
  userKey: PublicKey;
  amount: number;
}
