import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { Connection, PublicKey,MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter } from "@solana/web3.js";
import { QURARRY_MINE_PROGRAM_ID} from './saberInfo';
import BN from "bn.js";

export class FarmInfo {
    infoPubkey:PublicKey;
    rewarderKey: PublicKey;
    tokenMintKey: PublicKey;
    bump: BN;
    index: BN;
    tokenMintDecimals: BN;
    famineTs: BN;
    lastUpdateTs: BN;
    rewardsPerTokenStored: BN;
    annualRewardsRate: BN;
    rewardsShare: BN;
    totalTokensDeposited: BN;
    numMiners: BN;
    constructor(
        infoPubkey:PublicKey,
        rewarderKey: PublicKey,
        tokenMintKey: PublicKey,
        bump: BN,
        index: BN,
        tokenMintDecimals: BN,
        famineTs: BN,
        lastUpdateTs: BN,
        rewardsPerTokenStored: BN,
        annualRewardsRate: BN,
        rewardsShare: BN,
        totalTokensDeposited: BN,
        numMiners: BN
    ) {
        this.infoPubkey = infoPubkey;
        this.rewarderKey = rewarderKey;
        this.tokenMintKey = tokenMintKey;
        this.bump = bump;
        this.index = index;
        this.tokenMintDecimals = tokenMintDecimals;
        this.famineTs = famineTs;
        this.lastUpdateTs = lastUpdateTs;
        this.rewardsPerTokenStored = rewardsPerTokenStored;
        this.annualRewardsRate = annualRewardsRate;
        this.rewardsShare = rewardsShare;
        this.totalTokensDeposited = totalTokensDeposited;
        this.numMiners = numMiners;
    }
}

const FARM_LAYOUT = struct([
    publicKey("rewarderKey"),
    publicKey("tokenMintKey"),
    u8("bump"),
    u16("index"),
    u8("tokenMintDecimals"),
    i64("famineTs"),
    i64("lastUpdateTs"),
    u128("rewardsPerTokenStored"),
    u64("annualRewardsRate"),
    u64("rewardsShare"),
    u64("totalTokensDeposited"),
    u64("numMiners"),
]);
export function parseFarmInfo(data:any, farmPubkey:PublicKey){
    let dataBuffer = data as Buffer;
    let infoData = dataBuffer.slice(8);
    let newFarmInfo = FARM_LAYOUT.decode(infoData);
    let {rewarderKey,
        tokenMintKey,
        bump,
        index,
        tokenMintDecimals,
        famineTs,
        lastUpdateTs,
        rewardsPerTokenStored,
        annualRewardsRate,
        rewardsShare,
        totalTokensDeposited,
        numMiners,} = newFarmInfo;
    return new FarmInfo(
        farmPubkey,
        rewarderKey,
        tokenMintKey,
        new BN (bump),
        new BN (index),
        new BN (tokenMintDecimals),
        new BN (famineTs),
        new BN (lastUpdateTs),
        new BN (rewardsPerTokenStored),
        new BN (annualRewardsRate),
        new BN (rewardsShare),
        new BN (totalTokensDeposited),
        new BN (numMiners));
}
export async function getAllFarm(connection:Connection, rewarderKey:PublicKey){
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
          offset: 8,
          bytes: rewarderKey.toString(),
        }
      };
      const sizeFilter: DataSizeFilter = {
        dataSize: 140
      }
      const filters = [adminIdMemcmp, sizeFilter];
      const config: GetProgramAccountsConfig = { filters: filters };
      const allFarmAccount = await connection.getProgramAccounts(QURARRY_MINE_PROGRAM_ID, config);
      let allFarmInfo :FarmInfo[] = [];
      for (let account of allFarmAccount){
          let currentFarmInfo = parseFarmInfo(account.account.data,account.pubkey);
          allFarmInfo.push(currentFarmInfo);
      }
      return allFarmInfo;
}
export function checkFarming(allFarmInfo : FarmInfo[],mintPubkey:PublicKey):[boolean,FarmInfo] {
    for(let info of allFarmInfo){
        if (info.tokenMintKey.toString() == mintPubkey.toString()){
            return [true,info]
        }
    }
    return [false,defaultFarm()]
}
export function defaultFarm(){
    return new FarmInfo(
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
    )
}
export async function getMinerKey(wallet:PublicKey,farmPubkey:PublicKey) {
    let minerBytes = new Uint8Array(Buffer.from('Miner', 'utf-8'))
    let miner = (await PublicKey.findProgramAddress(
        [
            minerBytes,
            farmPubkey.toBuffer(),
            wallet.toBuffer()
        ]
        ,QURARRY_MINE_PROGRAM_ID));
    return miner;
}
export async function minerCreated(wallet:PublicKey,info:FarmInfo,connection:Connection) {
    let miner = await getMinerKey(wallet,info.infoPubkey);
    let minerAccountInfo = await connection.getAccountInfo(miner[0]);
    //console.log(miner[0].toString())
    if (minerAccountInfo?.owner.toString() == QURARRY_MINE_PROGRAM_ID.toString()){

        return true;
    }
    return false;
}
