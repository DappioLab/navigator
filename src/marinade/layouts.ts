import { publicKey, struct, u64, u8, u32 } from "@project-serum/borsh";
// @ts-ignore
import { blob } from "buffer-layout";

const FEE_LAYOUT = [u32("basisPoints")];

const LIST_LAYOUT = [publicKey("account"), u32("itemSize"), u32("count"), publicKey("newAccount"), u32("copiedCount")];

const STAKE_SYSTEM_LAYOUT = [
  struct(LIST_LAYOUT, "stakeList"),
  u32("delayedUnstakeCoolingDown"),
  u8("stakeDepositBumpSeed"),
  u8("stakeWithdrawBumpSeed"),
  u32("slotsForStakeDelta"),
  u32("lastStakeDeltaEpoch"),
  u32("minStake"),
  u32("extraStakeDeltaRuns"),
];
const VALIDATOR_SYSTEM_LAYOUT = [
  struct(LIST_LAYOUT, "validatorList"),
  publicKey("managerAuthority"),
  u32("totalValidatorScore"),
  u64("totalActiveBalance"),
  u8("autoAddValidatorEnabled"),
];

const LIQ_POOL_LAYOUT = [
  publicKey("lpMint"),
  u8("lpMintAuthorityBumpSeed"),
  u8("solLegBumpSeed"),
  u8("msolLegAuthorityBumpSeed"),
  publicKey("msolLeg"),
  u64("lpLiquidityTarget"),
  struct(FEE_LAYOUT, "lpMaxFee"),
  struct(FEE_LAYOUT, "lpMinFee"),
  struct(FEE_LAYOUT, "treasuryCut"),
  u64("lpSupply"),
  u64("lentFromSolLeg"),
  u64("liquiditySolCap"),
];

export const MARINADE_FINANCE_ACCOUNT_STATE = struct(
  [
    blob(8, "identifier"),
    publicKey("msolMint"),
    publicKey("adminAuthority"),
    publicKey("operationalSolAccount"),
    publicKey("treasuryMsolAccount"),
    u8("reserveBumpSeed"),
    u8("msolMintAuthorityBumpSeed"),
    u64("rentExemptForTokenAcc"),
    struct(FEE_LAYOUT, "rewardFee"),
    struct(STAKE_SYSTEM_LAYOUT, "stakeSystem"),
    struct(VALIDATOR_SYSTEM_LAYOUT, "validatorSystem"),
    struct(LIQ_POOL_LAYOUT, "liqPool"),
    u64("availableReserveBalance"),
    u64("msolSupply"),
    u64("msolPrice"),
    u64("circulatingTicketCount"),
    u64("circulatingTicketBalance"),
    u64("lentFromReserve"),
    u64("minDeposit"),
    u64("minWithdraw"),
    u64("stakingSolCap"),
    u64("emergencyCoolingDown"),
  ],
  "State"
);

export const MARINADE_FINANCE_ACCOUNT_TICKET_ACCOUNT_DATA = struct(
  [
    blob(8, "identifier"),
    publicKey("stateAddress"),
    publicKey("beneficiary"),
    u64("lamportsAmount"),
    u64("createdEpoch"),
  ],
  "TicketAccountData"
);
