import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import {
    Connection, PublicKey, MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter
} from "@solana/web3.js";
import { QURARRY_MINE_PROGRAM_ID } from './saberInfo';
import BN from "bn.js";

export class MinerInfo {
    infoPubkey: PublicKey;
    farmKey: PublicKey;
    owner: PublicKey;
    bump: BN;
    vault: PublicKey;
    rewardsEarned: BN;
    rewardsPerTokenPaid: BN;
    balance: BN;
    index: BN;
    constructor(
        infoPubkey: PublicKey,
        farmKey: PublicKey,
        owner: PublicKey,
        bump: BN,
        vault: PublicKey,
        rewardsEarned: BN,
        rewardsPerTokenPaid: BN,
        balance: BN,
        index: BN,
    ) {
        this.infoPubkey = infoPubkey;
        this.farmKey = farmKey;
        this.owner = owner;
        this.bump = bump;
        this.index = index;
        this.vault = vault;
        this.rewardsEarned = rewardsEarned;
        this.rewardsPerTokenPaid = rewardsPerTokenPaid;
        this.balance = balance;
    }
}

const MINER_LAYOUT = struct([
    publicKey("farmKey"),
    publicKey("owner"),
    u8("bump"),
    publicKey("vault"),
    u64("rewardsEarned"),
    u128("rewardsPerTokenPaid"),
    u64("balance"),
    u64("index"),
]);

export function parseMinerInfo(data:any, miner:PublicKey){
    let dataBuffer = data as Buffer;
    let infoData = dataBuffer.slice(8);
    let newMinerInfo = MINER_LAYOUT.decode(infoData) ;
    let {
        infoPubkey,
        farmKey,
        owner,
        bump,
        vault,
        rewardsEarned,
        rewardsPerTokenPaid,
        balance,
        index,
    } = newMinerInfo;
    return new MinerInfo(
        infoPubkey,
        farmKey,
        owner,
        new BN (bump),
        vault,
        new BN (rewardsEarned),
        new BN (rewardsPerTokenPaid),
        new BN (balance),
        new BN (index),
    )
}

export async function getAllMiner(connection:Connection, wallet:PublicKey){
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
          offset: 8+32,
          bytes: wallet.toString(),
        }
      };
      const sizeFilter: DataSizeFilter = {
        dataSize: 145
      }
      const filters = [adminIdMemcmp, sizeFilter];
      const config: GetProgramAccountsConfig = { filters: filters };
      const allMinerAccount = await connection.getProgramAccounts(QURARRY_MINE_PROGRAM_ID, config);
      let allMinerInfo :MinerInfo[] = [];
      for (let account of allMinerAccount){
          let currentFarmInfo = parseMinerInfo(account.account.data,account.pubkey);
          if(currentFarmInfo.balance == new BN(0)){
              continue;
          }
          allMinerInfo.push(currentFarmInfo);
      }
      return allMinerInfo;
}
export const defaultMiner = new MinerInfo(
    PublicKey.default,
    PublicKey.default,
    PublicKey.default,
    new BN(0),
    PublicKey.default,
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0),
)