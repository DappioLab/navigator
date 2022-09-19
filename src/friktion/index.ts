export * from "./ids";
export * from "./infos";
export * from "./layouts";
import { PublicKey } from "@solana/web3.js";
import { IDepositorInfo, IVaultInfo, IWithdrawerInfo } from "../types";
import BN from "bn.js";
export interface VaultInfo extends IVaultInfo {
  // vaultId
  admin: PublicKey;
  seed: PublicKey;
  transferWindow: BN;
  startTransferTime: BN;
  endTransferTime: BN;
  initialized: boolean;
  currOptionWasSettled: boolean;
  mustSwapPremiumToUnderlying: boolean;
  nextOptionWasSet: boolean;
  firstEverOptionWasSet: boolean;
  instantTransfersEnabled: boolean;
  prepareIsFinished: boolean;
  enterIsFinished: boolean;
  roundHasStarted: boolean;
  roundNumber: BN;
  totalUnderlyingPreEnter: BN;
  totalUnderlyingPostSettle: BN;
  totalVoltTokensPostSettle: BN;
  vaultAuthority: PublicKey;
  depositPool: PublicKey;
  premiumPool: PublicKey;
  optionPool: PublicKey;
  writerTokenPool: PublicKey;
  vaultMint: PublicKey; // shareMint
  underlyingAssetMint: PublicKey;
  quoteAssetMint: PublicKey;
  optionMint: PublicKey;
  writerTokenMint: PublicKey;
  optionMarket: PublicKey;
  vaultType: BN;
  underlyingAmountPerContract: BN;
  quoteAmountPerContract: BN;
  expirationUnixTimestamp: BN;
  expirationInterval: BN;
  upperBoundOtmStrikeFactor: BN;
  haveTakenWithdrawalFees: boolean;
  serumSpotMarket: PublicKey;
  openOrdersBump: number;
  openOrdersInitBump: number;
  ulOpenOrdersBump: number;
  ulOpenOrders: PublicKey;
  ulOpenOrdersInitialized: boolean;
  bumpAuthority: number;
  serumOrderSizeOptions: BN;
  individualCapacity: BN;
  serumOrderType: BN;
  serumLimit: number;
  serumSelfTradeBehavior: number;
  serumClientOrderId: BN;
  whitelistTokenMint: PublicKey;
  permissionedMarketPremiumMint: PublicKey;
  permissionedMarketPremiumPool: PublicKey;
  capacity: BN;
  roundInfos: RoundInfo[];
}

export interface DepositorInfo extends IDepositorInfo {
  // depositorId
  // userKey
  initialized: boolean;
  roundNumber: BN;
  amount: BN;
}

export interface withdrawerInfo extends IWithdrawerInfo {
  // withdrawerId
  // userKey
  initialized: boolean;
  roundNumber: BN;
  amount: BN;
}
export interface ExtraVaultInfo {
  vaultId: PublicKey;
  isWhitelisted: boolean;
  whitelist: PublicKey;
  isForDao: boolean;
  daoProgramId: PublicKey;
  depositMint: PublicKey;
  targetLeverage: BN;
  targetLeverageLenience: BN;
}

export interface RoundInfo {
  roundId: PublicKey;
  roundNumber: BN;
  underlyingFromPendingDeposits: BN;
  voltTokensFromPendingWithdrawals: BN;
  underlyingPreEnter: BN;
  underlyingPostSettle: BN;
  premiumFarmed: BN;
}
