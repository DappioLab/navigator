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
import * as info from "./solendInfo"
import * as obligation from "./obligation"
interface lendingMarketInfo {
  reserveAddress: PublicKey;
  supplyTokenMint: PublicKey;
  supplyTokenDecimal: BN;
  reserveTokenMint: PublicKey;
  reserveTokenDecimal: BN;
  reserveTokenSupply:BN;
  supplyAmount: BN;
  supplyLimit: BN;
  supplyApy: number;
  miningApy: number;
  miningEnble: boolean;
  reserveInfo: state.Reserve;

}
import * as state from "./state";
import { getSlndPrice, isMining } from "./util";


//all from https://docs.solend.fi/protocol/addresses



export class lendingInfo implements lendingMarketInfo {
  reserveAddress: PublicKey;
  supplyTokenMint: PublicKey;
  supplyTokenDecimal: BN;
  reserveTokenMint: PublicKey;
  reserveTokenDecimal: BN;
  reserveTokenSupply:BN;
  supplyAmount: BN;
  supplyLimit: BN;
  supplyApy: number;
  miningApy: number;
  miningEnble: boolean;
  reserveInfo: state.Reserve;
  //totalUsdValue: BN;
  constructor(
    reserveAddress: PublicKey,
    supplyTokenMint: PublicKey,
    supplyTokenDecimal: BN,
    reserveTokenMint: PublicKey,
    reserveTokenDecimal: BN,
    reserveTokenSupply:BN,
    supplyAmount: BN,
    supplyLimit: BN,
    supplyApy: number,
    miningApy: number,
    miningEnble: boolean,
    reserveInfo: state.Reserve,
    //totalUsdValue: BN,
  ) {
    this.reserveAddress = reserveAddress;
    this.supplyTokenMint = supplyTokenMint;
    this.supplyTokenDecimal = supplyTokenDecimal;
    this.reserveTokenMint = reserveTokenMint;
    this.reserveTokenDecimal = reserveTokenDecimal;
    this.reserveTokenSupply = reserveTokenSupply;
    this.supplyAmount = supplyAmount;
    this.supplyLimit = supplyLimit;
    this.supplyApy = supplyApy;
    this.miningApy = miningApy;
    this.miningEnble = miningEnble
    this.reserveInfo = reserveInfo;
    //this.totalUsdValue = totalUsdValue;
  }
}

export async function getAllLendingInfo(connection: Connection) {
  const allReserve = await getAllReserve(connection);
  let lendingInfos = <Array<lendingInfo>>[];
  for (let reservesMeta of allReserve) {
    let slndPerYear = info.MININGMULTIPLIER(reservesMeta[0]).div(new BN(`1${''.padEnd(3, '0')}`));
    let borrowedAmount = reservesMeta[1].liquidity.borrowedAmountWads.div(new BN(`1${''.padEnd(18, '0')}`));
    let decimal = new BN(reservesMeta[1].liquidity.mintDecimals).toNumber();

    let availableAmount = reservesMeta[1].liquidity.availableAmount;

    let supplyAmount = borrowedAmount.add(availableAmount);

    let UtilizationRatio = reservesMeta[1].calculateUtilizationRatio();

    let liquidityPrice = reservesMeta[1].liquidity.marketPrice.div(new BN(`1${''.padEnd(18, '0')}`));
    let slndPrice = await getSlndPrice();
    let totalUsdValue
    let supplyUSDValue = 
    supplyAmount
    .div(new BN(`1${''.padEnd(decimal, '0')}`))
    .mul(reservesMeta[1].liquidity.marketPrice)
    .div(new BN(`1${''.padEnd(18, '0')}`));

    let miningApy =  slndPerYear.mul(slndPrice).toNumber()/(supplyUSDValue).toNumber();


    let borrowAPY = reservesMeta[1].calculateBorrowAPY() as number;
    let apy = UtilizationRatio * borrowAPY;
    

    const newinfo = new lendingInfo(
      reservesMeta[0],
      reservesMeta[1].liquidity.mintPubkey,
      reservesMeta[1].liquidity.mintDecimals,
      reservesMeta[1].collateral.reserveTokenMint,
      reservesMeta[1].liquidity.mintDecimals,
      reservesMeta[1].collateral.mintTotalSupply,
      supplyAmount,
      reservesMeta[1].config.depositLimit,
      apy,
      miningApy,
      await isMining(reservesMeta[0]),
      reservesMeta[1]
    )
    lendingInfos.push(newinfo);
    
  }
  

  return lendingInfos;
}
async function getAllReserve(connection: Connection) {
  const programIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 10,
      //offset 10byte
      bytes: info.SOLENDLENDINGMARKETID.toString(),
    }
  }
  const dataSizeFilters: DataSizeFilter = {

    dataSize: info.RESERVELAYOUTSPAN,

  }

  const filters = [programIdMemcmp, dataSizeFilters];

  const config: GetProgramAccountsConfig = { filters: filters }
  const reserveAccounts = await connection.getProgramAccounts(info.SOLENDPROGRAMID, config);
  let reserves = <Array<[PublicKey, state.Reserve]>>[];
  for (let account of reserveAccounts) {

    let info = await state.parseReserveData(account.account.data);
    reserves.push([account.pubkey, info]);
  }

  return reserves;

}
export async function getObligation(connection: Connection, wallet: PublicKey) {
  let obligationAddress = await obligation.getObligationPublicKey(wallet);
  let accountInfo = await connection.getAccountInfo(obligationAddress);
  if (accountInfo?.owner.toString() == info.SOLENDPROGRAMID.toString()) {
    let obligationInfo = obligation.parseObligationData(accountInfo?.data);
    return obligationInfo;
  }
  else { return obligation.defaultObligation() }
}


