export * from "./ids";
export * from "./infos";

import { RawAccount } from "@solana/spl-token-v2";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IDepositorInfo, IVaultInfo } from "../types";

export interface ValidatorInfo {
  pubkey: PublicKey; // voteAccountAddress in v2
  entry: {
    feeCredit?: BN;
    feeAddress?: PublicKey;
    stakeSeeds: {
      begin: BN;
      end: BN;
    };
    unstakeSeeds: {
      begin: BN;
      end: BN;
    };
    stakeAccountsBalance: BN;
    unstakeAccountsBalance: BN;
    effectiveStakeBalance?: BN;
    active: BN;
  };
}

export interface VaultInfo extends IVaultInfo {
  lidoVersion: BN;
  manager: PublicKey;
  exchangeRate: {
    computedInEpoch: BN;
    stSolSupply: BN;
    solBalance: BN;
  };
  solReserveAuthorityBumpSeed: BN;
  stakeAuthorityBumpSeed: BN;
  mintAuthorityBumpSeed: BN;
  rewardsWithdrawAuthorityBumpSeed?: BN;
  rewardDistribution: {
    treasuryFee: BN;
    validationFee?: BN;
    developerFee: BN;
    stSolAppreciation: BN;
  };
  feeRecipients: {
    treasuryAccount: PublicKey;
    developerAccount: PublicKey;
  };
  metrics: {
    feeTreasurySolTotal: BN;
    feeValidationSolTotal: BN;
    feeDeveloperSolTotal: BN;
    stSolAppreciationTotal: BN;
    feeTreasuryStSolTotal: BN;
    feeValidationStSolTotal: BN;
    feeDeveloperStSolTotal: BN;
    depositAmount: {
      counts: BN[];
      total: BN;
    };
    withdrawAmount: {
      totalStSolAmount: BN;
      totalSolAmount: BN;
      count: BN;
    };
  };
  validatorList?: PublicKey;
  validators: {
    entries: ValidatorInfo[];
    maximumEntries: BN;
  };
  maintainerList?: PublicKey;
  maintainers: {
    entries: {
      pubkey: PublicKey;
    }[];
    maximumEntries: BN;
  };
  maxCommissionPercentage?: BN;
}

export interface DepositorInfo extends IDepositorInfo {
  rawAccount: RawAccount;
}
