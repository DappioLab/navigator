import { TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token-v2";
import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js";
import { IInstanceVault, IVaultInfoWrapper } from "../types";
import { LIDO_ADDRESS, LIDO_PROGRAM_ID, ST_SOL_MINT_ADDRESS } from "./ids";
import { LIDO_TOKEN_LAYOUT } from "./layout";
import * as types from ".";

let infos: IInstanceVault;

infos = class InstanceLido {
  static async getAllVaults(connection: Connection): Promise<types.VaultInfo[]> {
    const memcmpFilter = {
      memcmp: { bytes: ST_SOL_MINT_ADDRESS.toString(), offset: 0 },
    };
    const config = {
      filters: [{ dataSize: 165 }, memcmpFilter],
    };
    const accountInfos = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, config);
    const vaults: types.VaultInfo[] = accountInfos.map((info) => this.parseVault(info.account.data, info.pubkey));

    return vaults;
  }

  static async getAllVaultWrappers(connection: Connection): Promise<VaultInfoWrapper[]> {
    return (await this.getAllVaults(connection)).map((vault) => new VaultInfoWrapper(vault));
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    const vaultAccountInfo = await connection.getAccountInfo(vaultId);
    if (!vaultAccountInfo) throw Error("Error: Cannot get solido token account");

    const vault: types.VaultInfo = this.parseVault(vaultAccountInfo.data, vaultId);

    return vault;
  }

  static parseVault(data: Buffer, vaultId: PublicKey): types.VaultInfo {
    // Decode the Token data using AccountLayout
    const decodeData = AccountLayout.decode(data);
    const { mint, amount } = decodeData;

    // Ensure the mint matches
    if (!this._isAllowed(mint)) {
      throw Error("Error: Not a stSOL token account");
    }

    return {
      vaultId,
      shareMint: mint,
      // TODO: Set amount
      amount: new BN(0),
    };
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

  static getDepositorId(vaultId: PublicKey, _userKey: PublicKey, _programId: PublicKey = LIDO_PROGRAM_ID): PublicKey {
    return vaultId;
  }

  static parseDepositor(data: Buffer, depositorId: PublicKey): types.DepositorInfo {
    const decodeData = AccountLayout.decode(data);
    const { mint, owner } = decodeData;

    // Ensure the mint matches
    if (!this._isAllowed(mint)) {
      throw Error(`Error: Not a stSOL token account`);
    }

    return {
      depositorId,
      userKey: owner,
    };
  }
  private static _isAllowed(mint: PublicKey): boolean {
    return mint.equals(ST_SOL_MINT_ADDRESS);
  }
};

export { infos };

export class VaultInfoWrapper implements IVaultInfoWrapper {
  constructor(public vaultInfo: types.VaultInfo) {}

  getApr() {
    // TODO
    return 0;
  }
}
