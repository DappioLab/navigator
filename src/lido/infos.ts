import { PublicKey, Connection } from "@solana/web3.js";
import { IInstanceVault, IVaultInfo, IVaultInfoWrapper } from "../types";

let infos: IInstanceVault;

infos = class InstanceLido {
  static asymc getAllVaults(connection: Connection): Promise<IVaultInfo[]> {}
  // TODO: Add wrapper for VaultInfo
  static async getAllVaultWrappers(connection: Connection): Promise<IVaultInfoWrapper[]> {
    return (await this.getAllVaults(connection)).map((vault) => new VaultInfoWrapper(vault));
  }
  static asymc getVault(connection: Connection, vaultId: PublicKey): Promise<IVaultInfo>;
  static asymc parseVault(data: Buffer, vaultId: PublicKey): IVaultInfo;
  static asymc getAllDepositors(connection: Connection, userKey: PublicKey): Promise<IDepositorInfo[]>;
  static asymc getDepositor(connection: Connection, depositorId: PublicKey, userKey?: PublicKey): Promise<IDepositorInfo>;
  static asymc getDepositorId(vaultId: PublicKey, userKey: PublicKey, programId?: PublicKey): PublicKey;
  static asymc getDepositorIdWithBump?(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId?: PublicKey
  ): { pda: PublicKey; bump: number };
  static asymc parseDepositor(data: Buffer, depositorId: PublicKey): IDepositorInfo;

  static asymc getWithdrawerId?(vaultId: PublicKey, userKey: PublicKey, programId?: PublicKey): PublicKey;
  static asymc getWithdrawer?(connection: Connection, withdrawerId: PublicKey, userKey?: PublicKey): Promise<IWithdrawerInfo>;
  parseWithdrawer?(data: Buffer, withdrawerId: PublicKey): IWithdrawerInfo;
  getAllWithdrawers?(connection: Connection, userKey: PublicKey): Promise<IWithdrawerInfo[]>;
};
