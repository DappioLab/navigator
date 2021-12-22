import {
  Connection,
  PublicKey,
  GetProgramAccountsConfig,
  MemcmpFilter,
  DataSizeFilter,
} from "@solana/web3.js";
import BN from "bn.js";
import * as info from "./larixInfo";
interface lendingMarketInfo {
  reserveAddress: PublicKey;
  supplyTokenMint: PublicKey;
  supplyTokenDecimal: BN;
  reserveTokenMint: PublicKey;
  reserveTokenDecimal: BN;
  reserveTokenSupply: BN;
  supplyAmount: BN;
  supplyApy: number;
  miningApy: number;
  miningEnble: boolean;
  reserveInfo: state.Reserve;
}
import * as state from "./state";

export class lendingInfo implements lendingMarketInfo {
  reserveAddress: PublicKey;
  supplyTokenMint: PublicKey;
  supplyTokenDecimal: BN;
  reserveTokenMint: PublicKey;
  reserveTokenDecimal: BN;
  reserveTokenSupply: BN;
  supplyAmount: BN;
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
    reserveTokenSupply: BN,
    supplyAmount: BN,
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
    this.supplyApy = supplyApy;
    this.miningApy = miningApy;
    this.miningEnble = miningEnble;
    this.reserveInfo = reserveInfo;
    //this.totalUsdValue = totalUsdValue;
  }
}

export async function getAllLendingInfo(connection: Connection) {
  const allReserve = await getAllReserve(connection);
  let lendingInfos = <Array<lendingInfo>>[];
  for (let reservesMeta of allReserve) {
    let miningApy = 0;
    let borrowedAmount = reservesMeta.liquidity.borrowedAmountWads.div(
      new BN(`1${"".padEnd(18, "0")}`),
    );
    let decimal = new BN(reservesMeta.liquidity.mintDecimals).toNumber();

    let availableAmount = reservesMeta.liquidity.availableAmount;

    let supplyAmount = borrowedAmount.add(availableAmount);

    let UtilizationRatio = reservesMeta.calculateUtilizationRatio();
    let borrowAPY = reservesMeta.calculateBorrowAPY() as number;
    let apy = UtilizationRatio * borrowAPY;

    const newinfo = new lendingInfo(
      reservesMeta.infoPubkey,
      reservesMeta.liquidity.mintPubkey,
      reservesMeta.liquidity.mintDecimals,
      reservesMeta.collateral.reserveTokenMint,
      reservesMeta.liquidity.mintDecimals,
      reservesMeta.collateral.mintTotalSupply,
      supplyAmount,
      apy,
      miningApy,
      true,
      reservesMeta,
    );
    lendingInfos.push(newinfo);
  }

  return lendingInfos;
}
async function getAllReserve(connection: Connection) {
  const programIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 10,
      //offset 10byte
      bytes: info.LARIX_MARKET_ID.toString(),
    },
  };
  const dataSizeFilters: DataSizeFilter = {
    dataSize: info.RESERVELAYOUTSPAN,
  };

  const filters = [programIdMemcmp, dataSizeFilters];

  const config: GetProgramAccountsConfig = { filters: filters };
  const reserveAccounts = await connection.getProgramAccounts(
    info.LARIX_PROGRAM_ID,
    config,
  );
  let reserves = <Array<state.Reserve>>[];
  for (let account of reserveAccounts) {
    let info = await state.parseReserveData(
      account.account.data,
      account.pubkey,
    );
    reserves.push(info);
  }

  return reserves;
}
