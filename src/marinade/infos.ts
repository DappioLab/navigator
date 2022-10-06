import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";

import { TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token-v2";

import { IInstanceVault } from "../types";

let infos: IInstanceVault;

infos = class InstanceMarinade {
  static async getVaultInfo() {}
  static async getAllVaults(): Promise<any> {}
  static async getAllVaultWrappers(): Promise<any> {}
  static async getVault(): Promise<any> {}
  static parseVault(): any {}
  static async getAllDepositors(): Promise<any> {}
  static async getDepositor(): Promise<any> {}
  static getDepositorId(): any {}
  static parseDepositor(): any {}
};

export { infos };
