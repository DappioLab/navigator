export * from "./ids";
export * from "./layouts";
import BN from "bn.js";

import { IDepositorInfo, IVaultInfo } from "../types";
import { PublicKey } from "@solana/web3.js";

interface Fee {
  basisPoints: number;
}

interface List {
  account: PublicKey;
  itemSize: number;
  count: number;
  newAccount: PublicKey;
  copiedCount: number;
}

interface StakeSystem {
  stakeList: List;
  delayedUnstakeCoolingDown: number;
  stakeDepositBumpSeed: number;
  stakeWithdrawBumpSeed: number;
  slotsForStakeDelta: number;
  lastStakeDeltaEpoch: number;
  minStake: number;
  extraStakeDeltaRuns: number;
}

interface ValidatorSystem {
  validatorList: List;
  managerAuthority: PublicKey;
  totalValidatorScore: number;
  totalActiveBalance: BN;
  autoAddValidatorEnabled: number;
}

interface LiqPool {
  lpMint: PublicKey;
  lpMintAuthorityBumpSeed: number;
  solLegBumpSeed: number;
  msolLegAuthorityBumpSeed: number;
  msolLeg: PublicKey;
  lpLiquidityTarget: BN;
  lpMaxFee: Fee;
  lpMinFee: Fee;
  treasuryCut: Fee;
  lpSupply: BN;
  lentFromSolLeg: BN;
  liquiditySolCap: BN;
}

export interface VaultInfo extends IVaultInfo {
  msolMint: PublicKey;
  adminAuthority: PublicKey;
  operationalSolAccount: PublicKey;
  treasuryMsolAccount: PublicKey;
  reserveBumpSeed: number;
  msolMintAuthorityBumpSeed: number;
  rentExemptForTokenAcc: BN;

  rewardFee: Fee;
  stakeSystem: StakeSystem;
  validatorSystem: ValidatorSystem;
  liqPool: LiqPool;

  availableReserveBalance: BN;
  msolSupply: BN;
  msolPrice: BN;
  circulatingTicketCount: BN;
  circulatingTicketBalance: BN;
  lentFromReserve: BN;
  minDeposit: BN;
  minWithdraw: BN;
  stakingSolCap: BN;
  emergencyCoolingDown: BN;
}

export interface TickerAccountData {
  stateAddress: PublicKey;
  beneficiary: PublicKey;
  lamportsAmount: BN;
  createdEpoch: BN;
}

export interface DepositorInfo extends IDepositorInfo {
  mint: PublicKey;
  amount: BN;
}
