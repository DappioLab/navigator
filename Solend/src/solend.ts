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
import * as info from "./solend_info"
import * as obligation from "./obligation"
interface lending_market_info {
  reserve_address: PublicKey;
  supply_token_mint: PublicKey;
  supply_token_decimal: BN;
  reserve_token_mint: PublicKey;
  reserve_token_decimal: BN;
  supply_amount: BN;
  supply_limit: BN;
  supply_apy: number;
  mining_apy: number;
  reserve_info: state.Reserve;

}
import * as state from "./state";



//all from https://docs.solend.fi/protocol/addresses



export class lending_info implements lending_market_info {
  reserve_address: PublicKey;
  supply_token_mint: PublicKey;
  supply_token_decimal: BN;
  reserve_token_mint: PublicKey;
  reserve_token_decimal: BN;
  supply_amount: BN;
  supply_limit: BN;
  supply_apy: number;
  mining_apy: number;
  reserve_info: state.Reserve;
  //total_usd_value: BN;
  constructor(
    reserve_address: PublicKey,
    supply_token_mint: PublicKey,
    supply_token_decimal: BN,
    reserve_token_mint: PublicKey,
    reserve_token_decimal: BN,
    supply_amount: BN,
    supply_limit: BN,
    supply_apy: number,
    mining_apy: number,
    reserve_info: state.Reserve,
    //total_usd_value: BN,
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
    //this.total_usd_value = total_usd_value;
  }
}

export async function get_all_lending_info(connection: Connection) {
  const all_reserve = await get_all_reserve(connection);
  let lending_infos = <Array<lending_info>>[];

  for (let reserves_meta of all_reserve) {

    let borrowed_amount = reserves_meta[1].liquidity.borrowed_amount_wads.div(new BN(`1${''.padEnd(18, '0')}`));

    let available_amount = reserves_meta[1].liquidity.available_amount;

    let supply_amount = borrowed_amount.add(available_amount);

    let UtilizationRatio = reserves_meta[1].calculateUtilizationRatio()
    let mining_apy = 0;
    let borrowAPY = reserves_meta[1].calculateBorrowAPY() as number
    let apy = UtilizationRatio * borrowAPY;
    let decimal = new BN(reserves_meta[1].liquidity.mint_decimals).toNumber()
    let borrowed_usd_value = borrowed_amount.div(new BN(`1${''.padEnd(decimal, '0')}`)).mul(reserves_meta[1].liquidity.market_price).div(new BN(`1${''.padEnd(18, '0')}
    `))
    
    
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
async function get_all_reserve(connection: Connection) {
  const program_id_memcmp: MemcmpFilter = {
    memcmp: {
      offset: 10,
      //offset 10byte
      bytes: info.SOLEND_LENDING_MARKET_ID.toString(),
    }
  }
  const data_size_filters: DataSizeFilter = {

    dataSize: info.RESERVE_LAYOUT_SPAN,

  }

  const filters = [program_id_memcmp, data_size_filters];

  const config: GetProgramAccountsConfig = { filters: filters }
  const reserve_accounts = await connection.getProgramAccounts(info.SOLEND_PROGRAM_ID, config);
  let reserves = <Array<[PublicKey, state.Reserve]>>[];
  for (let account of reserve_accounts) {

    let info = await state.parseReserveData(account.account.data);
    reserves.push([account.pubkey, info]);
  }

  return reserves;

}
export async function getObligation(connection:Connection,wallet:PublicKey) {
  let obligationAddress =await obligation.get_obligation_public_key(wallet);
  let accountInfo = await connection.getAccountInfo(obligationAddress);
  let obligationInfo = obligation.parseObligationData(accountInfo?.data);
  return obligationInfo;
}


