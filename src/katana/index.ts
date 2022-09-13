export * from "./ids";
export * from "./infos";
export * from "./layouts";
import BN from "bn.js";
import { IDepositorInfo, IInstanceVault, IVaultInfo } from "../types";
import { PublicKey } from "@solana/web3.js";

export enum VaultType {
  putSell,
  coverCall,
}
export interface VaultInfo extends IVaultInfo {
  // vaultId
  // shareMint (equivalent to derivativeTokenMint)
  type: VaultType;
  admin: PublicKey;
  pendingAdmin: PublicKey;
  vaultAuthority: PublicKey;
  cap: BN;
  lockedAmount: BN;
  lastLockedAmount: BN;
  totalPendingDeposits: BN;
  queuedWithdrawShares: BN;
  totalShares: BN;
  round: BN;
  underlyingTokenMint: PublicKey;
  quoteTokenMint: PublicKey;
  optionTokenMint: PublicKey;
  nextOptionTokenMint: PublicKey;
  nextOptionTokenVault: PublicKey;
  writerTokenMint: PublicKey;
  nextWriterTokenMint: PublicKey;
  nextWriterTokenVault: PublicKey;
  derivativeTokenMint: PublicKey;
  earlyAccessTokenMint: PublicKey;
  underlyingTokenVault: PublicKey;
  quoteTokenVault: PublicKey;
  optionTokenVault: PublicKey;
  writerTokenVault: PublicKey;
  derivativeTokenVault: PublicKey;
  openOrders: PublicKey;
  decimals: BN;
  bump: BN;
  authorityBump: BN;
  derivativeMintBump: BN;
  vaultBumpsUnderlying: BN;
  vaultBumpsQuote: BN;
  vaultBumpsOption: BN;
  vaultBumpsWriter: BN;
  vaultBumpsDerivative: BN;
  pendingvaultBumpsOption: BN;
  pendingvaultBumpsWriter: BN;
  isPaused: boolean;
  onlyEarlyAccess: boolean;
  programId: PublicKey;
  optionPram?: OptionParameters;
  identifier?: PublicKey;
}

export interface DepositorInfo extends IDepositorInfo {
  // depositorId
  // userKey
  PendingDepositDataRound: BN;
  PendingDepositDataAmount: BN;
  PendingDepositDataUnredeemedShares: BN;
  PendingWithdrawDataRound: BN;
  PendingWithdrawDatShares: BN;
  bump: BN;
}

export interface OtcTermInfo {
  otcTermId: PublicKey;
  round: BN;
  totalPrice: BN;
  tokenMintToBuy: PublicKey;
  tokenMintToSell: PublicKey;
  bump: BN;
}

export interface PricePerSharePageInfo {
  infoPubkey: PublicKey;
  page: BN;
  bump: BN;
  prices: BN[];
}
export interface OptionMarketInfo {
  optionMarketId: PublicKey;
  optionMint: PublicKey;
  writerTokenMint: PublicKey;
  underlyingAssetMint: PublicKey;
  quoteAssetMint: PublicKey;
  underlyingAmountPerContract: BN;
  quoteAmountPerContract: BN;
  expirationUnixTimestamp: BN;
  underlyingAssetPool: PublicKey;
  quoteAssetPool: PublicKey;
  mintFeeAccount: PublicKey;
  exerciseFeeAccount: PublicKey;
  expired: boolean;
  bumpSeed: BN;
}

export interface OptionParameters {
  infoPubkey: PublicKey;
  vault: PublicKey;
  expiry: BN;
  strike: BN;
}
