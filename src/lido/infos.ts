import { PublicKey, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token-v2";
import axios from "axios";
import BN from "bn.js";
import { IInstanceVault, IVaultInfoWrapper } from "../types";
import { getMultipleAccounts } from "../utils";
import { LIDO_ADDRESS, LIDO_PROGRAM_ID, ST_SOL_MINT_ADDRESS } from "./ids";
import {
  LIDO_LAYOUT_V1,
  LIDO_LAYOUT_V2,
  LIDO_VERSION_CHECK_LAYOUT,
  MAINTAINER_LIST_ACCOUNT_LAYOUT,
  VALIDATOR_LIST_ACCOUNT_LAYOUT,
} from "./layout";
import * as types from ".";

let infos: IInstanceVault;

infos = class InstanceLido {
  static async getAllVaults(connection: Connection): Promise<types.VaultInfo[]> {
    const vault = await this.getVault(connection, LIDO_ADDRESS);

    return [vault];
  }

  static async getAllVaultWrappers(connection: Connection): Promise<VaultInfoWrapper[]> {
    return (await this.getAllVaults(connection)).map((vault) => new VaultInfoWrapper(vault));
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    if (!vaultId.equals(LIDO_ADDRESS)) throw Error(`Error: Lido vaultId must match ${LIDO_ADDRESS.toBase58()}`);

    const vaultAccountInfo = await connection.getAccountInfo(vaultId);
    if (!vaultAccountInfo) throw Error("Error: Cannot get solido account");

    let vault: types.VaultInfo = this.parseVault(vaultAccountInfo.data, vaultId);

    // Fetch validators and maintainers if using Solido v2
    // Both validatorList and maintainerList will always be present in Solido v2
    if (vault.validatorList && vault.maintainerList) {
      const [validator, maintainer] = await getMultipleAccounts(connection, [
        vault.validatorList,
        vault.maintainerList,
      ]);

      if (!validator.account) throw Error("Error: Cannot get validator list account");
      vault.validators = this._parseValidatorListAccount(validator.account.data);

      if (!maintainer.account) throw Error("Error: Cannot get maintainer list account");
      vault.maintainers = this._parseMaintainerListAccount(maintainer.account.data);
    }

    return vault;
  }

  static parseVault(data: Buffer, vaultId: PublicKey): types.VaultInfo {
    let vault: types.VaultInfo;
    if (this._checkLidoV2(data)) {
      const decodeData = LIDO_LAYOUT_V2.decode(data);
      const {
        lidoVersion,
        manager,
        stSolMint,
        exchangeRate,
        solReserveAuthorityBumpSeed,
        stakeAuthorityBumpSeed,
        mintAuthorityBumpSeed,
        rewardDistribution,
        feeRecipients,
        metrics,
        validatorList,
        maintainerList,
        maxCommissionPercentage,
      } = decodeData;

      vault = {
        vaultId,
        lidoVersion,
        manager,
        shareMint: stSolMint,
        exchangeRate,
        solReserveAuthorityBumpSeed,
        stakeAuthorityBumpSeed,
        mintAuthorityBumpSeed,
        rewardDistribution,
        feeRecipients,
        metrics,
        validatorList,
        maintainerList,
        maxCommissionPercentage,
      };
    } else {
      const decodeData = LIDO_LAYOUT_V1.decode(data);
      const {
        lidoVersion,
        manager,
        stSolMint,
        exchangeRate,
        solReserveAuthorityBumpSeed,
        stakeAuthorityBumpSeed,
        mintAuthorityBumpSeed,
        rewardsWithdrawAuthorityBumpSeed,
        rewardDistribution,
        feeRecipients,
        metrics,
        validators,
        maintainers,
      } = decodeData;
      vault = {
        vaultId,
        lidoVersion,
        manager,
        shareMint: stSolMint,
        exchangeRate,
        solReserveAuthorityBumpSeed,
        stakeAuthorityBumpSeed,
        mintAuthorityBumpSeed,
        rewardsWithdrawAuthorityBumpSeed,
        rewardDistribution,
        feeRecipients,
        metrics,
        validators,
        maintainers,
      };
    }

    // Ensure the mint matches
    if (!this._isAllowed(vault.shareMint)) {
      throw Error("Error: Not a stSOL token account");
    }

    return vault;
  }

  static async getAllDepositors(connection: Connection, userKey: PublicKey): Promise<types.DepositorInfo[]> {
    const { value: accountInfos } = await connection.getTokenAccountsByOwner(userKey, {
      mint: ST_SOL_MINT_ADDRESS,
    });
    const depositors = accountInfos.map((depositor) => this.parseDepositor(depositor.account.data, depositor.pubkey));
    return depositors;
  }

  static async getDepositor(connection: Connection, depositorId: PublicKey): Promise<types.DepositorInfo> {
    const depositorAccountInfo = await connection.getAccountInfo(depositorId);
    if (!depositorAccountInfo) throw Error("Error: Cannot get depositor account");

    return this.parseDepositor(depositorAccountInfo.data, depositorId);
  }

  static getDepositorId(_vaultId: PublicKey, userKey: PublicKey, _programId: PublicKey = LIDO_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [userKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), ST_SOL_MINT_ADDRESS.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }

  static parseDepositor(data: Buffer, depositorId: PublicKey): types.DepositorInfo {
    const rawAccount = AccountLayout.decode(data);
    const { mint, owner } = rawAccount;
    // Ensure the mint matches
    if (!this._isAllowed(mint)) {
      throw Error(`Error: Not a stSOL token account`);
    }

    return {
      depositorId,
      userKey: owner,
      tokenAccount: rawAccount,
    };
  }

  private static _parseValidatorListAccount(data: Buffer): types.ValidatorAccountInfo {
    const decodeData = VALIDATOR_LIST_ACCOUNT_LAYOUT.decode(data);
    const { accountType, lidoVersion, maxEntries, entries } = decodeData;
    if (accountType !== 2 || lidoVersion !== 1) throw Error("Error: Invalid Validator list account");

    interface validatorEntry {
      voteAccountAddress: PublicKey;
      stakeSeeds: { begin: BN; end: BN };
      unstakeSeeds: { begin: BN; end: BN };
      stakeAccountsBalance: BN;
      unstakeAccountsBalance: BN;
      effectiveAccountsBalance: BN;
      active: BN;
    }

    const validator_entries: types.ValidatorInfo[] = (entries as validatorEntry[]).map(
      ({
        voteAccountAddress,
        stakeSeeds,
        unstakeSeeds,
        stakeAccountsBalance,
        unstakeAccountsBalance,
        effectiveAccountsBalance,
        active,
      }) => {
        return {
          pubkey: voteAccountAddress,
          entry: {
            stakeSeeds,
            unstakeSeeds,
            stakeAccountsBalance,
            unstakeAccountsBalance,
            effectiveAccountsBalance,
            active,
          },
        };
      }
    );

    return {
      entries: validator_entries,
      maximumEntries: maxEntries,
    };
  }

  private static _parseMaintainerListAccount(data: Buffer): types.MaintainerAccountInfo {
    const decodeData = MAINTAINER_LIST_ACCOUNT_LAYOUT.decode(data);
    const { accountType, lidoVersion, maxEntries, entries } = decodeData;
    if (accountType !== 3 || lidoVersion !== 1) throw Error("Error: Invalid Maintainer list account");

    return {
      entries,
      maximumEntries: maxEntries,
    };
  }

  private static _checkLidoV2(data: Buffer): boolean {
    const { maybeAccountType, maybeLidoVersion } = LIDO_VERSION_CHECK_LAYOUT.decode(data);
    return maybeAccountType === 1 && maybeLidoVersion === 1;
  }

  private static _isAllowed(mint: PublicKey): boolean {
    return mint.equals(ST_SOL_MINT_ADDRESS);
  }
};

export { infos };

export class VaultInfoWrapper implements IVaultInfoWrapper {
  constructor(public vaultInfo: types.VaultInfo) {}

  // See: https://github.com/lidofinance/solido-sdk/blob/main/src/api/stakeApy.ts
  static DEFAULT_APY = "5.74";
  static SOL_API_HOST = "https://sol-api-pub.lido.fi";

  getVersion(): number {
    const version = Number(this.vaultInfo.lidoVersion) + 1;
    return version;
  }

  static async getApy(): Promise<string> {
    const apy: number = await axios.get(`${VaultInfoWrapper.SOL_API_HOST}/v1/apy?since_launch`).then((res) => {
      return res.data.data.apy;
    });

    if (apy) {
      return apy.toFixed(2);
    }
    return VaultInfoWrapper.DEFAULT_APY;
  }

  getHeaviestValidator(): types.ValidatorInfo {
    const validatorEntries = this.vaultInfo.validators!.entries;
    const sortedValidatorEntries = validatorEntries.sort(({ entry: validatorA }, { entry: validatorB }) => {
      const effectiveStakeBalanceValidatorA =
        Number(validatorA.stakeAccountsBalance) - Number(validatorA.unstakeAccountsBalance);
      const effectiveStakeBalanceValidatorB =
        Number(validatorB.stakeAccountsBalance) - Number(validatorB.unstakeAccountsBalance);

      return effectiveStakeBalanceValidatorB - effectiveStakeBalanceValidatorA;
    });

    return sortedValidatorEntries[0];
  }
}
