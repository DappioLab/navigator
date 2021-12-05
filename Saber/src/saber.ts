import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig
  } from "@solana/web3.js";
import * as info from "./saberInfo"
import * as layout from "./swapInfoLayout"

export async function getallSwap(connection:Connection){
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
          offset: 75,
          //offset 10byte
          bytes: info.ADMIN_KEY.toString(),
        }
      };
      const filters = [adminIdMemcmp];
      const config: GetProgramAccountsConfig = { filters: filters };
      const allSaberAccount = await connection.getProgramAccounts(info.SWAP_PROGRAM_ID,config);
      for (let account of allSaberAccount){
        let saberAccountInfo = layout.parseSwapInfoData(account.account.data);
        console.log(saberAccountInfo)
      }
      
    
}