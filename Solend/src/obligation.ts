
import { publicKey, struct, u64, u128, u8, bool } from "@project-serum/borsh";

import { Connection, PublicKey } from "@solana/web3.js";
import { LastUpdate } from "./state";
import BN from "bn.js";
import * as info from "./solendInfo"
import { lendingInfo } from "./solend";
export interface obligation{
    version: BN;
    lastUpdate: LastUpdate;
    lendingMarket: PublicKey;
    owner:PublicKey;
    depositedValue:BN;
    borrowedValue:BN;
    allowedBorrowValue:BN;
    unhealthyBorrowValue:BN;
    depositCollateral:obligationCollateral[];
    borrowedLiqudity:obligationLiquidity[];
    update(lendingInfo:lendingInfo[]):void;
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
const OBLIGATIONLAYOUT = struct([
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
const COLLATERALLAYOUT = struct([
  publicKey("reserveAddress"),
  u64("depositedAmount"),
  u128("marketValue"),
]);

const LOANLAYOUT = struct([
  publicKey("reserveAddress"),
  u128("cumulativeBorrowRate"),
  u128("borrowedAmount"),
  u128("marketValue"),
]);

const U8 = struct([
  u8("amount"),
]);

export async function getObligationPublicKey(wallet: PublicKey){

    const seed = info.SOLENDLENDINGMARKETID.toString().slice(0, 32);
    const obligationAddress = await PublicKey.createWithSeed(
    wallet,
    seed,
    info.SOLENDPROGRAMID,);
    return obligationAddress
}
export async function obligationCreated(connection:Connection, wallet: PublicKey ) {
  let obligationInfo = await connection.getAccountInfo(await getObligationPublicKey(wallet))
  if (obligationInfo?.owner.toString()== info.SOLENDPROGRAMID.toString()){
    return true;
  }
  return false
}

export class Obligation implements obligation{
    version: BN;
    lastUpdate: LastUpdate;
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
    lastUpdate: LastUpdate,
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
    update(lendingInfos: lendingInfo[]){
      let unhealthyBorrowValue = new BN(0);
      let borrowedValue = new BN(0);
      let depositedValue = new BN(0);
      for (let depositedReserve of this.depositCollateral  ){
        for(let lendingInfo of lendingInfos){
          if (depositedReserve.reserve.toString()==lendingInfo.reserveAddress.toString()){
            //console.log(lendingInfo.supplyAmount.toString(),lendingInfo.reserveInfo.collateral.mintTotalSupply.toString())
            let decimal = new BN(lendingInfo.reserveTokenDecimal).toNumber();
            let thisDepositedValue = 
              depositedReserve.depositedAmount
              .mul(lendingInfo.supplyAmount)
              .mul(lendingInfo.reserveInfo.liquidity.marketPrice)
              .div(lendingInfo.reserveInfo.collateral.mintTotalSupply)
              .div(new BN(`1${''.padEnd(decimal, '0')}`));
            depositedValue = depositedValue.add(thisDepositedValue)
            //console.log(lendingInfo.reserveInfo.config.liquidationThreshold);
            let thisUnhealthyBorrowValue = new BN(lendingInfo.reserveInfo.config.liquidationThreshold).mul( thisDepositedValue).div(new BN(`1${''.padEnd(2, '0')}`));;
            unhealthyBorrowValue = unhealthyBorrowValue.add(thisUnhealthyBorrowValue);

            
          }
        }
      }
      for(let borrowedReserve of this.borrowedLiqudity){
        for(let lendingInfo of lendingInfos){
          if (borrowedReserve.reserve.toString()==lendingInfo.reserveAddress.toString()){
            let decimal = new BN(lendingInfo.reserveTokenDecimal).toNumber();
            //console.log(lendingInfo.reserveInfo.liquidity.marketPrice.toString())
            let thisborrowedValue = 
            borrowedReserve.borrowedAmount
              .mul(lendingInfo.reserveInfo.liquidity.marketPrice)
              .div(new BN(`1${''.padEnd(decimal, '0')}`));
            borrowedValue = borrowedValue.add(thisborrowedValue);
          }
        }
      }
      this.borrowedValue = borrowedValue;
      this.depositedValue = depositedValue;
      this.unhealthyBorrowValue = unhealthyBorrowValue;
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
  let dataBuffer = data as Buffer;
  let amountData = dataBuffer.slice(OBLIGATIONLAYOUT.span+64,OBLIGATIONLAYOUT.span+64+2);
  
  let decodedInfo = OBLIGATIONLAYOUT.decode(dataBuffer);
  let {version,lastUpdate,lendingMarket,owner,depositedValue,borrowedValue,allowedBorrowValue,unhealthyBorrowValue} = decodedInfo;
  let supplyedLen = U8.decode(amountData.slice(0,1)).amount as number;
  let borroeedLen = U8.decode(amountData.slice(1,2)).amount as number;
  let allPosposition = dataBuffer.slice(OBLIGATIONLAYOUT.span+66);
  let depositCollateral:obligationCollateral[] = [];
  let borrowedLiquidity:obligationLiquidity[] = [];
  if (supplyedLen > 0 ){
    for (let index = 0; index < supplyedLen; index++){
      
      let offset = (COLLATERALLAYOUT.span+32)*index
      //console.log(offset);
      let data = allPosposition.slice(offset)
      let collateralInfo = parseCollateralData(data);
      depositCollateral.push(collateralInfo);
    }
  }
  if (borroeedLen > 0 ){
    for (let index = 0; index < borroeedLen; index++){
      
      let offset = ((COLLATERALLAYOUT.span+32)* supplyedLen) + (LOANLAYOUT.span+32)*index
      //console.log(offset);
      let data = allPosposition.slice(offset)
      let supplyInfo = LOANLAYOUT.decode(data);
      let {reserveAddress,cumulativeBorrowRate,borrowedAmount,marketValue} = supplyInfo;
      //console.log(borrowedAmount.div(new BN(`1${''.padEnd(18, '0')}`)).toString());
      borrowedLiquidity.push( new obligationLiquidity(reserveAddress,cumulativeBorrowRate,borrowedAmount.div(new BN(`1${''.padEnd(18, '0')}`)),marketValue));
    }
  }
  //console.log(supplyedLen,borroeedLen,"\n",);
  let obligationInfo = new Obligation(version,lastUpdate,lendingMarket,owner,depositedValue,borrowedValue,allowedBorrowValue,unhealthyBorrowValue,depositCollateral,borrowedLiquidity);
  return obligationInfo;
}
export function parseCollateralData(data:any){
  let collateralInfo = COLLATERALLAYOUT.decode(data);
  let {reserveAddress,depositedAmount,marketValue } = collateralInfo;
  let collateral = new obligationCollateral(reserveAddress,depositedAmount,marketValue);
  return collateral;
}
export function defaultObligation(){
  return (new Obligation(new BN(1),new LastUpdate(new BN(0),false),PublicKey.default,PublicKey.default,new BN(0),new BN(0),new BN(0),new BN(0),[],[]));
}