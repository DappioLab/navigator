import { Connection, GetProgramAccountsConfig, DataSizeFilter, PublicKey, MemcmpFilter } from "@solana/web3.js";
import BN from "bn.js";
import { utils } from "..";
import { IInstanceVault } from "../types";
import { VOLT_PROGRAM_ID } from "./ids";
import { ROUND_LAYOUT, USER_PENDING_LAYOUT, VOLT_VAULT_LAYOUT } from "./layouts";

import * as types from ".";

let infos: IInstanceVault;

export { infos };
infos = class InstanceFriktion {
  static async getAllVaults(connection: Connection): Promise<types.VaultInfo[]> {
    let rounds = await this.getAllRoundSet(connection);
    const sizeFilter: DataSizeFilter = {
      dataSize: VOLT_VAULT_LAYOUT.span,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allVaultAccount = await connection.getProgramAccounts(VOLT_PROGRAM_ID, config);
    return allVaultAccount.map((account) => {
      const vault = this.parseVault(account.account.data, account.pubkey);
      for (let round = 1; round < vault.roundNumber.toNumber() + 1; round++) {
        let roundId = new VaultInfoWrapper(vault).getRoundInfoAddress(new BN(round));
        let roundInfo = rounds.get(roundId.toString());
        if (roundInfo) {
          vault.roundInfos.push(roundInfo);
        }
      }
      return vault;
    });
  }
  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    const vaultAccount = await connection.getAccountInfo(vaultId);
    let rounds = await this.getAllRoundSet(connection);
    if (!vaultAccount) {
      throw new Error("Vault account not found");
    }
    const vault = this.parseVault(vaultAccount.data, vaultId);
    for (let round = 1; round < vault.roundNumber.toNumber() + 1; round++) {
      let roundId = new VaultInfoWrapper(vault).getRoundInfoAddress(new BN(round));
      let roundInfo = rounds.get(roundId.toString());
      if (roundInfo) {
        vault.roundInfos.push(roundInfo);
      }
    }

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

    let allPendingDepositMeta = await utils.getMultipleAccountsWithKey(allPendingDepositKeys, connection);
    return allPendingDepositMeta
      .filter((meta) => {
        return meta.account.data.length > 0;
      })
      .map((meta) => {
        return this.parseDepositor(meta.account.data, meta.pubkey, userKey);
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
    let allPendingWithdrawalMeta = await utils.getMultipleAccountsWithKey(allPendingWithdrawalKeys, connection);
    return allPendingWithdrawalMeta
      .filter((meta) => {
        return meta.account.data.length > 0;
      })
      .map((meta) => {
        return this.parseWithdrawer(meta.account.data, meta.pubkey, userKey);
      });
  }
  static async getAllRoundSet(connection: Connection) {
    let sizeFilter: DataSizeFilter = { dataSize: ROUND_LAYOUT.span };
    let config: GetProgramAccountsConfig = { filters: [sizeFilter] };
    let allRoundKeys = await connection.getProgramAccounts(VOLT_PROGRAM_ID, config);
    return new Map(
      allRoundKeys.map((key) => [
        key.pubkey.toString(),
        { ...ROUND_LAYOUT.decode(key.account.data), roundId: key.pubkey } as types.RoundInfo,
      ])
    );
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
  getRoundInfoAddress(roundNumber: BN, voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        this.vaultInfo.vaultId.toBuffer(),
        roundNumber.toBuffer("le", 8),
        new Uint8Array(Buffer.from("roundInfo", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
  getRoundVoltTokensAddress(roundNumber: BN, voltProgramId: PublicKey = VOLT_PROGRAM_ID): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        this.vaultInfo.vaultId.toBuffer(),
        new BN(roundNumber.toString()).toArrayLike(Buffer, "le", 8),
        new Uint8Array(Buffer.from("roundVoltTokens", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
  getRoundUnderlyingTokensAddress(
    voltKey: PublicKey,
    roundNumber: BN,
    voltProgramId: PublicKey = VOLT_PROGRAM_ID
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        voltKey.toBuffer(),
        new BN(roundNumber.toString()).toArrayLike(Buffer, "le", 8),
        new Uint8Array(Buffer.from("roundUnderlyingTokens", "utf-8")),
      ],
      voltProgramId
    )[0];
  }
}