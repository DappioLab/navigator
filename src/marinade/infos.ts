import { Connection, PublicKey } from "@solana/web3.js";

import { MARINADE_PROGRAM_ID, MSOL_MINT_ADDRESS, MSOL_VAULT_ADDRESS } from "./ids";

import { IInstanceVault, IVaultInfoWrapper } from "../types";
import { MARINADE_FINANCE_ACCOUNT_STATE } from "./layouts";

import * as types from ".";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";

let infos: IInstanceVault;

infos = class InstanceMarinade {
  static async getAllVaults(connection: Connection): Promise<types.VaultInfo[]> {
    const accountInfos = await connection.getAccountInfo(MSOL_VAULT_ADDRESS);

    if (!accountInfos) throw Error("Error: Could not get solido address");
    const vault = this.parseVault(accountInfos.data, MSOL_VAULT_ADDRESS);

    return [vault];
  }

  static async getAllVaultWrappers(connection: Connection): Promise<VaultInfoWrapper[]> {
    return (await this.getAllVaults(connection)).map((vault) => new VaultInfoWrapper(vault));
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    if (!vaultId.equals(MSOL_VAULT_ADDRESS)) {
      throw Error(`Error: Marinade vaultId must match ${MSOL_VAULT_ADDRESS.toBase58()}`);
    }

    const vaultAccountInfo = await connection.getAccountInfo(vaultId);
    if (!vaultAccountInfo) throw Error("Error: Cannot get marinade token account");

    const vault: types.VaultInfo = this.parseVault(vaultAccountInfo.data, vaultId);

    return vault;
  }

  static parseVault(data: Buffer, vaultId: PublicKey): types.VaultInfo {
    // Decode the Token data using AccountLayout

    // const testLayout = struct(
    //   [
    //     blob(8, "identifier"),
    //     publicKey("msolMint"),
    //     publicKey("adminAuthority"),
    //     publicKey("operationalSolAccount"),
    //     publicKey("treasuryMsolAccount"),
    //     u8("reserveBumpSeed"),
    //   ],
    //   "State"
    // );

    const decodeData = MARINADE_FINANCE_ACCOUNT_STATE.decode(data);
    console.log({ decodeData });
    const {
      msolMint,
      adminAuthority,
      operationalSolAccount,
      treasuryMsolAccount,
      reserveBumpSeed,
      msolMintAuthorityBumpSeed,
      rentExemptForTokenAcc,
      rewardFee,
      stakeSystem,
      validatorSystem,
      liqPool,
      availableReserveBalance,
      msolSupply,
      msolPrice,
      circulatingTicketCount,
      circulatingTicketBalance,
      lentFromReserve,
      minDeposit,
      minWithdraw,
      stakingSolCap,
      emergencyCoolingDown,
    } = decodeData;

    // Ensure the mint matches
    if (!this._isAllowed(msolMint)) {
      console.log(msolMint.toString());
      throw Error("Error: Not a mSOL token account");
    }

    return {
      vaultId,
      msolMint,
      adminAuthority,
      operationalSolAccount,
      treasuryMsolAccount,
      reserveBumpSeed,
      msolMintAuthorityBumpSeed,
      rentExemptForTokenAcc,
      rewardFee,
      stakeSystem,
      validatorSystem,
      liqPool,
      availableReserveBalance,
      msolSupply,
      msolPrice,
      circulatingTicketCount,
      circulatingTicketBalance,
      lentFromReserve,
      minDeposit,
      minWithdraw,
      stakingSolCap,
      emergencyCoolingDown,
    } as types.VaultInfo;
  }

  static async getAllDepositors(connection: Connection, userKey: PublicKey): Promise<types.DepositorInfo[]> {
    const { value: accountInfos } = await connection.getTokenAccountsByOwner(userKey, {
      mint: MSOL_MINT_ADDRESS,
    });
    const depositors = accountInfos.map((depositor) => this.parseDepositor(depositor.account.data, depositor.pubkey));
    return depositors;
  }

  static async getDepositor(connection: Connection, depositorId: PublicKey): Promise<types.DepositorInfo> {
    const depositorAccountInfo = await connection.getAccountInfo(depositorId);
    if (!depositorAccountInfo) throw Error("Error: Cannot get depositor account");

    return this.parseDepositor(depositorAccountInfo.data, depositorId);
  }

  static getDepositorId(
    _vaultId: PublicKey,
    userKey: PublicKey,
    _programId: PublicKey = MARINADE_PROGRAM_ID
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [userKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), MSOL_MINT_ADDRESS.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }

  static parseDepositor(data: Buffer, depositorId: PublicKey): types.DepositorInfo {
    const decodeData = MARINADE_FINANCE_ACCOUNT_STATE.decode(data);
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
    return mint.equals(MSOL_MINT_ADDRESS);
  }
};

export { infos };

export class VaultInfoWrapper implements IVaultInfoWrapper {
  constructor(public vaultInfo: types.VaultInfo) {}
}
