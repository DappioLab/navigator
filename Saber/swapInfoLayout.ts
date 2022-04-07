import {
  publicKey,
  struct,
  u64,
  u128,
  u8,
  bool,
  u16,
  i64,
} from "@project-serum/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { wrapInfo } from "./wrapInfo";
import { getTokenAccountAmount, getTokenSupply } from "../util";
import { SWAP_PROGRAM_ID } from "./saberInfo";
import { FarmInfo } from "./farmInfoLayout";
export interface SwapInfoInterface {
  infoPublicKey: PublicKey;
  isInitialized: boolean;
  isPaused: boolean;
  nonce: BN;
  initialAmpFactor: BN;
  targetAmpFactor: BN;
  startRampTs: BN;
  stopRampTs: BN;
  futureAdminDeadline: BN;
  futureAdminKey: PublicKey;
  adminKey: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  AtokenAccountAmount?: BN;
  BtokenAccountAmount?: BN;
  poolMint: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  adminFeeAccountA: PublicKey;
  adminFeeAccountB: PublicKey;
  tradingFee: BN;
  withdrawFee: BN;
}
const DIGIT = new BN(1000000);
const SWAPINFO_LAYOUT = struct([
  bool("isInitialized"),
  bool("isPaused"),
  u8("nonce"),
  u64("initialAmpFactor"),
  u64("targetAmpFactor"),
  i64("startRampTs"),
  i64("stopRampTs"),
  i64("futureAdminDeadline"),
  publicKey("futureAdminKey"),
  publicKey("adminKey"),
  publicKey("tokenAccountA"),
  publicKey("tokenAccountB"),
  publicKey("poolMint"),
  publicKey("mintA"),
  publicKey("mintB"),
  publicKey("adminFeeAccountA"),
  publicKey("adminFeeAccountB"),
  u64("adminTradeFeeNumerator"),
  u64("adminTradeFeeDenominator"),
  u64("adminWithdrawFeeNumerator"),
  u64("adminWithdrawFeeDenominator"),
  u64("tradeFeeNumerator"),
  u64("tradeFeeDenominator"),
  u64("withdrawFeeNumerator"),
  u64("withdrawFeeDenominator"),
]);
export class SwapInfo implements SwapInfoInterface {
  infoPublicKey: PublicKey;
  authority: PublicKey;
  isInitialized: boolean;
  isPaused: boolean;
  nonce: BN;
  initialAmpFactor: BN;
  targetAmpFactor: BN;
  startRampTs: BN;
  stopRampTs: BN;
  futureAdminDeadline: BN;
  futureAdminKey: PublicKey;
  adminKey: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  poolMint: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  adminFeeAccountA: PublicKey;
  adminFeeAccountB: PublicKey;
  tradingFee: BN;
  withdrawFee: BN;
  AtokenAccountAmount?: BN;
  BtokenAccountAmount?: BN;
  LPtokenSupply?: BN;
  mintAWrapped?: boolean;
  mintAWrapInfo?: wrapInfo;
  mintBWrapped?: boolean;
  mintBWrapInfo?: wrapInfo;
  isFarming?: boolean;
  farmingInfo?: FarmInfo;
  constructor(
    infoPublicKey: PublicKey,
    authority: PublicKey,
    isInitialized: boolean,
    isPaused: boolean,
    nonce: BN,
    initialAmpFactor: BN,
    targetAmpFactor: BN,
    startRampTs: BN,
    stopRampTs: BN,
    futureAdminDeadline: BN,
    futureAdminKey: PublicKey,
    adminKey: PublicKey,
    tokenAccountA: PublicKey,
    tokenAccountB: PublicKey,
    poolMint: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
    adminFeeAccountA: PublicKey,
    adminFeeAccountB: PublicKey,
    tradeFeeNumerator: BN,
    tradeFeeDenominator: BN,
    withdrawFeeNumerator: BN,
    withdrawFeeDenominator: BN,
  ) {
    this.infoPublicKey = infoPublicKey;
    this.authority = authority;
    this.isInitialized = isInitialized;
    this.isPaused = isPaused;
    this.nonce = nonce;
    this.initialAmpFactor = initialAmpFactor;
    this.targetAmpFactor = targetAmpFactor;
    this.startRampTs = startRampTs;
    this.stopRampTs = stopRampTs;
    this.futureAdminDeadline = futureAdminDeadline;
    this.futureAdminKey = futureAdminKey;
    this.adminKey = adminKey;
    this.tokenAccountA = tokenAccountA;
    this.tokenAccountB = tokenAccountB;
    this.poolMint = poolMint;
    this.mintA = mintA;
    this.mintB = mintB;
    this.adminFeeAccountA = adminFeeAccountA;
    this.adminFeeAccountB = adminFeeAccountB;
    this.withdrawFee = withdrawFeeNumerator
      .mul(DIGIT)
      .div(withdrawFeeDenominator);
    this.tradingFee = tradeFeeNumerator.mul(DIGIT).div(tradeFeeDenominator);
    console.log(tradeFeeNumerator.toNumber(), tradeFeeDenominator.toNumber());
  }
  async updateAmount(connection: Connection) {
    this.AtokenAccountAmount = await getTokenAccountAmount(
      connection,
      this.tokenAccountA,
    );
    this.BtokenAccountAmount = await getTokenAccountAmount(
      connection,
      this.tokenAccountB,
    );
    this.LPtokenSupply = await getTokenSupply(connection, this.poolMint);
  }
  async calculateDepositRecieve(
    connection: Connection,
    AtokenIn: BN,
    BtokenIN: BN,
  ) {
    if (!this.AtokenAccountAmount) {
      await this.updateAmount(connection);
    }
  }
}

export async function parseSwapInfoData(
  data: any,
  pubkey: PublicKey,
): Promise<SwapInfo> {
  const decodedData = SWAPINFO_LAYOUT.decode(data);
  let authority = (
    await PublicKey.findProgramAddress([pubkey.toBuffer()], SWAP_PROGRAM_ID)
  )[0];
  let {
    isInitialized,
    isPaused,
    nonce,
    initialAmpFactor,
    targetAmpFactor,
    startRampTs,
    stopRampTs,
    futureAdminDeadline,
    futureAdminKey,
    adminKey,
    tokenAccountA,
    tokenAccountB,
    poolMint,
    mintA,
    mintB,
    adminFeeAccountA,
    adminFeeAccountB,
    tradeFeeNumerator,
    tradeFeeDenominator,
    withdrawFeeNumerator,
    withdrawFeeDenominator,
  } = decodedData;
  let swapInfo = new SwapInfo(
    pubkey,
    authority,
    isInitialized,
    isPaused,
    new BN(nonce),
    new BN(initialAmpFactor),
    new BN(targetAmpFactor),
    new BN(startRampTs),
    new BN(stopRampTs),
    futureAdminDeadline,
    futureAdminKey,
    adminKey,
    tokenAccountA,
    tokenAccountB,
    poolMint,
    mintA,
    mintB,
    adminFeeAccountA,
    adminFeeAccountB,
    tradeFeeNumerator,
    tradeFeeDenominator,
    withdrawFeeNumerator,
    withdrawFeeDenominator,
  );
  return swapInfo;
}
