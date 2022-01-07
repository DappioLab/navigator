import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter,
    PublicKey
} from "@solana/web3.js";
import * as info from './info';
import { parceUserVaultData, UserVault } from "./userVault";
import * as vaultInfo from "./vaultInfo";



export async function getAllVault(connection: Connection) {
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
            offset: 8,
            bytes: info.IDENTIFIER.toString(),
        }
    };
    const sizeFilter: DataSizeFilter = {
        dataSize: 773
    }
    const filters = [adminIdMemcmp,sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allVaultAccount = await connection.getProgramAccounts(info.KATANA_PROGRAM_ID, config);
    let allVault :vaultInfo.Vault[] = []
    for(let accountInfo of allVaultAccount){
        allVault.push( await vaultInfo.parceVaultData(accountInfo.account.data,accountInfo.pubkey))
    }
    return allVault;
}
export async function getVault(connection: Connection, infoPubkey: PublicKey) {
    const vaultAccount = await connection.getAccountInfo(infoPubkey);
    let vault = await vaultInfo.parceVaultData(vaultAccount?.data, infoPubkey);
    
    return vault;
}

export async function getAllUserVault(connection: Connection,wallet:PublicKey) {
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
            offset: 8,
            bytes: wallet.toString(),
        }
    };
    const sizeFilter: DataSizeFilter = {
        dataSize: 121
    }
    const filters = [adminIdMemcmp,sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allUserVaultAccount = await connection.getProgramAccounts(info.KATANA_PROGRAM_ID, config);
    let allUserVault :UserVault[] = []
    for(let accountInfo of allUserVaultAccount){
        allUserVault.push( await parceUserVaultData(accountInfo.account.data,accountInfo.pubkey))
    }
    return allUserVault;
}
