import { publicKey, struct, u64, u8, u32 } from "@project-serum/borsh";

export const MARINADE_FINANCE_ACCOUNT_STATE = struct(
  [
    publicKey("msolMint"),
    publicKey("adminAuthority"),
    publicKey("operationalSolAccount"),
    publicKey("treasuryMsolAccount"),
    u8("reserveBumpSeed"),
    u8("msolMintAuthorityBumpSeed"),
    u64("rentExemptForTokenAcc"),
    struct([u32("basisPoints")], "rewardFee"),
    struct(
      [
        struct(
          [publicKey("account"), u32("itemSize"), u32("count"), publicKey("newAccount"), u32("copiedCount")],
          "stakeList"
        ),
        u64("delayedUnstakeCoolingDown"),
        u8("stakeDepositBumpSeed"),
        u8("stakeWithdrawBumpSeed"),
        u64("slotsForStakeDelta"),
        u64("lastStakeDeltaEpoch"),
        u64("minStake"),
        u32("extraStakeDeltaRuns"),
      ],
      "stakeSystem"
    ),
    struct(
      [
        struct(
          [[publicKey("account"), u32("itemSize"), u32("count"), publicKey("newAccount"), u32("copiedCount")]],
          "validatorList"
        ),
        publicKey("managerAuthority"),
        u32("totalValidatorScore"),
        u64("totalActiveBalance"),
        u8("autoAddValidatorEnabled"),
      ],
      "validatorSystem"
    ),
    struct(
      [
        publicKey("lpMint"),
        u8("lpMintAuthorityBumpSeed"),
        u8("solLegBumpSeed"),
        u8("msolLegAuthorityBumpSeed"),
        publicKey("msolLeg"),
        u64("lpLiquidityTarget"),
        struct([u32("basisPoints")], "lpMaxFee"),
        struct([u32("basisPoints")], "lpMinFee"),
        struct([u32("basisPoints")], "treasuryCut"),
        u64("lpSupply"),
        u64("lentFromSolLeg"),
        u64("liquiditySolCap"),
      ],
      "liqPool"
    ),
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
  [publicKey("stateAddress"), publicKey("beneficiary"), u64("lamportsAmount"), u64("createdEpoch")],
  "TicketAccountData"
);
