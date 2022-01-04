import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
    PublicKey,
    SYSVAR_CLOCK_PUBKEY,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import BN from "bn.js";
import {
    publicKey,
    struct,
    u64,
    u128,
    u8,
    bool,
    u16,
} from "@project-serum/borsh";
import { getUserVaultAddress } from ".";
import { KATANA_PROGRAM_ID } from "./info";
import { Vault } from "./vaultInfo";


export async function createUserVaultIx(vault: Vault, wallet: PublicKey) {
    let userVault = await getUserVaultAddress(wallet, vault.infoPubkey)
    const dataLayout = struct([
        u8('bump'),
    ]);
    let data = Buffer.alloc(dataLayout.span + 8);
    dataLayout.encode(
        {
            amount: new BN(userVault[1]),
        },
        data,
    );
    let datahex = data.toString('hex');
    let datastring = '924464453f2eb6c7'.concat(datahex);
    data = Buffer.from(datastring, "hex")

    let keys = [
        { pubkey: userVault[0], isSigner: false, isWritable: true },
        { pubkey: vault.infoPubkey, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: false, isWritable: false },
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },

    ]
    return new TransactionInstruction({
        keys, programId: KATANA_PROGRAM_ID, data
    })
}

export async function depositIx(vault: Vault, wallet: PublicKey,tokenAccount:PublicKey, amount: BN) {
    let userVault = await getUserVaultAddress(wallet, vault.infoPubkey)
    const dataLayout = struct([
        u64('amount'),
    ]);
    let data = Buffer.alloc(dataLayout.span + 8);
    dataLayout.encode(
        {
            amount: new BN(amount),
        },
        data,
    );
    let datahex = data.toString('hex');
    let datastring = 'f223c68952e1f2b6'.concat(datahex);
    data = Buffer.from(datastring, "hex")
    let keys = [
        { pubkey: vault.infoPubkey, isSigner: false, isWritable: true },
        { pubkey: await vault.getPricePerPage(), isSigner: false, isWritable: false },
        { pubkey: userVault[0], isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: vault.underlyingTokenVault, isSigner: false, isWritable: true },
        { pubkey: vault.underlyingTokenMint, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },


    ]
    return new TransactionInstruction({
        keys, programId: KATANA_PROGRAM_ID, data
    })
}
export async function claimShareIx(vault: Vault, wallet: PublicKey,tokenAccount:PublicKey){
    let userVault = await getUserVaultAddress(wallet, vault.infoPubkey)
    let data = Buffer.alloc(8);
    let datastring = '82831ded86146ef5'
    data = Buffer.from(datastring, "hex")
    let keys = [
        { pubkey: vault.infoPubkey, isSigner: false, isWritable: true },
        { pubkey: await vault.getPricePerPage(), isSigner: false, isWritable: false },
        { pubkey: userVault[0], isSigner: false, isWritable: true },
        { pubkey: vault.underlyingTokenMint, isSigner: false, isWritable: false },
        { pubkey: vault.derivativeTokenMint, isSigner: false, isWritable: false },
        { pubkey: vault.derivativeTokenVault, isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: vault.vaultAuthority, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
    return new TransactionInstruction({
        keys, programId: KATANA_PROGRAM_ID, data
    })
}
    ]
    return new TransactionInstruction({
        keys, programId: KATANA_PROGRAM_ID, data
    })
}