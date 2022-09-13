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
import { IInstanceVault } from "../types";
import * as types from ".";

let infos: IInstanceVault;

infos = class InstanceKatana {
  static async getAllVaults(connection: Connection): Promise<types.VaultInfo[]> {
    const adminIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 8,
        bytes: ADMIN.toString(),
      },
    };
    const identifierMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 8,
        bytes: IDENTIFIER.toString(),
      },
    };
    const coverSizeFilter: DataSizeFilter = {
      dataSize: 741,
    };
    const putSizeFilter: DataSizeFilter = {
      dataSize: 773, // TODO: is there 2 different Vault layout?
    };
    let coverOptionPrams = await getOptionPramsMaps(connection, KATANA_COVER_PROGRAM_ID);

    let putOptionPrams = await getOptionPramsMaps(connection, KATANA_PUT_PROGRAM_ID);

    const coverFilters = [adminIdMemcmp, coverSizeFilter];
    const coverConfig: GetProgramAccountsConfig = { filters: coverFilters };
    const allCoverVaultAccount = await connection.getProgramAccounts(KATANA_COVER_PROGRAM_ID, coverConfig);

    const putFilters = [identifierMemcmp, putSizeFilter];
    const putConfig: GetProgramAccountsConfig = { filters: putFilters };
    const allPutVaultAccount = await connection.getProgramAccounts(KATANA_PUT_PROGRAM_ID, putConfig);

    let coverVaultInfos = allCoverVaultAccount.map((accountInfo) => {
      return this.parseVault(
        accountInfo.account.data,
        accountInfo.pubkey,
        types.VaultType.coverCall,
        coverOptionPrams.get(accountInfo.pubkey.toString())
      );
    });
    let putVaultInfos = allPutVaultAccount.map((accountInfo) => {
      return this.parseVault(
        accountInfo.account.data,
        accountInfo.pubkey,
        types.VaultType.putSell,
        putOptionPrams.get(accountInfo.pubkey.toString())
      );
    });
    return [...coverVaultInfos, ...putVaultInfos];
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    const vaultAccount = (await connection.getAccountInfo(vaultId)) as AccountInfo<Buffer>;
    let type = vaultAccount?.owner.equals(KATANA_COVER_PROGRAM_ID)
      ? types.VaultType.coverCall
      : types.VaultType.putSell;
    let optionPrams = await getOptionPramsMaps(connection, vaultAccount?.owner);
    let vault: types.VaultInfo;

    vault = await this.parseVault(vaultAccount?.data, vaultId, type, optionPrams.get(vaultId.toString()));

    return vault;
  }

  static parseVault(
    data: Buffer,
    vaultId: PublicKey,
    vaultType?: types.VaultType,
    optionPram?: types.OptionParameters
  ): types.VaultInfo {
    let dataBuffer = data as Buffer;
    let stateData = dataBuffer.slice(8);
    let state;
    let programId: PublicKey;
    switch (vaultType) {
      case types.VaultType.coverCall: {
        state = COVER_VAULT_LAYOUT.decode(stateData);
        programId = KATANA_COVER_PROGRAM_ID;
        break;
      }
      case types.VaultType.putSell: {
        state = PUT_VAULT_LAYOUT.decode(stateData);
        programId = KATANA_PUT_PROGRAM_ID;
        break;
      }
      default: {
        throw new Error("Type not found");
      }
    }
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
    let identifier = state.identifier ? state.identifier : undefined;
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
      programId: programId,
      identifier: identifier,
    };
  }

  static async getAllDepositors(connection: Connection, userKey: PublicKey): Promise<types.DepositorInfo[]> {
    const adminIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 8,
        bytes: userKey.toString(),
      },
    };
    const sizeFilter: DataSizeFilter = {
      dataSize: 121,
    };
    const filters = [adminIdMemcmp, sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };
    const allCoverDepositorAccount = await connection.getProgramAccounts(KATANA_COVER_PROGRAM_ID, config);
    const allPutDepositorAccount = await connection.getProgramAccounts(KATANA_PUT_PROGRAM_ID, config);
    return [...allPutDepositorAccount, ...allCoverDepositorAccount].map((accountInfo) => {
      return this.parseDepositor(accountInfo.account.data, accountInfo.pubkey);
    });
  }

  static async getDepositor(connection: Connection, depositorId: PublicKey): Promise<types.DepositorInfo> {
    const accountInfo = (await connection.getAccountInfo(depositorId)) as AccountInfo<Buffer>;
    return this.parseDepositor(accountInfo.data, depositorId);
  }
  static async getDepositorId(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId: PublicKey = KATANA_PUT_PROGRAM_ID
  ): Promise<PublicKey> {
    return (await this.getDepositorIdWithBump(vaultId, userKey, programId)).pda;
  }
  static async getDepositorIdWithBump(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId: PublicKey = KATANA_PUT_PROGRAM_ID
  ): Promise<{ pda: PublicKey; bump: number }> {
    let prefix = "user-account";
    let minerBytes = new Uint8Array(Buffer.from(prefix, "utf-8"));
    let address = await PublicKey.findProgramAddress([minerBytes, userKey.toBuffer(), vaultId.toBuffer()], programId);
    return { pda: address[0], bump: address[1] };
  }
  static parseDepositor(data: Buffer, depositorId: PublicKey): types.DepositorInfo {
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
};

export { infos };

export class VaultInfoWrapper {
  constructor(public readonly vaultInfo: types.VaultInfo) {}

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

export async function checkDepositorCreated(
  wallet: PublicKey,
  vault: PublicKey,
  connection: Connection,
  programId: PublicKey
) {
  let address = await infos.getDepositorId(vault, wallet, programId);
  let accountInfo = await connection.getAccountInfo(address);
  return Boolean(accountInfo?.owner.equals(programId));
}

async function getPricePerPageAccount(vault: VaultInfoWrapper, connection: Connection) {
  let infoPubkey = await vault.getPricePerPage();
  let account = await connection.getAccountInfo(infoPubkey);
  let ppsp = parsePricePerSharePageData(account?.data, infoPubkey);
  return ppsp;
}
function parseOptionParameters(data: any, infoPubkey: PublicKey): types.OptionParameters {
  let dataBuffer = data as Buffer;
  let optionData = dataBuffer.slice(8);
  let optionRaw = OPTION_PRAM_LAYOUT.decode(optionData);
  let { vault, expiry, strike } = optionRaw;
  return { infoPubkey, vault, expiry, strike };
}

async function getOptionPramsMaps(connection: Connection, programId?: PublicKey) {
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

  let optionMaps: Map<string, types.OptionParameters> = new Map();
  allOptionPramAccount.forEach((accountInfo) => {
    let optionInfo = parseOptionParameters(accountInfo.account.data, accountInfo.pubkey);
    optionMaps.set(optionInfo.vault.toString(), optionInfo);
  });
  return optionMaps;
}

function parseOtcTermsData(data: any, otcTermId: PublicKey): types.OtcTermInfo {
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

async function getOtcTermsAccount(connection: Connection, vault: VaultInfoWrapper): Promise<types.OtcTermInfo> {
  let otcTermId = await vault.getOtcTermId();
  let account = await connection.getAccountInfo(otcTermId);
  if (account == undefined) {
    return defaultOtcTerms(otcTermId);
  }
  let otc = parseOtcTermsData(account?.data, otcTermId);
  return otc;
}

function defaultOtcTerms(otcTermId: PublicKey) {
  return {
    otcTermId,
    round: new BN(0),
    totalPrice: new BN(0),
    tokenMintToBuy: PublicKey.default,
    tokenMintToSell: PublicKey.default,
    bump: new BN(0),
  };
}

function parsePricePerSharePageData(data: any, infoPubkey: PublicKey): types.PricePerSharePageInfo {
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

function parseOptionMarketInfo(data: any, optionMarketId: PublicKey): types.OptionMarketInfo {
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

async function getOptionMarketByOptionTokenMint(
  optionMint: PublicKey,
  connection: Connection
): Promise<types.OptionMarketInfo> {
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
