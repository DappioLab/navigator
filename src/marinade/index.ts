export * from "./ids";
// export * from "./infos";
export * from "./layouts";
import BN from "bn.js";

import { IDepositorInfo, IInstanceVault, IVaultInfo } from "../types";
import { PublicKey } from "@solana/web3.js";

interface Fee {
  basisPoints: BN;
}

interface List {
  account: PublicKey;
  itemSize: BN;
  count: BN;
  newAccount: PublicKey;
  copiedCount: BN;
}

interface StakeSystem {
  stakeList: List;
  delayedUnstakeCoolingDown: BN;
  stakeDepositBumpSeed: BN;
  stakeWithdrawBumpSeed: BN;
  slotsForStakeDelta: BN;
  lastStakeDeltaEpoch: BN;
  minStake: BN;
  extraStakeDeltaRuns: BN;
}

interface ValidatorSystem {
  validatorList: List;
  managerAuthority: PublicKey;
  totalValidatorScore: BN;
  totalActiveBalance: BN;
  autoAddValidatorEnabled: BN;
}

interface LiqPool {
  lpMint: PublicKey;
  lpMintAuthorityBumpSeed: BN;
  solLegBumpSeed: BN;
  msolLegAuthorityBumpSeed: BN;
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
  reserveBumpSeed: BN;
  msolMintAuthorityBumpSeed: BN;
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
