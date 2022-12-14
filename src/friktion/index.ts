export * from "./ids";
export * from "./infos";
export * from "./layouts";
import { PublicKey } from "@solana/web3.js";
import { IDepositorInfo, IVaultInfo, IWithdrawerInfo } from "../types";
import BN from "bn.js";

export enum VaultType {
  LongBasis = "LongBasis",
  ShortCrab = "ShortCrab",
  PrincipalProtection = "PrincipalProtection",
  ShortCalls = "ShortCalls",
  ShortPuts = "ShortPuts",
}
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
  epochInfos: EpochInfo[];
  extraData: ExtraVaultInfo;
  snapshotInfo?: SnapshotInfo;
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
  extraDataId: PublicKey;
  isWhitelisted: boolean;
  whitelist: PublicKey;
  isForDao: boolean;
  daoProgramId: PublicKey;
  depositMint: PublicKey;
  targetLeverage: BN;
  targetLeverageLenience: BN;
  exitEarlyRatio: BN;
  entropyProgramId: PublicKey;
  entropyGroup: PublicKey;
  entropyAccount: PublicKey;
  powerPerpMarket: PublicKey;
  haveResolvedDeposits: boolean;
  doneRebalancing: boolean;
  daoAuthority: PublicKey;
  serumProgramId: PublicKey;
  entropyCache: PublicKey;
  hedgingSpotPerpMarket: PublicKey;
  entropyMetadata: PublicKey;
  hedgingSpotMarket: PublicKey;
  auctionMetadata: PublicKey;
  extraKey10: PublicKey;
  extraKey11: PublicKey;
  extraKey12: PublicKey;
  extraKey13: PublicKey;
  extraKey14: PublicKey;
  unusedUintOne: BN;
  maxQuotePosChange: BN;
  targetHedgeLenience: BN;
  unusedUintFour: BN;
  unusedUintFive: BN;
  unusedUintSix: BN;
  unusedUint7: BN;
  unusedUint8: BN;
  unusedUint9: BN;
  useCustomFees: BN;
  performanceFeeBps: BN;
  withdrawalFeeBps: BN;
  turnOffDepositsAndWithdrawals: boolean;
  rebalanceIsReady: boolean;
  dovPerformanceFeesInUnderlyings: boolean;
  doneRebalancingPowerPerp: boolean;
  isHedgingOn: boolean;
  haveTakenPerformanceFees: boolean;
  entropyMetadataInfo?: EntropyMetadata;
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
export interface EntropyMetadata {
  targetHedgeRatio: number;
  rebalancingLenience: number;
  requiredBasisFromOracle: number;
  spotOpenOrders: PublicKey;
  targetCurrBasePosition: number;
  targetCurrQuotePosition: number;
  hedgeLenience: number;
  hedgeWithSpot: boolean;
}
export interface EpochInfo {
  epochId: PublicKey;
  vaultTokenPrice: number;
  pctPnl: number;
  epochNumber: BN;
  underlyingPreEnter: BN;
  underlyingPostSettle: BN;
  voltTokenSupply: BN;
  pnl: BN;
  performanceFees: BN;
  withdrawalFees: BN;
  pendingDeposits: BN;
  pendingWithdrawalsVoltTokens: BN;
  pendingWithdrawals: BN;
  canceledWithdrawals: BN;
  canceledDeposits: BN;
  totalWithdrawals: BN;
  totalDeposits: BN;
  instantDeposits: BN;
  instantWithdrawals: BN;
  mintedOptions: BN;
  enterNumTimesCalled: BN;
  startRoundTime: BN;
  beginAuctionTime: BN;
  endAuctionTime: BN;
}

export interface SnapshotInfo {
  globalId: string;
  voltVaultId: string;
  apy: number;
  tvlDepositToken: number;
  weeklyPy: number;
  monthlyPy: number;
  apr: number;
  shareTokenPrice: number;
  apyAfterFees: number;
  performanceFeeRate: number;
  withdrawalFeeRate: number;
  nextAutocompoundingTime: number;
  lastTradedOption: string;
}
