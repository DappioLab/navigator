import {
    Connection,
    MemcmpFilter,
    GetProgramAccountsConfig,
    DataSizeFilter,
    PublicKey
} from "@solana/web3.js";
import * as info from './info';
import { getAllOptionPrams } from "./optionInfo";
import { parseUserVaultData, UserVault } from "./userVault";
import * as vaultInfo from "./vaultInfo";



export async function getAllVault(connection: Connection) {
    const adminIdMemcmp: MemcmpFilter = {
        memcmp: {
            offset: 8,
            bytes: info.ADMIN.toString(),
        }
    };
    const sizeFilter: DataSizeFilter = {
        dataSize: 741
    }
    const filters = [adminIdMemcmp,sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allVaultAccount = await connection.getProgramAccounts(info.KATANA_PROGRAM_ID, config);
    let allVault :vaultInfo.Vault[] = []
    let optionPrams = await getAllOptionPrams(connection);
    for (let accountInfo of allVaultAccount) {
        for (let optionPram of optionPrams) {
            if (optionPram.vault.toString() == accountInfo.pubkey.toString()) {
                allVault.push(await vaultInfo.parseVaultData(accountInfo.account.data, accountInfo.pubkey, optionPram))
            }
        }
    }
    return allVault;
}
export async function getVault(connection: Connection, infoPubkey: PublicKey) {
    const vaultAccount = await connection.getAccountInfo(infoPubkey);
    let optionPrams = await getAllOptionPrams(connection);
    let vault!: vaultInfo.Vault ;
    for (let optionPram of optionPrams) {
        if (optionPram.vault.toString() == infoPubkey.toString()) {
            vault = await vaultInfo.parseVaultData(vaultAccount?.data, infoPubkey, optionPram);
        }
    }
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
        allUserVault.push( await parseUserVaultData(accountInfo.account.data,accountInfo.pubkey))
    }
    return allUserVault;
}
