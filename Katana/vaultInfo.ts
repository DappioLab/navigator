import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { KATANA_PROGRAM_ID } from "./info";
export interface VaultInterface {
    infoPubkey: PublicKey;
    admin: PublicKey;
    pendingAdmin: PublicKey;
    vaultAuthority: PublicKey;
    cap: BN;
    lockedAmount: BN;
    lastLockedAmount: BN;
    totalPendingDeposits: BN;
    queuedWithdrawShares: BN;
    totalShares: BN;
    round: BN;
    underlyingTokenMint: PublicKey;
    quoteTokenMint: PublicKey;
    optionTokenMint: PublicKey;
    nextOptionTokenMint: PublicKey;
    nextOptionTokenVault: PublicKey;
    writerTokenMint: PublicKey;
    nextWriterTokenMint: PublicKey;
    nextWriterTokenVault: PublicKey;
    derivativeTokenMint: PublicKey;
    earlyAccessTokenMint: PublicKey;
    underlyingTokenVault: PublicKey;
    quoteTokenVault: PublicKey;
    optionTokenVault: PublicKey;
    writerTokenVault: PublicKey;
    derivativeTokenVault: PublicKey;
    openOrders: PublicKey;
    decimals: BN;
    bump: BN;
    authorityBump: BN;
    derivativeMintBump: BN;
    vaultBumpsUnderlying: BN;
    vaultBumpsQuote: BN;
    vaultBumpsOption: BN;
    vaultBumpsWriter: BN;
    vaultBumpsDerivative: BN;
    pendingvaultBumpsOption: BN;
    pendingvaultBumpsWriter: BN;
    isPaused: boolean;
    onlyEarlyAccess: boolean;
}

export class Vault implements VaultInterface {
    infoPubkey: PublicKey;
    admin: PublicKey;
    pendingAdmin: PublicKey;
    vaultAuthority: PublicKey;
    cap: BN;
    lockedAmount: BN;
    lastLockedAmount: BN;
    totalPendingDeposits: BN;
    queuedWithdrawShares: BN;
    totalShares: BN;
    round: BN;
    underlyingTokenMint: PublicKey;
    quoteTokenMint: PublicKey;
    optionTokenMint: PublicKey;
    nextOptionTokenMint: PublicKey;
    nextOptionTokenVault: PublicKey;
    writerTokenMint: PublicKey;
    nextWriterTokenMint: PublicKey;
    nextWriterTokenVault: PublicKey;
    derivativeTokenMint: PublicKey;
    earlyAccessTokenMint: PublicKey;
    underlyingTokenVault: PublicKey;
    quoteTokenVault: PublicKey;
    optionTokenVault: PublicKey;
    writerTokenVault: PublicKey;
    derivativeTokenVault: PublicKey;
    openOrders: PublicKey;
    decimals: BN;
    bump: BN;
    authorityBump: BN;
    derivativeMintBump: BN;
    vaultBumpsUnderlying: BN;
    vaultBumpsQuote: BN;
    vaultBumpsOption: BN;
    vaultBumpsWriter: BN;
    vaultBumpsDerivative: BN;
    pendingvaultBumpsOption: BN;
    pendingvaultBumpsWriter: BN;
    isPaused: boolean;
    onlyEarlyAccess: boolean;
    constructor(
        infoPubkey: PublicKey,
        admin: PublicKey,
        pendingAdmin: PublicKey,
        vaultAuthority: PublicKey,
        cap: BN | number,
        lockedAmount: BN | number,
        lastLockedAmount: BN | number,
        totalPendingDeposits: BN | number,
        queuedWithdrawShares: BN | number,
        totalShares: BN | number,
        round: BN | number,
        underlyingTokenMint: PublicKey,
        quoteTokenMint: PublicKey,
        optionTokenMint: PublicKey,
        nextOptionTokenMint: PublicKey,
        nextOptionTokenVault: PublicKey,
        writerTokenMint: PublicKey,
        nextWriterTokenMint: PublicKey,
        nextWriterTokenVault: PublicKey,
        derivativeTokenMint: PublicKey,
        earlyAccessTokenMint: PublicKey,
        underlyingTokenVault: PublicKey,
        quoteTokenVault: PublicKey,
        optionTokenVault: PublicKey,
        writerTokenVault: PublicKey,
        derivativeTokenVault: PublicKey,
        openOrders: PublicKey,
        decimals: BN | number,
        bump: BN | number,
        authorityBump: BN | number,
        derivativeMintBump: BN | number,
        vaultBumpsUnderlying: BN | number,
        vaultBumpsQuote: BN | number,
        vaultBumpsOption: BN | number,
        vaultBumpsWriter: BN | number,
        vaultBumpsDerivative: BN | number,
        pendingvaultBumpsOption: BN | number,
        pendingvaultBumpsWriter: BN | number,
        isPaused: boolean,
        onlyEarlyAccess: boolean,
    ) {
        this.infoPubkey = infoPubkey
        this.admin = admin
        this.pendingAdmin = pendingAdmin
        this.vaultAuthority = vaultAuthority
        this.cap = new BN(cap)
        this.lockedAmount = new BN(lockedAmount)
        this.lastLockedAmount = new BN(lastLockedAmount)
        this.totalPendingDeposits = new BN(totalPendingDeposits)
        this.queuedWithdrawShares = new BN(queuedWithdrawShares)
        this.totalShares = new BN(totalShares)
        this.round = new BN(round)
        this.underlyingTokenMint = underlyingTokenMint
        this.quoteTokenMint = quoteTokenMint
        this.optionTokenMint = optionTokenMint
        this.nextOptionTokenMint = nextOptionTokenMint
        this.nextOptionTokenVault = nextOptionTokenVault
        this.writerTokenMint = writerTokenMint
        this.nextWriterTokenMint = nextWriterTokenMint
        this.nextWriterTokenVault = nextWriterTokenVault
        this.derivativeTokenMint = derivativeTokenMint
        this.earlyAccessTokenMint = earlyAccessTokenMint
        this.underlyingTokenVault = underlyingTokenVault
        this.quoteTokenVault = quoteTokenVault
        this.optionTokenVault = optionTokenVault
        this.writerTokenVault = writerTokenVault
        this.derivativeTokenVault = derivativeTokenVault
        this.openOrders = openOrders
        this.decimals = new BN(decimals)
        this.bump = new BN(bump)
        this.authorityBump = new BN(authorityBump)
        this.derivativeMintBump = new BN(derivativeMintBump)
        this.vaultBumpsUnderlying = new BN(vaultBumpsUnderlying)
        this.vaultBumpsQuote = new BN(vaultBumpsQuote)
        this.vaultBumpsOption = new BN(vaultBumpsOption)
        this.vaultBumpsWriter = new BN(vaultBumpsWriter)
        this.vaultBumpsDerivative = new BN(vaultBumpsDerivative)
        this.pendingvaultBumpsOption = new BN(pendingvaultBumpsOption)
        this.pendingvaultBumpsWriter = new BN(pendingvaultBumpsWriter)
        this.isPaused = isPaused
        this.onlyEarlyAccess = onlyEarlyAccess
    }
    async getPricePerPage() {
        let prefix = "price-per-share"
        let minerBytes = new Uint8Array(Buffer.from(prefix, 'utf-8'))
        const dataLayout = struct([
            u128('bump'),
        ]);
        let page = Buffer.alloc(16);
        dataLayout.encode(
            {
                amount: this.round.divRound(new BN(128)),
            },
            page,
        );
        let address = await PublicKey.findProgramAddress(
            [
                minerBytes,
                this.underlyingTokenMint.toBuffer(),
                page,
            ],
            KATANA_PROGRAM_ID)
        return address[0];
    }

}
export async function parceVaultData(data: any, infoPubkey: PublicKey): Promise<Vault> {
    let dataBuffer = data as Buffer;
    let stateData = dataBuffer.slice(8);
    let state = STATE_LAYOUT.decode(stateData);
    let {
        admin,
        pendingAdmin,
        vaultAuthority,
        cap,
        lockedAmount,
        lastLockedAmount,
        totalPendingDeposits,
        queuedWithdrawShares,
        totalShares,
        round,
        underlyingTokenMint,
        quoteTokenMint,
        optionTokenMint,
        nextOptionTokenMint,
        nextOptionTokenVault,
        writerTokenMint,
        nextWriterTokenMint,
        nextWriterTokenVault,
        derivativeTokenMint,
        earlyAccessTokenMint,
        underlyingTokenVault,
        quoteTokenVault,
        optionTokenVault,
        writerTokenVault,
        derivativeTokenVault,
        openOrders,
        decimals,
        bump,
        authorityBump,
        derivativeMintBump,
        vaultBumpsUnderlying,
        vaultBumpsQuote,
        vaultBumpsOption,
        vaultBumpsWriter,
        vaultBumpsDerivative,
        pendingvaultBumpsOption,
        pendingvaultBumpsWriter,
        isPaused,
        onlyEarlyAccess,
    } = state;
    let vault = new Vault(
        infoPubkey,
        admin,
        pendingAdmin,
        vaultAuthority,
        cap,
        lockedAmount,
        lastLockedAmount,
        totalPendingDeposits,
        queuedWithdrawShares,
        totalShares,
        round,
        underlyingTokenMint,
        quoteTokenMint,
        optionTokenMint,
        nextOptionTokenMint,
        nextOptionTokenVault,
        writerTokenMint,
        nextWriterTokenMint,
        nextWriterTokenVault,
        derivativeTokenMint,
        earlyAccessTokenMint,
        underlyingTokenVault,
        quoteTokenVault,
        optionTokenVault,
        writerTokenVault,
        derivativeTokenVault,
        openOrders,
        decimals,
        bump,
        authorityBump,
        derivativeMintBump,
        vaultBumpsUnderlying,
        vaultBumpsQuote,
        vaultBumpsOption,
        vaultBumpsWriter,
        vaultBumpsDerivative,
        pendingvaultBumpsOption,
        pendingvaultBumpsWriter,
        isPaused,
        onlyEarlyAccess)
    return vault;
}
export const STATE_LAYOUT = struct([
    publicKey("admin"),
    publicKey("pendingAdmin"),
    publicKey("vaultAuthority"),
    u128("cap"),
    u128("lockedAmount"),
    u128("lastLockedAmount"),
    u128("totalPendingDeposits"),
    u128("queuedWithdrawShares"),
    u128("totalShares"),
    u128("round"),
    publicKey("underlyingTokenMint"),
    publicKey("quoteTokenMint"),
    publicKey("optionTokenMint"),
    publicKey("nextOptionTokenMint"),
    publicKey("nextOptionTokenVault"),
    publicKey("writerTokenMint"),
    publicKey("nextWriterTokenMint"),
    publicKey("nextWriterTokenVault"),
    publicKey("derivativeTokenMint"),
    publicKey("earlyAccessTokenMint"),
    publicKey("underlyingTokenVault"),
    publicKey("quoteTokenVault"),
    publicKey("optionTokenVault"),
    publicKey("writerTokenVault"),
    publicKey("derivativeTokenVault"),
    publicKey("openOrders"),
    u8("decimals"),
    u8("bump"),
    u8("authorityBump"),
    u8("derivativeMintBump"),
    u8("vaultBumpsUnderlying"),
    u8("vaultBumpsQuote"),
    u8("vaultBumpsOption"),
    u8("vaultBumpsWriter"),
    u8("vaultBumpsDerivative"),
    u8("pendingvaultBumpsOption"),
    u8("pendingvaultBumpsWriter"),
    bool("isPaused"),
    bool("onlyEarlyAccess"),
]);