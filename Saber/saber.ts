import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter
} from "@solana/web3.js";
import * as info from "./saberInfo"
import * as layout from "./swapInfoLayout"
import { checkWrapped, getAllWrap } from "./wrapInfo"
import { getTokenAccountAmount } from "../util"
import {checkFarming, getAllFarm} from "./farmInfolayout"
export async function getAllSwap(connection: Connection) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 75,
      bytes: info.ADMIN_KEY.toString(),
    }
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 395
  }
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allSaberAccount = await connection.getProgramAccounts(info.SWAP_PROGRAM_ID, config);
  let infoArray: layout.SwapInfo[] = [];
  let wrapInfoArray = await getAllWrap(connection);
  let allFarmInfo = await getAllFarm(connection,info.SABER_QUARRY_REWARDER);
  for (let account of allSaberAccount) {
    if (
    account.pubkey.toString() == "LeekqF2NMKiFNtYD6qXJHZaHx4hUdj4UiPu4t8sz7uK" ||
    account.pubkey.toString() == "2jQoGQRixdcfuRPt9Zui7pk6ivnrQv79mf8h13Tyoa9K"||
    account.pubkey.toString() == "SPaiZAYyJBQHaSjtxFBKtLtQiCuG328r1mTfmvvydR5" ||
    account.pubkey.toString() == "HoNG9Z4jsA1qtkZhDRYBc67LF2cbusZahjyxXtXdKZgR"|| 
    account.pubkey.toString() == "4Fss9Dy3vAUBuQ4SyEZz4vcLxeQqoFLZjdXhEUr3wqz3" 
     ){
      continue;
    }
    let saberAccountInfo = await layout.parseSwapInfoData(account.account.data, account.pubkey);
    if (saberAccountInfo.isPaused){
      continue;
    }
    let mintAwrapped = await checkWrapped(saberAccountInfo.mintA, wrapInfoArray)
    saberAccountInfo.mintAWrapped = mintAwrapped[0];
    if (mintAwrapped[0]) {
      saberAccountInfo.mintAWrapInfo = mintAwrapped[1];
    }
    let mintBwrapped = await checkWrapped(saberAccountInfo.mintB, wrapInfoArray)
    saberAccountInfo.mintBWrapped = mintBwrapped[0];
    if (mintBwrapped[0]) {
      saberAccountInfo.mintBWrapInfo = mintBwrapped[1];
    }
    let farmStarted = checkFarming(allFarmInfo,saberAccountInfo.poolMint);
    if (farmStarted[0]){
      saberAccountInfo.isFarming = true;
      saberAccountInfo.farmingInfo = farmStarted[1];
    }
    infoArray.push(saberAccountInfo)
  }
  return infoArray
}
