import {
  Connection,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  MemcmpFilter,
  SystemProgram,
} from "@solana/web3.js";
import BN from "bn.js";
import { utils } from "..";
import { IInstanceVault, IVaultInfoWrapper, PageConfig } from "../types";
import { INERTIA_PROGRAM_ID, STABLE_VAULT_IDS, VOLT_FEE_OWNER, VOLT_PROGRAM_ID } from "./ids";
import {
  ENTROPY_METADATA_LAYOUT,
  EPOCH_INFO_LAYOUT,
  EXTRA_VOLT_DATA_LAYOUT,
  INERTIA_OPTION_CONTRACT_LAYOUT,
  ROUND_LAYOUT,
  USER_PENDING_LAYOUT,
  VOLT_VAULT_LAYOUT,
} from "./layouts";

import * as types from ".";
import { getAccount, getAssociatedTokenAddress, getMint } from "@solana/spl-token-v2";
import { paginate } from "../utils";
import axios from "axios";

let infos: IInstanceVault;

export { infos };
infos = class InstanceFriktion {
  static async getAllVaults(connection: Connection, page?: PageConfig): Promise<types.VaultInfo[]> {
    let rounds = await this._getAllRoundSet(connection);
    let extraInfos = await this._getAllExtraDataSet(connection);
    let entropyMetaDataSet = await this._getAllEntropyMetadataSet(connection);
    let epochInfoSet = await this._getAllEpochInfoSet(connection);
    const sizeFilter: DataSizeFilter = {
      dataSize: VOLT_VAULT_LAYOUT.span,
    };
    let snapshot = await this._getSnapshotSet();
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allVaultAccount = paginate(await connection.getProgramAccounts(VOLT_PROGRAM_ID, config), page);
    return allVaultAccount.map((account) => {
      const vault = this.parseVault(account.account!.data, account.pubkey);
      const vaultWrapper = new VaultInfoWrapper(vault);
      vault.epochInfos = [];
      for (let round = 1; round < Number(vault.roundNumber) + 1; round++) {
        let roundId = vaultWrapper.getRoundInfoAddress(new BN(round));
        let roundInfo = rounds.get(roundId.toString());
        if (roundInfo) {
          vault.roundInfos.push(roundInfo);
        }
        let epochId = vaultWrapper.getEpochInfoAddress(new BN(round));
        let epochInfo = epochInfoSet.get(epochId.toString());
        if (epochInfo) {
          vault.epochInfos.push(epochInfo);
        } else {
          let emptyEpochInfo = EPOCH_INFO_LAYOUT.decode(Buffer.alloc(10000)) as types.EpochInfo;
          vault.epochInfos.push({ ...emptyEpochInfo, epochId: epochId });
        }
      }
      vault.extraData = extraInfos.get(vaultWrapper.getExtraVoltDataAddress().toString()) as types.ExtraVaultInfo;
      vault.extraData.entropyMetadataInfo = entropyMetaDataSet.get(vault.extraData.entropyMetadata.toString());
      vault.snapshotInfo = snapshot.get(vault.vaultId.toString());
      return vault;
    });
  }

  static async getAllVaultWrappers(connection: Connection, page?: PageConfig): Promise<IVaultInfoWrapper[]> {
    return (await this.getAllVaults(connection, page)).map((vault) => new VaultInfoWrapper(vault));
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    const vaultAccount = await connection.getAccountInfo(vaultId);
    let rounds = await this._getAllRoundSet(connection);
    let extraInfos = await this._getAllExtraDataSet(connection);
    let entropyMetaDataSet = await this._getAllEntropyMetadataSet(connection);
    let snapshot = await this._getSnapshotSet();
    if (!vaultAccount) {
      throw new Error("Vault account not found");
    }
    const vault = this.parseVault(vaultAccount.data, vaultId);
    const vaultWrapper = new VaultInfoWrapper(vault);
    for (let round = 1; round < Number(vault.roundNumber) + 1; round++) {
      let roundId = vaultWrapper.getRoundInfoAddress(new BN(round));
      let roundInfo = rounds.get(roundId.toString());
      if (roundInfo) {
        vault.roundInfos.push(roundInfo);
      }
    }
    vault.extraData = extraInfos.get(vaultWrapper.getExtraVoltDataAddress().toString()) as types.ExtraVaultInfo;
    vault.extraData.entropyMetadataInfo = entropyMetaDataSet.get(vault.extraData.entropyMetadata.toString());
    return vault;
  }
  static parseVault(data: Buffer, vaultId: PublicKey): types.VaultInfo {
    const vault = VOLT_VAULT_LAYOUT.decode(Buffer.from(data)) as types.VaultInfo;
    vault.vaultId = vaultId;
    vault.shareMint = vault.vaultMint;
    vault.roundInfos = [];
    return vault;
  }
  static async getAllDepositors(connection: Connection, userKey: PublicKey): Promise<types.DepositorInfo[]> {
    let vaults = await this.getAllVaults(connection);
    let allPendingDepositKeys: PublicKey[] = vaults.map((vault) => {
      return this.getDepositorId(vault.vaultId, userKey);
    });

    let allPendingDepositMeta = (await utils.getMultipleAccounts(connection, allPendingDepositKeys)).filter((info) =>
      Boolean(info.account)
    );
    return allPendingDepositMeta
      .filter((meta) => {
        return meta.account!.data.length > 0;
      })
      .map((meta) => {
        return this.parseDepositor(meta.account!.data, meta.pubkey, userKey);
      });
  }
  static async getDepositor(
    connection: Connection,
    depositorId: PublicKey,
    userKey: PublicKey
  ): Promise<types.DepositorInfo> {
    const depositorAccount = await connection.getAccountInfo(depositorId);
    if (!depositorAccount) {
      throw new Error("Depositor account not found");
    }
    return this.parseDepositor(depositorAccount.data, depositorId, userKey);
  }
  static getDepositorId(vaultId: PublicKey, userKey: PublicKey, programId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [vaultId.toBuffer(), userKey.toBuffer(), new Uint8Array(Buffer.from("pendingDeposit", "utf-8"))],
      programId
    )[0];
  }
  static parseDepositor(data: Buffer, depositorId: PublicKey, userKey?: PublicKey): types.DepositorInfo {
    if (!userKey) {
      throw new Error("User key not provided");
    }
    return {
      ...(USER_PENDING_LAYOUT.decode(Buffer.from(data)) as types.DepositorInfo),
      depositorId: depositorId,
      userKey: userKey,
    };
  }
  static getWithdrawerId(vaultId: PublicKey, userKey: PublicKey, programId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [vaultId.toBuffer(), userKey.toBuffer(), new Uint8Array(Buffer.from("pendingWithdrawal", "utf-8"))],
      programId
    )[0];
  }
  static async getWithdrawer(
    connection: Connection,
    withdrawerId: PublicKey,
    userKey: PublicKey
  ): Promise<types.withdrawerInfo> {
    const withdrawerAccount = await connection.getAccountInfo(withdrawerId);
    if (!withdrawerAccount) {
      throw new Error("Withdrawer account not found");
    }
    return this.parseWithdrawer(withdrawerAccount.data, withdrawerId, userKey);
  }
  static parseWithdrawer(data: Buffer, withdrawerId: PublicKey, userKey?: PublicKey): types.withdrawerInfo {
    if (!userKey) {
      throw new Error("User key not provided");
    }
    return {
      ...(USER_PENDING_LAYOUT.decode(Buffer.from(data)) as types.withdrawerInfo),
      withdrawerId: withdrawerId,
      userKey: userKey,
    };
  }
  static async getAllWithdrawers(connection: Connection, userKey: PublicKey): Promise<types.withdrawerInfo[]> {
    let vaults = await this.getAllVaults(connection);
    let allPendingWithdrawalKeys: PublicKey[] = vaults.map((vault) => {
      return this.getWithdrawerId(vault.vaultId, userKey);
    });
    let allPendingWithdrawalMeta = (await utils.getMultipleAccounts(connection, allPendingWithdrawalKeys)).filter(
      (info) => Boolean(info.account)
    );
    return allPendingWithdrawalMeta
      .filter((meta) => {
        return meta.account!.data.length > 0;
      })
      .map((meta) => {
        return this.parseWithdrawer(meta.account!.data, meta.pubkey, userKey);
      });
  }
  private static async _getAllRoundSet(connection: Connection) {
    let sizeFilter: DataSizeFilter = { dataSize: ROUND_LAYOUT.span };
    let config: GetProgramAccountsConfig = { filters: [sizeFilter] };
    let allRoundKeys = await connection.getProgramAccounts(VOLT_PROGRAM_ID, config);
    return new Map(
      allRoundKeys.map((key) => [
        key.pubkey.toString(),
        {
          ...ROUND_LAYOUT.decode(key.account.data),
          roundId: key.pubkey,
        } as types.RoundInfo,
      ])
    );
  }
  private static async _getAllExtraDataSet(connection: Connection) {
    let sizeFilter: DataSizeFilter = { dataSize: EXTRA_VOLT_DATA_LAYOUT.span };
    let config: GetProgramAccountsConfig = { filters: [sizeFilter] };
    let allExtraDataKeys = await connection.getProgramAccounts(VOLT_PROGRAM_ID, config);
    return new Map(
      allExtraDataKeys.map((key) => [
        key.pubkey.toString(),
        {
          ...EXTRA_VOLT_DATA_LAYOUT.decode(key.account.data),
          extraDataId: key.pubkey,
        } as types.ExtraVaultInfo,
      ])
    );
  }
  private static async _getAllEntropyMetadataSet(connection: Connection) {
    let memcmpFilter: MemcmpFilter = {
      memcmp: { offset: 0, bytes: "S4L1u3M2boH" },
    };
    let config: GetProgramAccountsConfig = { filters: [memcmpFilter] };
    let allExtraDataKeys = await connection.getProgramAccounts(VOLT_PROGRAM_ID, config);
    return new Map(
      allExtraDataKeys.map((key) => [
        key.pubkey.toString(),
        {
          ...ENTROPY_METADATA_LAYOUT.decode(key.account.data),
        } as types.EntropyMetadata,
      ])
    );
  }
  private static async _getAllEpochInfoSet(connection: Connection) {
    let memcmpFilter: MemcmpFilter = {
      memcmp: { offset: 0, bytes: "b5Wr6XPu32" },
    };
    let config: GetProgramAccountsConfig = { filters: [memcmpFilter] };
    let allExtraDataKeys = await connection.getProgramAccounts(VOLT_PROGRAM_ID, config);
    return new Map(
      allExtraDataKeys.map((key) => [
        key.pubkey.toString(),
        {
          ...EPOCH_INFO_LAYOUT.decode(key.account.data),
          epochId: key.pubkey,
        } as types.EpochInfo,
      ])
    );
  }
  private static async _getSnapshotSet() {
    const snapshotUrl =
      "https://raw.githubusercontent.com/Friktion-Labs/mainnet-tvl-snapshots/main/friktionSnapshot.json";
    const snapshotData = (await (await axios.get(snapshotUrl)).data.allMainnetVolts) as types.SnapshotInfo[];
    return new Map(snapshotData.map((key) => [key.voltVaultId.toString(), key]));
  }
};
export class VaultInfoWrapper {
  constructor(public readonly vaultInfo: types.VaultInfo) {}
  getExtraVoltDataAddress(voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [this.vaultInfo.vaultId.toBuffer(), new Uint8Array(Buffer.from("extraVoltData", "utf-8"))],
      voltProgramId
    )[0];
  }
  getEntropyLendingAccountAddress(voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [this.vaultInfo.vaultId.toBuffer(), new Uint8Array(Buffer.from("entropyLendingAccount", "utf-8"))],
      voltProgramId
    )[0];
  }
  getEntropyMetadataAddress(voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [this.vaultInfo.vaultId.toBuffer(), new Uint8Array(Buffer.from("entropyMetadata", "utf-8"))],
      voltProgramId
    )[0];
  }
  getRoundInfoAddress(roundNumber: BN, voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        this.vaultInfo.vaultId.toBuffer(),
        roundNumber.toArrayLike(Buffer, "le", 8),
        new Uint8Array(Buffer.from("roundInfo", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
  getRoundVoltTokensAddress(roundNumber: BN, voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        this.vaultInfo.vaultId.toBuffer(),
        roundNumber.toArrayLike(Buffer, "le", 8),
        new Uint8Array(Buffer.from("roundVoltTokens", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
  getRoundUnderlyingTokensAddress(roundNumber: BN, voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        this.vaultInfo.vaultId.toBuffer(),
        roundNumber.toArrayLike(Buffer, "le", 8),
        new Uint8Array(Buffer.from("roundUnderlyingTokens", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
  getEpochInfoAddress(roundNumber: BN, voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        this.vaultInfo.vaultId.toBuffer(),
        roundNumber.toArrayLike(Buffer, "le", 8),
        new Uint8Array(Buffer.from("epochInfo", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
  getRoundUnderlyingTokensPendingWithdrawalsAddress(
    roundNumber: BN,
    voltProgramId: PublicKey = VOLT_PROGRAM_ID
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        this.vaultInfo.vaultId.toBuffer(),
        roundNumber.toArrayLike(Buffer, "le", 8),
        new Uint8Array(Buffer.from("roundUlPending", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
  async getFeeAccount(): Promise<PublicKey> {
    return getAssociatedTokenAddress(this.vaultInfo.vaultMint, VOLT_FEE_OWNER);
  }
  getTypes(): types.VaultType {
    if (
      this.vaultInfo.premiumPool.toString() !== SystemProgram.programId.toString() &&
      this.vaultInfo.vaultType.toNumber() === 2
    ) {
      return types.VaultType.PrincipalProtection;
    } else if (this.vaultInfo.premiumPool.toString() !== SystemProgram.programId.toString()) {
      return STABLE_VAULT_IDS.includes(this.vaultInfo.underlyingAssetMint.toString())
        ? types.VaultType.ShortPuts
        : types.VaultType.ShortCalls;
    } else if (this.vaultInfo.premiumPool.toString() === SystemProgram.programId.toString()) {
      if (this.vaultInfo.extraData.entropyMetadataInfo?.hedgeWithSpot) {
        return types.VaultType.LongBasis;
      }
      return types.VaultType.ShortCrab;
    } else {
      throw new Error("Unknown vault type");
    }
  }
  getAPR(): number {
    return this.vaultInfo.snapshotInfo ? this.vaultInfo.snapshotInfo.apr : 0;
  }
  getAPY(): number {
    return this.vaultInfo.snapshotInfo ? this.vaultInfo.snapshotInfo.apy : 0;
  }
  async getSharePrice(
    connection: Connection,
    round?: number,
    claimDeposit?: boolean,
    claimWithdrawal?: boolean
  ): Promise<number> {
    if (this.vaultInfo.snapshotInfo && this.vaultInfo.roundNumber.toNumber() == round) {
      return this.vaultInfo.snapshotInfo.shareTokenPrice;
    } else if (this.vaultInfo.snapshotInfo) {
      return this.vaultInfo.snapshotInfo.shareTokenPrice;
    } else if (round) {
      if (claimWithdrawal) {
        let roundInfo = this.vaultInfo.roundInfos[round - 1];
        let underlying = new BN(
          (
            await getAccount(connection, this.getRoundUnderlyingTokensPendingWithdrawalsAddress(new BN(round)))
          ).amount.toString()
        )
          .div(new BN(10).pow(new BN(3)))
          .toNumber();
        let vaultTokenSupply = roundInfo.voltTokensFromPendingWithdrawals.div(new BN(10).pow(new BN(3))).toNumber();
        return underlying / vaultTokenSupply;
      } else if (claimDeposit) {
        let roundInfo = this.vaultInfo.roundInfos[round - 1];
        let vaultTokenSupply = new BN(
          (await getAccount(connection, this.getRoundVoltTokensAddress(new BN(round)))).amount.toString()
        )
          .div(new BN(10).pow(new BN(3)))
          .toNumber();
        let underlying = roundInfo.underlyingFromPendingDeposits.div(new BN(10).pow(new BN(3))).toNumber();
        return underlying / vaultTokenSupply;
      } else {
        return 1;
      }
    } else {
      round = this.vaultInfo.roundNumber.toNumber() - 1;
      if (round <= 0) return 1;
      let roundInfo = this.vaultInfo.roundInfos[round];
      let mint = this.vaultInfo.vaultMint;
      let supply = new BN((await getMint(connection, mint)).supply.toString())
        .add(roundInfo.voltTokensFromPendingWithdrawals)
        .div(new BN(10).pow(new BN(6)))
        .toNumber();
      let totalDeposits = roundInfo.underlyingPreEnter.div(new BN(10).pow(new BN(6))).toNumber();
      return supply == 0 ? 1 : totalDeposits / supply;
    }
  }
  async getLastTradedOptipon(connection: Connection): Promise<string> {
    let optionAddress = this.vaultInfo.snapshotInfo?.lastTradedOption;

    if (optionAddress) {
      let account = new PublicKey(optionAddress);
      let optionInfo = await connection.getAccountInfo(account);
      if (optionInfo && optionInfo.owner.toString() == INERTIA_PROGRAM_ID.toString()) {
        let option = INERTIA_OPTION_CONTRACT_LAYOUT.decode(optionInfo.data);
        let ts = new BN(option.expiryTs).toNumber();
        let date = new Date(ts * 1000);
        let month = date.toLocaleString("en-US", { month: "short" });
        let day = date.getDate();
        let type = new BN(option.isCall).isZero() ? "PUT" : "CALL";
        let quoteDecimal = 10 ** (await (await getMint(connection, new PublicKey(option.quoteMint))).decimals);

        let underlyingDecimal =
          10 ** (await (await getMint(connection, new PublicKey(option.underlyingMint))).decimals);
        let price = new BN(option.isCall).isZero()
          ? (new BN(option.underlyingAmount).toNumber() / new BN(option.quoteAmount).toNumber() / underlyingDecimal) *
            quoteDecimal
          : (new BN(option.quoteAmount).toNumber() / new BN(option.underlyingAmount).toNumber() / quoteDecimal) *
            underlyingDecimal;
        price = Math.round(price * 10**5) / 10**5;
        return `$${price} ${type} ${month} ${day}`;
      }
    }
    return "null";
  }
}
