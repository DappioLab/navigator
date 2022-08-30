import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  MARKET_LAYOUT,
  OPTION_PRAM_LAYOUT,
  OTC_TERMS_LAYOUT,
  PRICE_PER_PAGE_LAYOUT,
  STATE_LAYOUT,
  USER_VAULT_LAYOUT,
} from "./layouts";
import {
  ADMIN,
  IDENTIFIER,
  KATANA_COVER_PROGRAM_ID,
  KATANA_PUT_PROGRAM_ID,
  PSY_PROGRAM_ID,
} from "./ids";
import { struct, u128 } from "@project-serum/borsh";

export interface VaultInfo {
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
  // optionPrams: OptionParameters;
}

export interface UserVaultInfo {
  infoPubkey: PublicKey;
  owner: PublicKey;
  PendingDepositDataRound: BN;
  PendingDepositDataAmount: BN;
  PendingDepositDataUnredeemedShares: BN;
  PendingWithdrawDataRound: BN;
  PendingWithdrawDatShares: BN;
  bump: BN;
}

export interface OtcTermInfo {
  infoPubkey: PublicKey;
  round: BN;
  totalPrice: BN;
  tokenMintToBuy: PublicKey;
  tokenMintToSell: PublicKey;
  bump: BN;
}

interface PricePerSharePageInfo {
  infoPubkey: PublicKey;
  page: BN;
  bump: BN;
  prices: BN[];
}

interface OptionMarketInfo {
  infoPubkey: PublicKey;
  optionMint: PublicKey;
  writerTokenMint: PublicKey;
  underlyingAssetMint: PublicKey;
  quoteAssetMint: PublicKey;
  underlyingAmountPerContract: BN;
  quoteAmountPerContract: BN;
  expirationUnixTimestamp: BN;
  underlyingAssetPool: PublicKey;
  quoteAssetPool: PublicKey;
  mintFeeAccount: PublicKey;
  exerciseFeeAccount: PublicKey;
  expired: boolean;
  bumpSeed: BN;
}

export class VaultInfoWrapper {
  constructor(
    public readonly vaultInfo: VaultInfo,
    public readonly programId: PublicKey
  ) {}

  async getPricePerPage() {
    let prefix = "price-per-share";
    let minerBytes = new Uint8Array(Buffer.from(prefix, "utf-8"));
    const dataLayout = struct([u128("bump")]);
    let page = Buffer.alloc(16);
    dataLayout.encode(
      {
        amount: this.vaultInfo.round.divRound(new BN(128)),
      },
      page
    );
    let address = await PublicKey.findProgramAddress(
      [minerBytes, this.vaultInfo.underlyingTokenMint.toBuffer(), page],
      this.programId // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
    );
    return address[0];
  }

  async getOtcTerms() {
    let prefix = "otc";
    let minerBytes = new Uint8Array(Buffer.from(prefix, "utf-8"));

    let address = await PublicKey.findProgramAddress(
      [
        minerBytes,
        this.vaultInfo.infoPubkey.toBuffer(),
        this.vaultInfo.optionTokenMint.toBuffer(),
        this.vaultInfo.underlyingTokenMint.toBuffer(),
      ],
      this.programId // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
    );
    return address[0];
  }

  async getOptionMarket(connection: Connection) {
    let optionMarket = await getOptionMarketByOptionTokenMint(
      this.vaultInfo.optionTokenMint,
      connection
    );
    return optionMarket;
  }
}

export async function parseVaultData(
  data: any,
  infoPubkey: PublicKey
  // optionPram: OptionParameters
): Promise<VaultInfo> {
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

  return {
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
    onlyEarlyAccess,
  };
}

export async function getAllCoverVaults(connection: Connection) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8,
      bytes: ADMIN.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 741, // TODO: is there 2 different Vault layout?
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allVaultAccount = await connection.getProgramAccounts(
    KATANA_COVER_PROGRAM_ID,
    config
  );
  let allVault: VaultInfo[] = [];
  let optionPrams = await getAllOptionPrams(
    connection,
    KATANA_COVER_PROGRAM_ID
  );
  for (let accountInfo of allVaultAccount) {
    for (let optionPram of optionPrams) {
      if (optionPram.vault.equals(accountInfo.pubkey)) {
        allVault.push(
          await parseVaultData(
            accountInfo.account.data,
            accountInfo.pubkey
            // optionPram
          )
        );
      }
    }
  }
  return allVault;
}

export async function getAllPutVaults(connection: Connection) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8,
      bytes: IDENTIFIER.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 773, // TODO: is there 2 different Vault layout?
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allVaultAccount = await connection.getProgramAccounts(
    KATANA_PUT_PROGRAM_ID,
    config
  );
  let allVault: VaultInfo[] = [];
  let optionPrams = await getAllOptionPrams(connection, KATANA_PUT_PROGRAM_ID);
  for (let accountInfo of allVaultAccount) {
    for (let optionPram of optionPrams) {
      if (optionPram.vault.equals(accountInfo.pubkey)) {
        allVault.push(
          await parseVaultData(
            accountInfo.account.data,
            accountInfo.pubkey
            // optionPram
          )
        );
      }
    }
  }
  return allVault;
}

export async function getVault(
  connection: Connection,
  infoPubkey: PublicKey,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  const vaultAccount = await connection.getAccountInfo(infoPubkey);
  let optionPrams = await getAllOptionPrams(connection, programId);
  let vault!: VaultInfo;
  for (let optionPram of optionPrams) {
    if (optionPram.vault.equals(infoPubkey)) {
      vault = await parseVaultData(
        vaultAccount?.data,
        infoPubkey
        // optionPram
      );
    }
  }
  return vault;
}

export async function getAllUserVaults(
  connection: Connection,
  wallet: PublicKey,
  programId: PublicKey
) {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 121,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allUserVaultAccount = await connection.getProgramAccounts(
    programId,
    config
  );
  let allUserVault: UserVaultInfo[] = [];
  for (let accountInfo of allUserVaultAccount) {
    allUserVault.push(
      await parseUserVaultData(accountInfo.account.data, accountInfo.pubkey)
    );
  }
  return allUserVault;
}

export interface OptionParameters {
  infoPubkey: PublicKey;
  vault: PublicKey;
  expiry: BN;
  strike: BN;
}

export class OptionParameters implements OptionParameters {
  infoPubkey: PublicKey;
  vault: PublicKey;
  expiry: BN;
  strike: BN;
  constructor(infoPubkey: PublicKey, vault: PublicKey, expiry: BN, strike: BN) {
    this.infoPubkey = infoPubkey;
    this.vault = vault;
    this.expiry = expiry;
    this.strike = strike;
  }
}

export function parseOptionParameters(data: any, infoPubkey: PublicKey) {
  let dataBuffer = data as Buffer;
  let optionData = dataBuffer.slice(8);
  let optionRaw = OPTION_PRAM_LAYOUT.decode(optionData);
  let { vault, expiry, strike } = optionRaw;
  return new OptionParameters(infoPubkey, vault, expiry, strike);
}

export async function getAllOptionPrams(
  connection: Connection,
  programId: PublicKey
) {
  const sizeFilter: DataSizeFilter = {
    dataSize: 57,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allOptionPramAccount = await connection.getProgramAccounts(
    programId, // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
    config
  );
  let allOptionPram: OptionParameters[] = [];
  for (let accountInfo of allOptionPramAccount) {
    allOptionPram.push(
      parseOptionParameters(accountInfo.account.data, accountInfo.pubkey)
    );
  }
  return allOptionPram;
}

export async function parseUserVaultData(
  data: any,
  infoPubkey: PublicKey
): Promise<UserVaultInfo> {
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

  return {
    infoPubkey,
    owner,
    PendingDepositDataRound,
    PendingDepositDataAmount,
    PendingDepositDataUnredeemedShares,
    PendingWithdrawDataRound,
    PendingWithdrawDatShares,
    bump,
  };
}

export async function getUserVaultAddress(
  wallet: PublicKey,
  vault: PublicKey,
  programId: PublicKey
) {
  let prefix = "user-account";
  let minerBytes = new Uint8Array(Buffer.from(prefix, "utf-8"));
  let address = await PublicKey.findProgramAddress(
    [minerBytes, wallet.toBuffer(), vault.toBuffer()],
    programId
  );
  return address;
}

export async function checkUserVaultCreated(
  wallet: PublicKey,
  vault: PublicKey,
  connection: Connection,
  programId: PublicKey
) {
  let address = await getUserVaultAddress(wallet, vault, programId);
  let accountInfo = await connection.getAccountInfo(address[0]);
  if (accountInfo?.owner.equals(programId)) {
    return true;
  }
  return false;
}

export function parseOtcTermsData(
  data: any,
  infoPubkey: PublicKey
): OtcTermInfo {
  let dataBuffer = data as Buffer;
  let otcData = dataBuffer.slice(8);
  let otcRaw = OTC_TERMS_LAYOUT.decode(otcData);
  let { round, totalPrice, tokenMintToBuy, tokenMintToSell, bump } = otcRaw;

  return {
    infoPubkey,
    round,
    totalPrice,
    tokenMintToBuy,
    tokenMintToSell,
    bump,
  };
}

export async function getOtcTermsAccount(
  vault: VaultInfoWrapper,
  connection: Connection
): Promise<OtcTermInfo> {
  let infoPubkey = await vault.getOtcTerms();
  let account = await connection.getAccountInfo(infoPubkey);
  if (account == undefined) {
    return defaultOtcTerms(infoPubkey);
  }
  let otc = parseOtcTermsData(account?.data, infoPubkey);
  return otc;
}

export function defaultOtcTerms(infoPubkey: PublicKey) {
  return {
    infoPubkey,
    round: new BN(0),
    totalPrice: new BN(0),
    tokenMintToBuy: PublicKey.default,
    tokenMintToSell: PublicKey.default,
    bump: new BN(0),
  };
}

export function parsePricePerSharePageData(
  data: any,
  infoPubkey: PublicKey
): PricePerSharePageInfo {
  let dataBuffer = data as Buffer;
  let ppspData = dataBuffer.slice(8);
  let ppspRaw = PRICE_PER_PAGE_LAYOUT.decode(ppspData);
  let { page, bump } = ppspRaw;
  let prices: BN[] = [];
  let PRICE_LAYOUT = struct([u128("price")]);
  for (let index = 0; index < 128; index++) {
    let data = ppspData.slice(17 + index * 16);
    let { price } = PRICE_LAYOUT.decode(data);
    prices.push(new BN(price));
  }

  return {
    infoPubkey,
    page: new BN(page),
    bump: new BN(bump),
    prices,
  };
}

export async function getPricePerPageAccount(
  vault: VaultInfoWrapper,
  connection: Connection
) {
  let infoPubkey = await vault.getPricePerPage();
  let account = await connection.getAccountInfo(infoPubkey);
  let ppsp = parsePricePerSharePageData(account?.data, infoPubkey);
  return ppsp;
}

export function parseOptionMarketInfo(
  data: any,
  infoPubkey: PublicKey
): OptionMarketInfo {
  let dataBuffer = data as Buffer;
  if (!data || !infoPubkey) {
    return {
      infoPubkey: PublicKey.default,
      optionMint: PublicKey.default,
      writerTokenMint: PublicKey.default,
      underlyingAssetMint: PublicKey.default,
      quoteAssetMint: PublicKey.default,
      underlyingAmountPerContract: new BN(0),
      quoteAmountPerContract: new BN(0),
      expirationUnixTimestamp: new BN(0),
      underlyingAssetPool: PublicKey.default,
      quoteAssetPool: PublicKey.default,
      mintFeeAccount: PublicKey.default,
      exerciseFeeAccount: PublicKey.default,
      expired: true,
      bumpSeed: new BN(0),
    };
  }
  let marketData = dataBuffer.slice(8);
  let market = MARKET_LAYOUT.decode(marketData);

  let {
    optionMint,
    writerTokenMint,
    underlyingAssetMint,
    quoteAssetMint,
    underlyingAmountPerContract,
    quoteAmountPerContract,
    expirationUnixTimestamp,
    underlyingAssetPool,
    quoteAssetPool,
    mintFeeAccount,
    exerciseFeeAccount,
    expired,
    bumpSeed,
  } = market;

  return {
    infoPubkey,
    optionMint,
    writerTokenMint,
    underlyingAssetMint,
    quoteAssetMint,
    underlyingAmountPerContract,
    quoteAmountPerContract,
    expirationUnixTimestamp,
    underlyingAssetPool,
    quoteAssetPool,
    mintFeeAccount,
    exerciseFeeAccount,
    expired,
    bumpSeed,
  };
}

export async function getOptionMarketByOptionTokenMint(
  optionMint: PublicKey,
  connection: Connection
): Promise<OptionMarketInfo> {
  const mintMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8,
      bytes: optionMint.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 290,
  };
  const filters = [mintMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  const allOptionMarket = await connection.getProgramAccounts(
    PSY_PROGRAM_ID,
    config
  );
  let optionMarketInfo = parseOptionMarketInfo(
    allOptionMarket[0]?.account.data,
    allOptionMarket[0]?.pubkey
  );
  return optionMarketInfo;
}
