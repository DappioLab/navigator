export * from "./ids";
export * from "./infos";

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IDepositorInfo, IVaultInfo } from "../types";

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
  rewardsWithdrawAuthorityBumpSeed: BN;
  rewardDistribution: {
    treasuryFee: BN;
    validationFee: BN;
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
  validators: {
    entries: {
      pubkey: PublicKey;
      entry: {
        feeCredit: BN;
        feeAddress: PublicKey;
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
        active: BN;
      };
    }[];
    maximumEntries: BN;
  };
  maintainers: {
    entries: {
      pubkey: PublicKey;
    }[];
    maximumEntries: BN;
  };
}

export interface DepositorInfo extends IDepositorInfo {
  mint: PublicKey;
  amount: BN;
}
