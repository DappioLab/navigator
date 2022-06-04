import {
  publicKey,
  struct,
  u64,
  u128,
  u8,
  bool,
  u16,
  i64,
} from "@project-serum/borsh";
import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { getOptionMarketByOptionTokenMint } from "../../psyOptions/optionMarket";
import { KATANA_PROGRAM_ID } from "./info";

export interface OptionParameters {
  infoPubkey: PublicKey;
  vault: PublicKey;
  expiry: BN;
  strike: BN;
}

export class OptionParameters implements OptionParameters {
  infoPubkey: PublicKey;
  vault: PublicKey;
  expiry: BN;
  strike: BN;
  constructor(infoPubkey: PublicKey, vault: PublicKey, expiry: BN, strike: BN) {
    this.infoPubkey = infoPubkey;
    this.vault = vault;
    this.expiry = expiry;
    this.strike = strike;
  }
}

const OPTION_PRAM_LAYOUT = struct([
  publicKey("vault"),
  u64("expiry"),
  u64("strike"),
]);

export function parseOptionParameters(data: any, infoPubkey: PublicKey) {
  let dataBuffer = data as Buffer;
  let optionData = dataBuffer.slice(8);
  let optionRaw = OPTION_PRAM_LAYOUT.decode(optionData);
  let { vault, expiry, strike } = optionRaw;
  return new OptionParameters(infoPubkey, vault, expiry, strike);
}

export async function getAllOptionPrams(connection: Connection) {
  const sizeFilter: DataSizeFilter = {
    dataSize: 57,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allOptionPramAccount = await connection.getProgramAccounts(
    KATANA_PROGRAM_ID,
    config
  );
  let allOptionPram: OptionParameters[] = [];
  for (let accountInfo of allOptionPramAccount) {
    allOptionPram.push(
      await parseOptionParameters(accountInfo.account.data, accountInfo.pubkey)
    );
  }
  return allOptionPram;
}
