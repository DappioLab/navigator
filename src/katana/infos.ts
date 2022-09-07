import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  MARKET_LAYOUT,
  OPTION_PRAM_LAYOUT,
  OTC_TERMS_LAYOUT,
  PRICE_PER_PAGE_LAYOUT,
  COVER_VAULT_LAYOUT,
  PUT_VAULT_LAYOUT,
  DEPOSITOR_LAYOUT,
} from "./layouts";
import { ADMIN, IDENTIFIER, KATANA_COVER_PROGRAM_ID, KATANA_PUT_PROGRAM_ID, PSY_PROGRAM_ID } from "./ids";
import { struct, u128 } from "@project-serum/borsh";
import { IDepositorInfo, IInstanceVault, IVaultInfo } from "../types";

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

// TODO: Implement InstanceKatana

let infos: IInstanceVault;
export enum VaultType {
  putSell,
  coverCall,
}

infos = class InstanceKatana {
  static async getAllVaults(connection: Connection): Promise<IVaultInfo[]> {
    return [];
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<IVaultInfo> {
    return {} as IVaultInfo;
  }

  static parseVault(data: Buffer, vaultId: PublicKey): IVaultInfo {
    return {} as IVaultInfo;
  }

  static async getAllDepositors(connection: Connection, userKey: PublicKey): Promise<IDepositorInfo[]> {
    return [];
  }

  static async getDepositor(connection: Connection, depositorId: PublicKey): Promise<IDepositorInfo> {
    return {} as IDepositorInfo;
  }

  static parseDepositor(data: Buffer, depositorId: PublicKey): IDepositorInfo {
    return {} as IDepositorInfo;
  }
};

export { infos };

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

export interface VaultInfo extends IVaultInfo {
  // vaultId
  // shareMint (equivalent to derivativeTokenMint)
  type: VaultType;
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
  programId: PublicKey;
  optionPram?: OptionParameters;
  identifier?: PublicKey;
}

export interface DepositorInfo extends IDepositorInfo {
  // depositorId
  // userKey
  PendingDepositDataRound: BN;
  PendingDepositDataAmount: BN;
  PendingDepositDataUnredeemedShares: BN;
  PendingWithdrawDataRound: BN;
  PendingWithdrawDatShares: BN;
  bump: BN;
}

export interface OtcTermInfo {
  otcTermId: PublicKey;
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
  optionMarketId: PublicKey;
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
  constructor(public readonly vaultInfo: VaultInfo) {}

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
      this.vaultInfo.programId
    );
    return address[0];
  }

  async getOtcTermId() {
    let prefix = "otc";
    let minerBytes = new Uint8Array(Buffer.from(prefix, "utf-8"));

    let address = await PublicKey.findProgramAddress(
      [
        minerBytes,
        this.vaultInfo.vaultId.toBuffer(),
        this.vaultInfo.optionTokenMint.toBuffer(),
        this.vaultInfo.underlyingTokenMint.toBuffer(),
      ],
      this.vaultInfo.programId
    );
    return address[0];
  }

  async getOptionMarket(connection: Connection) {
    let optionMarket = await getOptionMarketByOptionTokenMint(this.vaultInfo.optionTokenMint, connection);
    return optionMarket;
  }
}

export async function parseVaultData(
  data: any,
  vaultId: PublicKey,
  vaultType: VaultType,
  optionPram?: OptionParameters
): Promise<VaultInfo> {
  let dataBuffer = data as Buffer;
  let stateData = dataBuffer.slice(8);
  switch (vaultType) {
    case VaultType.coverCall: {
      let state = COVER_VAULT_LAYOUT.decode(stateData);
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
        type: vaultType,
        vaultId,
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
        shareMint: derivativeTokenMint,
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
        optionPram,
        programId: KATANA_COVER_PROGRAM_ID,
      };
    }
    default: {
      let putState = PUT_VAULT_LAYOUT.decode(stateData);
      let {
        identifier,
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
      } = putState;

      return {
        type: vaultType,
        vaultId,
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
        shareMint: derivativeTokenMint,
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
        identifier: identifier,
        optionPram,
        programId: KATANA_PUT_PROGRAM_ID,
      };
    }
  }
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
  const allVaultAccount = await connection.getProgramAccounts(KATANA_COVER_PROGRAM_ID, config);
  let allVault: VaultInfo[] = [];
  let optionPrams = await getOptionPramsMaps(connection, KATANA_COVER_PROGRAM_ID);

  for (let accountInfo of allVaultAccount) {
    allVault.push(
      await parseVaultData(
        accountInfo.account.data,
        accountInfo.pubkey,
        VaultType.coverCall,
        optionPrams.get(accountInfo.pubkey.toString())
      )
    );
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
  const allVaultAccount = await connection.getProgramAccounts(KATANA_PUT_PROGRAM_ID, config);
  let allVault: VaultInfo[] = [];
  let optionPrams = await getOptionPramsMaps(connection, KATANA_PUT_PROGRAM_ID);
  for (let accountInfo of allVaultAccount) {
    allVault.push(
      await parseVaultData(
        accountInfo.account.data,
        accountInfo.pubkey,
        VaultType.putSell,
        optionPrams.get(accountInfo.pubkey.toString())
      )
    );
  }
  return allVault;
}

export async function getVault(connection: Connection, infoPubkey: PublicKey) {
  const vaultAccount = await connection.getAccountInfo(infoPubkey);
  let type = vaultAccount?.owner.equals(KATANA_COVER_PROGRAM_ID) ? VaultType.coverCall : VaultType.putSell;
  let optionPrams = await getOptionPramsMaps(connection, vaultAccount?.owner);
  let vault!: VaultInfo;

  vault = await parseVaultData(vaultAccount?.data, infoPubkey, type, optionPrams.get(infoPubkey.toString()));

  return vault;
}

export async function getAllDepositors(connection: Connection, wallet: PublicKey, programId: PublicKey) {
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
  const allDepositorAccount = await connection.getProgramAccounts(programId, config);
  let allDepositor: DepositorInfo[] = [];
  for (let accountInfo of allDepositorAccount) {
    allDepositor.push(await parseDepositorData(accountInfo.account.data, accountInfo.pubkey));
  }
  return allDepositor;
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

export async function getOptionPramsMaps(connection: Connection, programId?: PublicKey) {
  const sizeFilter: DataSizeFilter = {
    dataSize: 57,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters: filters };
  let allOptionPramAccount: {
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
  }[] = [];
  if (programId) {
    allOptionPramAccount = [
      ...allOptionPramAccount,
      ...(await connection.getProgramAccounts(
        programId, // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
        config
      )),
    ];
  } else {
    allOptionPramAccount = [
      ...allOptionPramAccount,
      ...(await connection.getProgramAccounts(KATANA_PUT_PROGRAM_ID, config)),
    ];
    allOptionPramAccount = [
      ...allOptionPramAccount,
      ...(await connection.getProgramAccounts(KATANA_COVER_PROGRAM_ID, config)),
    ];
  }

  let optionMaps: Map<string, OptionParameters> = new Map();
  for (let accountInfo of allOptionPramAccount) {
    let optionInfo = parseOptionParameters(accountInfo.account.data, accountInfo.pubkey);
    optionMaps.set(optionInfo.vault.toString(), optionInfo);
  }
  return optionMaps;
}

export async function parseDepositorData(data: any, depositorId: PublicKey): Promise<DepositorInfo> {
  let dataBuffer = data as Buffer;
  let userData = dataBuffer.slice(8);
  let depositor = DEPOSITOR_LAYOUT.decode(userData);
  let {
    owner,
    PendingDepositDataRound,
    PendingDepositDataAmount,
    PendingDepositDataUnredeemedShares,
    PendingWithdrawDataRound,
    PendingWithdrawDatShares,
    bump,
  } = depositor;

  return {
    depositorId,
    userKey: owner,
    PendingDepositDataRound,
    PendingDepositDataAmount,
    PendingDepositDataUnredeemedShares,
    PendingWithdrawDataRound,
    PendingWithdrawDatShares,
    bump,
  };
}

export async function getDepositorId(wallet: PublicKey, vault: PublicKey, programId: PublicKey) {
  let prefix = "user-account";
  let minerBytes = new Uint8Array(Buffer.from(prefix, "utf-8"));
  let address = await PublicKey.findProgramAddress([minerBytes, wallet.toBuffer(), vault.toBuffer()], programId);
  return address;
}

export async function checkDepositorCreated(
  wallet: PublicKey,
  vault: PublicKey,
  connection: Connection,
  programId: PublicKey
) {
  let address = await getDepositorId(wallet, vault, programId);
  let accountInfo = await connection.getAccountInfo(address[0]);
  if (accountInfo?.owner.equals(programId)) {
    return true;
  }
  return false;
}

export function parseOtcTermsData(data: any, otcTermId: PublicKey): OtcTermInfo {
  let dataBuffer = data as Buffer;
  let otcData = dataBuffer.slice(8);
  let otcRaw = OTC_TERMS_LAYOUT.decode(otcData);
  let { round, totalPrice, tokenMintToBuy, tokenMintToSell, bump } = otcRaw;

  return {
    otcTermId,
    round,
    totalPrice,
    tokenMintToBuy,
    tokenMintToSell,
    bump,
  };
}

export async function getOtcTermsAccount(connection: Connection, vault: VaultInfoWrapper): Promise<OtcTermInfo> {
  let otcTermId = await vault.getOtcTermId();
  let account = await connection.getAccountInfo(otcTermId);
  if (account == undefined) {
    return defaultOtcTerms(otcTermId);
  }
  let otc = parseOtcTermsData(account?.data, otcTermId);
  return otc;
}

export function defaultOtcTerms(otcTermId: PublicKey) {
  return {
    otcTermId,
    round: new BN(0),
    totalPrice: new BN(0),
    tokenMintToBuy: PublicKey.default,
    tokenMintToSell: PublicKey.default,
    bump: new BN(0),
  };
}

export function parsePricePerSharePageData(data: any, infoPubkey: PublicKey): PricePerSharePageInfo {
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

export async function getPricePerPageAccount(vault: VaultInfoWrapper, connection: Connection) {
  let infoPubkey = await vault.getPricePerPage();
  let account = await connection.getAccountInfo(infoPubkey);
  let ppsp = parsePricePerSharePageData(account?.data, infoPubkey);
  return ppsp;
}

export function parseOptionMarketInfo(data: any, optionMarketId: PublicKey): OptionMarketInfo {
  let dataBuffer = data as Buffer;
  if (!data || !optionMarketId) {
    return {
      optionMarketId: PublicKey.default,
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
    optionMarketId,
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
  const allOptionMarket = await connection.getProgramAccounts(PSY_PROGRAM_ID, config);
  let optionMarketInfo = parseOptionMarketInfo(allOptionMarket[0]?.account.data, allOptionMarket[0]?.pubkey);
  return optionMarketInfo;
}
