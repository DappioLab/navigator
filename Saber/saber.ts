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
export async function getallSwap(connection: Connection) {
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
  for (let account of allSaberAccount) {

    let saberAccountInfo = await layout.parseSwapInfoData(account.account.data, account.pubkey);
    
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
    infoArray.push(saberAccountInfo)
  }
  return infoArray
}