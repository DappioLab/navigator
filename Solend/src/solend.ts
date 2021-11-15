import {
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
  GetProgramAccountsConfig,
  MemcmpFilter,
  DataSizeFilter
} from "@solana/web3.js";
import BN from "bn.js";
import { info } from "console";

interface lending_market_info {
  reserve_address: PublicKey;
  supply_token_mint: PublicKey;
  supply_token_decimal: BN;
  reserve_token_mint: PublicKey;
  reserve_token_decimal: BN;
  supply_amount: BN;
  supply_limit: BN;
  supply_apy: BN;
  mining_apy: BN;
  reserve_info: state.Reserve;

}
import * as state from "./state";
const SOLEND_PROGRAM_ID = new PublicKey(
  "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo",
);

const SOLEND_LENDING_MARKET_ID = new PublicKey(
  "4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY",
);

const MARKET_AUTHORITY = new PublicKey(
  "GDmSxpPzLkfxxr6dHLNRnCoYVGzvgc41tozkrr4pHTjB",
);

const MARKET_OWNER = new PublicKey(
  "5pHk2TmnqQzRF9L6egy5FfiyBgS7G9cMZ5RFaJAvghzw",
);

const RESERVE_LAYOUT_SPAN = 619;

//all from https://docs.solend.fi/protocol/addresses

export async function get_all_reserve(connection: Connection) {
  const program_id_memcmp: MemcmpFilter = {
    memcmp: {
      offset: 10,
      //offset 10byte
      bytes: SOLEND_LENDING_MARKET_ID.toString(),
    }
  }
  const data_size_filters: DataSizeFilter = {

    dataSize: RESERVE_LAYOUT_SPAN,

  }

  const filters = [program_id_memcmp, data_size_filters];

  const config: GetProgramAccountsConfig = { filters: filters }
  const reserve_accounts = await connection.getProgramAccounts(SOLEND_PROGRAM_ID, config);
  let reserves = <Array<[PublicKey, state.Reserve]>>[];
  for (let account of reserve_accounts) {
    //console.log(account.pubkey.toString());
    let info = await state.parseReserveData(account.account.data);
    reserves.push([account.pubkey, info]);
  }
  //console.log(reserves);
  return reserves;

}

class lending_info implements lending_market_info {
  reserve_address: PublicKey;
  supply_token_mint: PublicKey;
  supply_token_decimal: BN;
  reserve_token_mint: PublicKey;
  reserve_token_decimal: BN;
  supply_amount: BN;
  supply_limit: BN;
  supply_apy: BN;
  mining_apy: BN;
  reserve_info: state.Reserve;
  constructor(
    reserve_address: PublicKey,
    supply_token_mint: PublicKey,
    supply_token_decimal: BN,
    reserve_token_mint: PublicKey,
    reserve_token_decimal: BN,
    supply_amount: BN,
    supply_limit: BN,
    supply_apy: BN,
    mining_apy: BN,
    reserve_info: state.Reserve,
  ) {
    this.reserve_address = reserve_address;
    this.supply_token_mint = supply_token_mint;
    this.supply_token_decimal = supply_token_decimal;
    this.reserve_token_mint = reserve_token_mint;
    this.reserve_token_decimal = reserve_token_decimal;
    this.supply_amount = supply_amount;
    this.supply_limit = supply_limit;
    this.supply_apy = supply_apy;
    this.mining_apy = mining_apy;
    this.reserve_info = reserve_info;
  }
}

export async function get_all_lending_info(connection: Connection) {
  const all_reserve = await get_all_reserve(connection);
  let lending_infos = <Array<lending_info>>[];

  for (let reserves_meta of all_reserve) {

    let borrowed_amount_wads = reserves_meta[1].liquidity.borrowed_amount_wads;
    let available_amount = reserves_meta[1].liquidity.available_amount;//.mul( new BN(10E-18) ).toBN();
    let supply_amount_wads = borrowed_amount_wads.add(available_amount);
    let supply_amount = supply_amount_wads.muln(10E-18);

    let apy = reserves_meta[1].calculateUtilizationRatio().mul(reserves_meta[1].calculateBorrowAPY());
    let mining_apy = new BN(0);
    const info = new lending_info(
      reserves_meta[0],
      reserves_meta[1].liquidity.mint_pubkey,
      reserves_meta[1].liquidity.mint_decimals,
      reserves_meta[1].collateral.reserve_token_mint,
      reserves_meta[1].liquidity.mint_decimals,
      supply_amount,
      reserves_meta[1].config.deposit_limit,
      apy,
      mining_apy,
      reserves_meta[1]
    )
    lending_infos.push(info);

  }
  return lending_infos;
}

