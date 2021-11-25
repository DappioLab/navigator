
import { publicKey, struct, u64, u128, u8, bool, u16 } from "@project-serum/borsh";

import { Connection, PublicKey } from "@solana/web3.js";
import { Last_update } from "./state";
import BN from "bn.js";
import * as info from "./solend_info"
export interface obligation{
    version: BN;
    lastUpdate: Last_update;
    lendingMarket: PublicKey;
    owner:PublicKey;
    depositedValue:BN;
    borrowedValue:BN;
    allowedBorrowValue:BN;
    unhealthyBorrowValue:BN;
    depositCollateral:obligationCollateral[];
    borrowedLiqudity:obligationLiquidity[];
}

interface obligationCollateral{
  reserve:PublicKey;
  depositedAmount:BN;
  marketValue:BN;
}
interface obligationLiquidity{
  reserve:PublicKey;
  cumulativeBorrowRate:BN;
  borrowedAmount:BN;
  marketValue:BN;
}
const OBLIGATION_LAYOUT = struct([
  u8("version"),
  struct([
      u64("lastUpdatedSlot"),
      bool("stale")
  ], "lastUpdate"),
  publicKey("lendingMarket"),
  publicKey("owner"),
  u128("depositedValue"),
  u128("borrowedValue"),
  u128("allowedBorrowValue"),
  u128("unhealthyBorrowValue"),

]);
const COLLATERAL_LAYOUT = struct([
  publicKey("reserveAddress"),
  u64("depositedAmount"),
  u128("marketValue"),
]);

const LOAN_LAYOUT = struct([
  publicKey("reserveAddress"),
  u128("cumulativeBorrowRate"),
  u128("borrowedAmount"),
  u128("marketValue"),
]);

const U8 = struct([
  u8("amount"),
]);

export async function get_obligation_public_key(wallet: PublicKey){

    const seed = info.SOLEND_LENDING_MARKET_ID.toString().slice(0, 32);
    const obligationAddress = await PublicKey.createWithSeed(
    wallet,
    seed,
    info.SOLEND_PROGRAM_ID,);
    return obligationAddress
}
export async function obligation_created(connection:Connection, wallet: PublicKey ) {
  let obligation_info = await connection.getAccountInfo(await get_obligation_public_key(wallet))
  if (obligation_info?.owner.toString()== info.SOLEND_PROGRAM_ID.toString()){
    return true;
  }
  return false
}

export class Obligation implements obligation{
    version: BN;
    lastUpdate: Last_update;
    lendingMarket: PublicKey;
    owner:PublicKey;
    depositedValue:BN;
    borrowedValue:BN;
    allowedBorrowValue:BN;
    unhealthyBorrowValue:BN;
    depositCollateral:obligationCollateral[];
    borrowedLiqudity:obligationLiquidity[];
    constructor(
    version: BN,
    lastUpdate: Last_update,
    lendingMarket: PublicKey,
    owner:PublicKey,
    depositedValue:BN,
    borrowedValue:BN,
    allowedBorrowValue:BN,
    unhealthyBorrowValue:BN,
    depositCollateral:obligationCollateral[],
    borrowedLiqudity:obligationLiquidity[],
    ){
      this.version = version;
      this.lastUpdate = lastUpdate;
      this.lendingMarket = lendingMarket;
      this.owner = owner;
      this.depositedValue = depositedValue;
      this.borrowedValue = borrowedValue;
      this.allowedBorrowValue = allowedBorrowValue;
      this.unhealthyBorrowValue = unhealthyBorrowValue;
      this.depositCollateral = depositCollateral;
      this.borrowedLiqudity = borrowedLiqudity;
    }
}
class obligationCollateral implements obligationCollateral{
  reserve:PublicKey;
  depositedAmount:BN;
  marketValue:BN;
  constructor(
    reserve:PublicKey,
    depositedAmount:BN,
    marketValue:BN,
  ){
    this.reserve = reserve;
    this.depositedAmount = depositedAmount;
    this.marketValue = marketValue;
  }
}

class obligationLiquidity implements obligationLiquidity{
  reserve:PublicKey;
  cumulativeBorrowRate:BN;
  borrowedAmount:BN;
  marketValue:BN;
  constructor(
    reserve:PublicKey,
    cumulativeBorrowRate:BN,
    borrowedAmount:BN,
    marketValue:BN,
  ){
    this.reserve = reserve;
    this.cumulativeBorrowRate = cumulativeBorrowRate;
    this.borrowedAmount = borrowedAmount;
    this.marketValue = marketValue;
  }
}
export function parseObligationData(data: any){
  let data_buffer = data as Buffer;
  let amountData = data_buffer.slice(OBLIGATION_LAYOUT.span+64,OBLIGATION_LAYOUT.span+64+2);
  
  let decoded_info = OBLIGATION_LAYOUT.decode(data_buffer);
  let {version,lastUpdate,lendingMarket,owner,depositedValue,borrowedValue,allowedBorrowValue,unhealthyBorrowValue} = decoded_info;
  let supplyedLen = U8.decode(amountData.slice(0,1)).amount as number;
  let borroeedLen = U8.decode(amountData.slice(1,2)).amount as number;
  let all_posposition = data_buffer.slice(OBLIGATION_LAYOUT.span+66);
  let depositCollateral:obligationCollateral[] = [];
  let borrowedLiquidity:obligationLiquidity[] = [];
  if (supplyedLen > 0 ){
    for (let index = 0; index < supplyedLen; index++){
      
      let offset = (COLLATERAL_LAYOUT.span+32)*index
      //console.log(offset);
      let data = all_posposition.slice(offset)
      let collateralInfo = parseCollateralData(data);
      depositCollateral.push(collateralInfo);
    }
  }
  if (borroeedLen > 0 ){
    for (let index = 0; index < borroeedLen; index++){
      
      let offset = ((COLLATERAL_LAYOUT.span+32)* supplyedLen) + (LOAN_LAYOUT.span+32)*index
      //console.log(offset);
      let data = all_posposition.slice(offset)
      let supply_info = LOAN_LAYOUT.decode(data);
      let {reserveAddress,cumulativeBorrowRate,borrowedAmount,marketValue} = supply_info;
      //console.log(borrowedAmount.div(new BN(`1${''.padEnd(18, '0')}`)).toString());
      borrowedLiquidity.push( new obligationLiquidity(reserveAddress,cumulativeBorrowRate,borrowedAmount.div(new BN(`1${''.padEnd(18, '0')}`)),marketValue));
    }
  }
  //console.log(supplyedLen,borroeedLen,"\n",);
  let obligation_info = new Obligation(version,lastUpdate,lendingMarket,owner,depositedValue,borrowedValue,allowedBorrowValue,unhealthyBorrowValue,depositCollateral,borrowedLiquidity);
  return obligation_info;
}
export function parseCollateralData(data:any){
  let collateralInfo = COLLATERAL_LAYOUT.decode(data);
  let {reserveAddress,depositedAmount,marketValue } = collateralInfo;
  let collateral = new obligationCollateral(reserveAddress,depositedAmount,marketValue);
  return collateral;
}