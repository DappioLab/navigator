import { PublicKey, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import { IInstanceVault, IVaultInfoWrapper } from "../types";
import { LIDO_ADDRESS, LIDO_PROGRAM_ID, ST_SOL_MINT_ADDRESS } from "./ids";
import { LIDO_LAYOUT, LIDO_TOKEN_LAYOUT } from "./layout";
import * as types from ".";

let infos: IInstanceVault;

infos = class InstanceLido {
  static async getAllVaults(connection: Connection): Promise<types.VaultInfo[]> {
    const accountInfos = await connection.getAccountInfo(LIDO_ADDRESS);

    if (!accountInfos) throw Error("Error: Could not get solido address");
    const vault = this.parseVault(accountInfos.data, LIDO_ADDRESS);

    return [vault];
  }

  static async getAllVaultWrappers(connection: Connection): Promise<VaultInfoWrapper[]> {
    return (await this.getAllVaults(connection)).map((vault) => new VaultInfoWrapper(vault));
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    if (!vaultId.equals(LIDO_ADDRESS)) throw Error(`Error: Lido vaultId must match ${LIDO_ADDRESS.toBase58()}`);

    const vaultAccountInfo = await connection.getAccountInfo(vaultId);
    if (!vaultAccountInfo) throw Error("Error: Cannot get solido token account");

    const vault: types.VaultInfo = this.parseVault(vaultAccountInfo.data, vaultId);

    return vault;
  }

  static parseVault(data: Buffer, vaultId: PublicKey): types.VaultInfo {
    // Decode the Token data using AccountLayout
    const decodeData = LIDO_LAYOUT.decode(data);
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

    // Ensure the mint matches
    if (!this._isAllowed(stSolMint)) {
      throw Error("Error: Not a stSOL token account");
    }

    return {
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
    const decodeData = LIDO_TOKEN_LAYOUT.decode(data);
    const { mint, amount, owner } = decodeData;

    // Ensure the mint matches
    if (!this._isAllowed(mint)) {
      throw Error(`Error: Not a stSOL token account`);
    }

    return {
      depositorId,
      userKey: owner,
      amount,
      mint,
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
