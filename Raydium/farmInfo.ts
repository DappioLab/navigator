import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
// @ts-ignore
import { blob, nu64, seq } from 'buffer-layout';

import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { } from "./info";
import { TokenAccount, parseTokenAccount } from "../util"
export interface FarmInfoInterface {
    infoPubkey: PublicKey;
    version: number;
    state: BN;
    nonce: BN;
    poolLpTokenAccountPubkey: PublicKey;
    poolRewardTokenAccountPubkey: PublicKey;
    owner: PublicKey;
    totalReward: BN;
    perShare: BN;
    perBlock: BN;
    lastBlock: BN
    totalRewardB?: BN;
    perShareB?: BN;
    perBlockB?: BN;
    poolRewardTokenAccountPubkeyB?: PublicKey;
    poolLpTokenAccount?: TokenAccount;
    poolRewardTokenAccount?: TokenAccount;
    poolRewardTokenAccountB?: TokenAccount;
}

export class FarmInfo implements FarmInfoInterface {
    infoPubkey: PublicKey;
    version: number;
    state: BN;
    nonce: BN;
    poolLpTokenAccountPubkey: PublicKey;
    poolRewardTokenAccountPubkey: PublicKey;
    owner: PublicKey;
    totalReward: BN;
    perShare: BN;
    perBlock: BN;
    lastBlock: BN;
    totalRewardB?: BN;
    perShareB?: BN;
    perBlockB?: BN;
    poolRewardTokenAccountPubkeyB?: PublicKey;
    poolLpTokenAccount?: TokenAccount;
    poolRewardTokenAccount?: TokenAccount;
    poolRewardTokenAccountB?: TokenAccount;
    constructor(
        infoPubkey: PublicKey,
        version: number,
        state: BN,
        nonce: BN,
        poolLpTokenAccountPubkey: PublicKey,
        poolRewardTokenAccountPubkey: PublicKey,
        owner: PublicKey,
        totalReward: BN,
        perShare: BN,
        perBlock: BN,
        lastBlock: BN,
        totalRewardB?: BN,
        perShareB?: BN,
        perBlockB?: BN,
        poolRewardTokenAccountPubkeyB?: PublicKey,
    ) {
        this.infoPubkey = infoPubkey
        this.version = version
        this.state = state
        this.nonce = nonce
        this.poolLpTokenAccountPubkey = poolLpTokenAccountPubkey
        this.poolRewardTokenAccountPubkey = poolRewardTokenAccountPubkey
        this.owner = owner
        this.totalReward = totalReward
        this.perShare = perShare
        this.perBlock = perBlock
        this.lastBlock = lastBlock
        this.totalRewardB = totalRewardB
        this.perShareB = perShareB
        this.perBlockB = perBlockB
        this.poolRewardTokenAccountPubkeyB = poolRewardTokenAccountPubkeyB
    }
    async updateAllTokenAccount(connection: Connection) {
        let pubkeys: PublicKey[] = [this.poolLpTokenAccountPubkey, this.poolRewardTokenAccountPubkey];
        if (this.poolRewardTokenAccountPubkeyB) {
            pubkeys.push(this.poolRewardTokenAccountPubkeyB)
        }
        let allToken = await connection.getMultipleAccountsInfo(pubkeys);
        this.poolLpTokenAccount = parseTokenAccount(allToken[0]?.data, this.poolLpTokenAccountPubkey)
        this.poolRewardTokenAccount = parseTokenAccount(allToken[1]?.data, this.poolRewardTokenAccountPubkey)
        if (this.poolRewardTokenAccountPubkeyB) {
            this.poolRewardTokenAccountB = parseTokenAccount(allToken[2]?.data, this.poolRewardTokenAccountPubkeyB)
        }
    }
}

export const STAKE_INFO_LAYOUT = struct([
    u64('state'),
    u64('nonce'),
    publicKey('poolLpTokenAccountPubkey'),
    publicKey('poolRewardTokenAccountPubkey'),
    publicKey('owner'),
    publicKey('feeOwner'),
    u64('feeY'),
    u64('feeX'),
    u64('totalReward'),
    u128('rewardPerShareNet'),
    u64('lastBlock'),
    u64('rewardPerBlock')
])
export const STAKE_INFO_LAYOUT_V4 = struct([
    u64('state'),
    u64('nonce'),
    publicKey('poolLpTokenAccountPubkey'),
    publicKey('poolRewardTokenAccountPubkey'),
    u64('totalReward'),
    u128('perShare'),
    u64('perBlock'),
    u8('option'),
    publicKey('poolRewardTokenAccountPubkeyB'),
    blob(7),
    u64('totalRewardB'),
    u128('perShareB'),
    u64('perBlockB'),
    u64('lastBlock'),
    publicKey('owner')
])

export function parseFarmV1(data: any, infoPubkey: PublicKey) {
    let farmData = Buffer.from(data);
    let rawFarmData = STAKE_INFO_LAYOUT.decode(farmData);
    let {
        state,
        nonce,
        poolLpTokenAccountPubkey,
        poolRewardTokenAccountPubkey,
        owner,
        feeOwner,
        feeY,
        feeX,
        totalReward,
        rewardPerShareNet,
        lastBlock,
        rewardPerBlock
    } = rawFarmData;
    return new FarmInfo(
        infoPubkey,
        1,
        state,
        nonce,
        poolLpTokenAccountPubkey,
        poolRewardTokenAccountPubkey,
        owner,
        totalReward,
        rewardPerShareNet,
        rewardPerBlock,
        lastBlock,
    )
}
export function parseFarmV45(data: any, infoPubkey: PublicKey, version: number) {
    let farmData = Buffer.from(data);
    let rawFarmData = STAKE_INFO_LAYOUT_V4.decode(farmData);
    let {
        state,
        nonce,
        poolLpTokenAccountPubkey,
        poolRewardTokenAccountPubkey,
        totalReward,
        perShare,
        perBlock,
        option,
        poolRewardTokenAccountPubkeyB,
        totalRewardB,
        perShareB,
        perBlockB,
        lastBlock,
        owner

    } = rawFarmData;
    return new FarmInfo(infoPubkey, version, state, nonce, poolLpTokenAccountPubkey, poolRewardTokenAccountPubkey, owner, totalReward, perShare, perBlock, lastBlock, totalRewardB, perShareB, perBlockB, poolRewardTokenAccountPubkeyB);
}

export async function updateAllFarmToken(farms: FarmInfo[], connection: Connection) {
    let allLPPubkey: PublicKey[] = []
    let allAccountInfo: AccountInfo<Buffer>[] = []
    for (let index = 0; index < farms.length; index++) {
        allLPPubkey.push(farms[index].poolLpTokenAccountPubkey);
        //console.log(allLPPubkey.length)
        if (index % 99 == 98) {
            let accounts =( await connection.getMultipleAccountsInfo(allLPPubkey)) as AccountInfo<Buffer>[]
            //console.log(accounts)
            allAccountInfo = allAccountInfo.concat(accounts)
            //console.log(allAccountInfo)
            allLPPubkey = [];
        }
        
    }
    allAccountInfo = allAccountInfo.concat((await connection.getMultipleAccountsInfo(allLPPubkey)) as AccountInfo<Buffer>[])
    for (let index = 0; index < farms.length; index++) {
        //console.log(allAccountInfo[index]?.owner.toString())
        if (allAccountInfo[index]?.data) {
            farms[index].poolLpTokenAccount = parseTokenAccount(allAccountInfo[index]?.data, farms[index].poolLpTokenAccountPubkey)
        }
    }

}