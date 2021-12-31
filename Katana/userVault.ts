import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { KATANA_PROGRAM_ID } from "./info";
export interface UserVaultInterface {
    infoPubkey: PublicKey;
    owner: PublicKey;
    PendingDepositDataRound: BN;
    PendingDepositDataAmount: BN;
    PendingDepositDataUnredeemedShares: BN;
    PendingWithdrawDataRound: BN;
    PendingWithdrawDatShares: BN;
    bump: BN;
}

export class UserVault implements UserVaultInterface {
    infoPubkey: PublicKey;
    owner: PublicKey;
    PendingDepositDataRound: BN;
    PendingDepositDataAmount: BN;
    PendingDepositDataUnredeemedShares: BN;
    PendingWithdrawDataRound: BN;
    PendingWithdrawDatShares: BN;
    bump: BN;
    constructor(
        infoPubkey: PublicKey,
        owner: PublicKey,
        PendingDepositDataRound: BN | number,
        PendingDepositDataAmount: BN | number,
        PendingDepositDataUnredeemedShares: BN | number,
        PendingWithdrawDataRound: BN | number,
        PendingWithdrawDatShares: BN | number,
        bump: BN | number,
    ) {
        this.infoPubkey = infoPubkey;
        this.owner = owner;
        this.PendingDepositDataRound = new BN(PendingDepositDataRound);
        this.PendingDepositDataAmount = new BN(PendingDepositDataAmount);
        this.PendingDepositDataUnredeemedShares = new BN(PendingDepositDataUnredeemedShares);
        this.PendingWithdrawDataRound = new BN(PendingWithdrawDataRound);
        this.PendingWithdrawDatShares = new BN(PendingWithdrawDatShares);
        this.bump = new BN(bump);
    }
}
export const USER_VAULT_LAYOUT = struct([
    publicKey("owner"),
    u128("PendingDepositDataRound"),
    u128("PendingDepositDataAmount"),
    u128("PendingDepositDataUnredeemedShares"),
    u128("PendingWithdrawDataRound"),
    u128("PendingWithdrawDatShares"),
    u8("bump"),
]);
export async function parceUserVaultData(data: any, infoPubkey: PublicKey) {
    let dataBuffer = data as Buffer;
    let userData = dataBuffer.slice(8);
    let userVault = USER_VAULT_LAYOUT.decode(userData);
    let {
        owner,
        PendingDepositDataRound,
        PendingDepositDataAmount,
        PendingDepositDataUnredeemedShares,
        PendingWithdrawDataRound,
        PendingWithdrawDatShares,
        bump,
    } = userVault;
    return new UserVault(
        infoPubkey,
        owner,
        PendingDepositDataRound,
        PendingDepositDataAmount,
        PendingDepositDataUnredeemedShares,
        PendingWithdrawDataRound,
        PendingWithdrawDatShares,
        bump)
}

export async function getUserVaultAddress(wallet: PublicKey, vault: PublicKey) {
    let prefix = "user-account"
    let minerBytes = new Uint8Array(Buffer.from(prefix, 'utf-8'))
    let address = await PublicKey.findProgramAddress(
        [   
            minerBytes,
            wallet.toBuffer(),
            vault.toBuffer(),
        ],
        KATANA_PROGRAM_ID)
    return address;
}
export async function checkUserVaultCreated(wallet:PublicKey,vault :PublicKey,connection:Connection) {
    let address = await getUserVaultAddress(wallet,vault)
    let accountInfo = await connection.getAccountInfo(address[0]);
    if (accountInfo?.owner.toString() == KATANA_PROGRAM_ID.toString()){
        return true;
    }
    return false;
}