import { PublicKey } from "@solana/web3.js";
import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
// @ts-ignore
import { blob, nu64, seq } from 'buffer-layout';
export const lendProgramId = new PublicKey("FC81tbGt6JWRXidaWYFXxGnTk4VgobhJHATvTRVMqgWj");

export const LendingPoolLayout = struct(
  [
    u8("version"),
    u64("last_updateSlot"),
    u8('last_updateStale'),
    publicKey("lendingMarket"),
    publicKey("liquidityMintPubkey"),
    u8('liquidityMint_decimals'),
    publicKey('liquiditySupplyPubkey'),
    publicKey('liquidityFeeReceiver'),
    blob(36, "oracle"),
    u64('liquidity_available_amount'),
    blob(16, "liquidity_borrowed_amount_wads"),
    blob(16, "liquidity_cumulative_borrowRate_wads"),
    u64( "liquidityMarketPrice"),
    publicKey("shareMintPubkey"),
    u64( "shareMintTotalSupply"),
    publicKey("shareSupplyPubkey"),
    publicKey("creditMintPubkey"),
    u64( "creditMintTotalSupply"),
    publicKey("creditSupplyPubkey"),
    u8("threshold_1"),
    u8("threshold_2"),
    u8("base_1"),
    u16("factor_1"),
    u8("base_2"),
    u16("factor_2"),
    u8("base_3"),
    u16("factor_3"),
    u8("interestReverseRate"),
    u64('accumulated_interestReverse'),
    blob(108, "padding"),
  ]
);

export interface LendInfoItem {
  tokenMint: PublicKey;
  lendingPoolInfoAccount: PublicKey;
  lendingPoolTknAccount: PublicKey;
  lendingPoolFeeAccount: PublicKey;
  lendingPoolShareMint: PublicKey;
  lendingPoolShareAccount: PublicKey;
  lendingPoolCreditMint: PublicKey;
  lendingPoolCreditAccount: PublicKey;
}

export class LendInfo implements LendInfoItem {
  tokenMint: PublicKey;
  lendingPoolInfoAccount: PublicKey;
  lendingPoolTknAccount: PublicKey;
  lendingPoolFeeAccount: PublicKey;
  lendingPoolShareMint: PublicKey;
  lendingPoolShareAccount: PublicKey;
  lendingPoolCreditMint: PublicKey;
  lendingPoolCreditAccount: PublicKey;
  constructor(
    tokenMint: PublicKey,
    lendingPoolInfoAccount: PublicKey,
    lendingPoolTknAccount: PublicKey,
    lendingPoolFeeAccount: PublicKey,
    lendingPoolShareMint: PublicKey,
    lendingPoolShareAccount: PublicKey,
    lendingPoolCreditMint: PublicKey,
    lendingPoolCreditAccount: PublicKey,
  ){
    this.tokenMint = tokenMint;
    this.lendingPoolInfoAccount = lendingPoolInfoAccount;
    this.lendingPoolTknAccount = lendingPoolTknAccount;
    this.lendingPoolFeeAccount = lendingPoolFeeAccount;
    this.lendingPoolShareMint = lendingPoolShareMint;
    this.lendingPoolShareAccount = lendingPoolShareAccount;
    this.lendingPoolCreditMint = lendingPoolCreditMint;
    this.lendingPoolCreditAccount = lendingPoolCreditAccount;

  }
}

export function parseLendingInfo(data:any,infoPubkey:PublicKey){
  let buffer = Buffer.from(data);
  let rawLending = LendingPoolLayout.decode(buffer);
  let {
    version,
    last_updateSlot,
    last_updateStale,
    lendingMarket,
    liquidityMintPubkey,
    liquidityMint_decimals,
    liquiditySupplyPubkey,
    liquidityFeeReceiver,
    oracle,
    liquidity_available_amount,
    liquidity_borrowed_amount_wads,
    liquidity_cumulative_borrowRate_wads,
    liquidityMarketPrice,
    shareMintPubkey,
    shareMintTotalSupply,
    shareSupplyPubkey,
    creditMintPubkey,
    creditMintTotalSupply,
    creditSupplyPubkey,
    } = rawLending;
    return new LendInfo(
      liquidityMintPubkey,
      infoPubkey,
      liquiditySupplyPubkey,
      liquidityFeeReceiver,
      shareMintPubkey,
      shareSupplyPubkey,
      creditMintPubkey,
      creditSupplyPubkey,
    )
}

