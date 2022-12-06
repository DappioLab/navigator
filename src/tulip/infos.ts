import { getAssociatedTokenAddress, getMint, AccountLayout, MintLayout, Account, Mint } from "@solana/spl-token-v2";
import { Connection, PublicKey, GetProgramAccountsConfig, MemcmpFilter, DataSizeFilter } from "@solana/web3.js";
import BN from "bn.js";
import axios from "axios";
import { IInstanceMoneyMarket, IInstanceVault, IReserveInfoWrapper, IVaultInfoWrapper, PageConfig } from "../types";
import { configV2, TULIP_PROGRAM_ID, TULIP_VAULT_V2_PROGRAM_ID } from "./ids";
import {
  DEPOSITOR_LAYOUT,
  ORCA_DD_VAULT_LAYOUT,
  ORCA_VAULT_LAYOUT,
  RAYDIUM_VAULT_LAYOUT,
  RESERVE_LAYOUT,
} from "./layout";
import * as types from ".";
import { getMultipleAccounts, paginate } from "../utils";

let infos: IInstanceMoneyMarket & IInstanceVault;

infos = class InstanceTulip {
  static async getAllReserves(
    connection: Connection,
    marketId?: PublicKey,
    page?: PageConfig
  ): Promise<types.ReserveInfo[]> {
    const dataSizeFilters: DataSizeFilter = {
      dataSize: RESERVE_LAYOUT_SPAN,
    };

    let filters: any[] = [dataSizeFilters];
    if (marketId) {
      const programIdMemcmp: MemcmpFilter = {
        memcmp: {
          //offset 10 byte
          offset: 10,
          bytes: marketId.toString(),
        },
      };
      filters = [programIdMemcmp, dataSizeFilters];
    }

    const config: GetProgramAccountsConfig = { filters: filters };
    const reserveAccounts = paginate(await connection.getProgramAccounts(TULIP_PROGRAM_ID, config), page);

    const deprecatedReserveId = [
      "Hp1koDBynZqZ8b2BQc7uNSMfHprkSwrEVqbJhkrRzWkQ", // deprecated SOL
      "EffQjqa2vWm5JMPyCrRJSDGYGEHTuQWmEz8VJSYGRCBL", // deprecated ETH
      "bB1n11FnWo7kNYFJog6CJwMCgsg7zUZeNvH9cZgfu9D", // deprecated sRLY
      "HpYGGceBPSWhemfsUtdAXjDJpTiWa6MppMr8LaCfkwyX", // STEP
      "HJDm6bso3CXHjUZRLRnV3VLupgeNbeYD4SGXEiaqrDEh", // STARS
      "FEDEBKAtZzod5oXv1UkSzEeDZGsFe3DK9Wq23o6B4QVN", // SUSHI
      "F9pwMLPQy1MJv14EE3XWdncUaJbPZdaqgfuHmfwxcWzc", // ZBC
      "F3y6c19hcn91RRkqZc6BN6d2B5F9etkNks9BzUxvqc2M", // UNI
      "BAkQnFTVBHE9XGo7rEidRMEhrFyXXxKPchW2KXtkPKzG", // ROPE
      "9wFUsWXt9vc69mU1jcjgPziLSYy6dLu7Dy9idNjo33vy", // MER
      "6sJRzk3tfgn8Ud41YhJaDNyaDe9WwuhNrEm3SVZUJQq3", // HAWK
      "2vzY9tJNqutsGnUwPmka3LmAEjDXJ2qKeV9fAztD7Sbo", // DYDX
      "5BZgs8KZ79e12GPse8qDarUvN5bS1R4krRqAGqpbdcFd", // SLC
      "9nsisj22Kw8bQaAv1wAVm6AgH4rmRc1zAeCQVHAuz5GZ", // wUST_v1
    ];
    const deprecatedMap = new Map<string, boolean>();
    deprecatedReserveId.forEach((id) => deprecatedMap.set(id, true));

    const reserves = reserveAccounts
      .map((account) => this.parseReserve(account.account!.data, account.pubkey))
      .filter((r) => Number(r.version) === 1 && !deprecatedMap.get(r.reserveId.toBase58()));

    return reserves;
  }

  static async getAllReserveWrappers(
    connection: Connection,
    marketId?: PublicKey,
    page?: PageConfig
  ): Promise<ReserveInfoWrapper[]> {
    const reserves = await this.getAllReserves(connection, marketId, page);
    const reserveWrappers = reserves.map((reserve) => new ReserveInfoWrapper(reserve));
    return reserveWrappers;
  }

  static async getReserve(connection: Connection, reserveId: PublicKey): Promise<types.ReserveInfo> {
    const reserveAccountInfo = await connection.getAccountInfo(reserveId);
    if (!reserveAccountInfo) throw Error("Error: Cannot get reserve account (tulip.getReserve)");
    return this.parseReserve(reserveAccountInfo.data, reserveId);
  }

  static parseReserve(data: Buffer, reserveId: PublicKey): types.ReserveInfo {
    const decodedData = RESERVE_LAYOUT.decode(data);
    let { version, lastUpdate, lendingMarket, borrowAuthorizer, liquidity, collateral, config } = decodedData;

    return {
      reserveId,
      version,
      lastUpdate,
      lendingMarket,
      borrowAuthorizer,
      liquidity,
      collateral,
      config,
    };
  }

  static async getAllVaults(connection: Connection, page?: PageConfig): Promise<types.VaultInfo[]> {
    const raydiumSizeFilter: DataSizeFilter = {
      dataSize: RAYDIUM_VAULT_LAYOUT_SPAN,
    };
    const raydiumFilters = [raydiumSizeFilter];
    const raydiumConfig: GetProgramAccountsConfig = { filters: raydiumFilters };

    const orcaSizeFilter: DataSizeFilter = {
      dataSize: ORCA_VAULT_LAYOUT_SPAN,
    };
    const orcaFilters = [orcaSizeFilter];
    const orcaConfig: GetProgramAccountsConfig = { filters: orcaFilters };

    const orcaDDSizeFilter: DataSizeFilter = {
      dataSize: ORCA_DD_VAULT_LAYOUT_SPAN,
    };
    const orcaDDFilters = [orcaDDSizeFilter];
    const orcaDDConfig: GetProgramAccountsConfig = { filters: orcaDDFilters };

    const raydiumVaults = paginate(await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, raydiumConfig), page);
    const orcaVaults = paginate(await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, orcaConfig), page);
    const orcaDDVaults = paginate(await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, orcaDDConfig), page);
    const vaultAccountInfos = [...raydiumVaults, ...orcaVaults, ...orcaDDVaults];

    let vaults: types.VaultInfo[] = vaultAccountInfos
      .filter((info) => this._isAllowedId(info.pubkey))
      .map((info) => this.parseVault(info.account!.data, info.pubkey));

    vaults = await this._fetchTokenAccountAndMint(connection, vaults);

    return vaults;
  }

  static async getAllVaultWrappers(connection: Connection, page?: PageConfig): Promise<IVaultInfoWrapper[]> {
    return (await this.getAllVaults(connection, page)).map((vault) => new VaultInfoWrapper(vault));
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    const vaultAccountInfo = await connection.getAccountInfo(vaultId);
    if (!vaultAccountInfo) throw Error("Error: Cannot get reserve account (tulip.getVault)");

    let vault: types.VaultInfo = this.parseVault(vaultAccountInfo?.data, vaultId);
    vault = (await this._fetchTokenAccountAndMint(connection, [vault]))[0];

    return vault;
  }

  static parseVault(data: Buffer, vaultId: PublicKey): types.VaultInfo {
    let parseVault;
    switch (data.length) {
      case RAYDIUM_VAULT_LAYOUT_SPAN:
        parseVault = this._parseRaydiumVault;
        break;
      case ORCA_VAULT_LAYOUT_SPAN:
        parseVault = this._parseOrcaVault;
        break;
      case ORCA_DD_VAULT_LAYOUT_SPAN:
        parseVault = this._parseOrcaDDVault;
        break;
      default:
        throw Error("Error: data structure does not exist or not supported yet (tulip.parseVault");
    }
    return parseVault(data, vaultId);
  }

  static async getAllDepositors(connection: Connection, userKey: PublicKey): Promise<types.DepositorInfo[]> {
    const dataSizeFilters: DataSizeFilter = {
      dataSize: DEPOSITOR_LAYOUT_SPAN,
    };
    let filters: (MemcmpFilter | DataSizeFilter)[] = [dataSizeFilters];
    if (userKey) {
      const programIdMemcmp: MemcmpFilter = {
        memcmp: {
          offset: 8,
          bytes: userKey.toString(),
        },
      };
      filters = [programIdMemcmp, dataSizeFilters];
    }
    const config: GetProgramAccountsConfig = { filters: filters };

    const accountInfos = await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, config);
    const depositors = accountInfos.map((depositor) => this.parseDepositor(depositor.account.data, depositor.pubkey));
    return depositors;
  }

  static async getDepositor(connection: Connection, depositorId: PublicKey): Promise<types.DepositorInfo> {
    const depositorAccountInfo = await connection.getAccountInfo(depositorId);
    if (!depositorAccountInfo) throw Error("Error: Cannot get depositor account (tulip.getDepositor)");
    return this.parseDepositor(depositorAccountInfo.data, depositorId);
  }

  static getDepositorId(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId: PublicKey = TULIP_VAULT_V2_PROGRAM_ID
  ): PublicKey {
    return this.getDepositorIdWithBump(vaultId, userKey, programId).pda;
  }

  static getDepositorIdWithBump(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId: PublicKey = TULIP_VAULT_V2_PROGRAM_ID
  ): { pda: PublicKey; bump: number } {
    let [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("tracking"), vaultId.toBuffer(), userKey.toBuffer()],
      programId
    );
    return { pda, bump };
  }

  static parseDepositor(data: Buffer, depositorId: PublicKey): types.DepositorInfo {
    const decodeData = DEPOSITOR_LAYOUT.decode(data);
    const {
      owner,
      vault,
      pdaNonce,
      queueNonce,
      shares,
      depositedBalance,
      lastDepositTime,
      pendingWithdrawAmount,
      totalDepositedUnderlying,
      totalWithdrawnUnderlying,
      lastPendingReward,
      rewardPerSharePaid,
      extraDataAccount,
    } = decodeData;

    return {
      depositorId,
      userKey: owner,
      vaultId: vault,
      pdaNonce,
      queueNonce,
      shares,
      depositedBalance,
      lastDepositTime,
      pendingWithdrawAmount,
      totalDepositedUnderlying,
      totalWithdrawnUnderlying,
      lastPendingReward,
      rewardPerSharePaid,
      extraDataAccount,
    };
  }

  private static _parseRaydiumVault(data: any, vaultId: PublicKey): types.RaydiumVaultInfo {
    const decodeData = RAYDIUM_VAULT_LAYOUT.decode(data);
    const {
      base,
      raydiumLpMintAddress,
      raydiumAmmId,
      raydiumAmmAuthority,
      raydiumAmmOpenOrders,
      raydiumAmmQuantitiesOrTargetOrders,
      raydiumStakeProgram,
      raydiumLiquidityProgram,
      raydiumCoinTokenAccount,
      raydiumPcTokenAccount,
      raydiumPoolTempTokenAccount,
      raydiumPoolLpTokenAccount,
      raydiumPoolWithdrawQueue,
      raydiumPoolId,
      raydiumPoolAuthority,
      raydiumPoolRewardATokenAccount,
      raydiumPoolRewardBTokenAccount,
      dualRewards,
      vaultRewardATokenAccount,
      vaultRewardBTokenAccount,
      vaultStakeInfoAccount,
      associatedStakeInfoAddress,
      coinMint,
      pcMint,
      serumMarket,
    } = decodeData;

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      type: types.VaultType.Raydium,
      apy: 0,
      lpMint: raydiumLpMintAddress,
      ammId: raydiumAmmId,
      ammAuthority: raydiumAmmAuthority,
      ammOpenOrders: raydiumAmmOpenOrders,
      ammQuantitiesOrTargetOrders: raydiumAmmQuantitiesOrTargetOrders,
      stakeProgram: raydiumStakeProgram,
      liquidityProgram: raydiumLiquidityProgram,
      coinTokenAccount: InstanceTulip._defaultTokenAccount(raydiumCoinTokenAccount),
      pcTokenAccount: InstanceTulip._defaultTokenAccount(raydiumPcTokenAccount),
      poolTempTokenAccount: raydiumPoolTempTokenAccount,
      poolLpTokenAccount: raydiumPoolLpTokenAccount,
      poolWithdrawQueue: raydiumPoolWithdrawQueue,
      poolId: raydiumPoolId,
      poolAuthority: raydiumPoolAuthority,
      poolRewardATokenAccount: InstanceTulip._defaultTokenAccount(raydiumPoolRewardATokenAccount),
      poolRewardBTokenAccount: InstanceTulip._defaultTokenAccount(raydiumPoolRewardBTokenAccount),
      feeCollectorRewardATokenAccount: PublicKey.default,
      feeCollectorRewardBTokenAccount: PublicKey.default,
      dualRewards,
      vaultRewardATokenAccount,
      vaultRewardBTokenAccount,
      vaultStakeInfoAccount,
      associatedStakeInfoAddress,
      coinMint,
      pcMint,
      serumMarket,
    };
  }

  private static _parseOrcaVault(data: any, vaultId: PublicKey): types.OrcaVaultInfo {
    const decodeData = ORCA_VAULT_LAYOUT.decode(data);
    const { base, farmData } = decodeData;

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      type: types.VaultType.Orca,
      apy: 0,
      farmData: {
        ...farmData,
        poolSwapTokenA: InstanceTulip._defaultTokenAccount(farmData.poolSwapTokenA),
        poolSwapTokenB: InstanceTulip._defaultTokenAccount(farmData.poolSwapTokenB),
        swapPoolMint: InstanceTulip._defaultMint(farmData.swapPoolMint),
        feeCollectorTokenAccount: PublicKey.default,
        swapPoolFeeTokenAccount: PublicKey.default,
      },
    };
  }

  private static _parseOrcaDDVault(data: any, vaultId: PublicKey): types.OrcaDDVaultInfo {
    const decodeData = ORCA_DD_VAULT_LAYOUT.decode(data);
    const {
      base,
      farmData,
      ddFarmData,
      ddCompoundQueue,
      ddCompoundQueueNonce,
      ddConfigured,
      ddWithdrawQueue,
      ddWithdrawQueueNonce,
    } = decodeData;

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      type: types.VaultType.OrcaDD,
      apy: 0,
      farmData: {
        ...farmData,
        poolSwapTokenA: InstanceTulip._defaultTokenAccount(farmData.poolSwapTokenA),
        poolSwapTokenB: InstanceTulip._defaultTokenAccount(farmData.poolSwapTokenB),
        swapPoolMint: InstanceTulip._defaultMint(farmData.swapPoolMint),
        feeCollectorTokenAccount: PublicKey.default,
        swapPoolFeeTokenAccount: PublicKey.default,
      },
      ddFarmData: {
        ...ddFarmData,
        poolSwapTokenA: InstanceTulip._defaultTokenAccount(ddFarmData.poolSwapTokenA),
        poolSwapTokenB: InstanceTulip._defaultTokenAccount(ddFarmData.poolSwapTokenB),
        swapPoolMint: InstanceTulip._defaultMint(ddFarmData.swapPoolMint),
        feeCollectorTokenAccount: PublicKey.default,
        swapPoolFeeTokenAccount: PublicKey.default,
      },
      ddCompoundQueue,
      ddCompoundQueueNonce,
      ddConfigured,
      ddWithdrawQueue,
      ddWithdrawQueueNonce,
    };
  }

  private static async _fetchTokenAccountAndMint(
    connection: Connection,
    vaults: types.VaultInfo[]
  ): Promise<types.VaultInfo[]> {
    // Raydium:
    //   tokenAccount: (pool coin, pool pc -> calc TVL), (reward A, reward B -> get Mint, then calc fee ATA)
    // Orca:
    //   tokenAccount: (pool coin, pool pc -> calc TVL)
    //   mint: underlyingMint -> get authority (pool swap authority)
    const tokenAccountKeys: PublicKey[] = [];
    const mintKeys: PublicKey[] = [];
    vaults.forEach((vault) => {
      switch (vault.type) {
        case types.VaultType.Raydium:
          const raydiumVault = vault as types.RaydiumVaultInfo;
          tokenAccountKeys.push(raydiumVault.coinTokenAccount.address);
          tokenAccountKeys.push(raydiumVault.pcTokenAccount.address);
          tokenAccountKeys.push(raydiumVault.poolRewardATokenAccount.address);
          tokenAccountKeys.push(raydiumVault.poolRewardBTokenAccount.address);
          break;
        case types.VaultType.Orca:
          const orcaVault = vault as types.OrcaVaultInfo;
          tokenAccountKeys.push(orcaVault.farmData.poolSwapTokenA.address);
          tokenAccountKeys.push(orcaVault.farmData.poolSwapTokenB.address);
          mintKeys.push(orcaVault.farmData.swapPoolMint.address);
          break;
        case types.VaultType.OrcaDD:
          const orcaDDVault = vault as types.OrcaDDVaultInfo;
          tokenAccountKeys.push(orcaDDVault.farmData.poolSwapTokenA.address);
          tokenAccountKeys.push(orcaDDVault.farmData.poolSwapTokenB.address);
          mintKeys.push(orcaDDVault.farmData.swapPoolMint.address);

          tokenAccountKeys.push(orcaDDVault.ddFarmData.poolSwapTokenA.address);
          tokenAccountKeys.push(orcaDDVault.ddFarmData.poolSwapTokenB.address);
          mintKeys.push(orcaDDVault.ddFarmData.swapPoolMint.address);
          break;
        default:
          console.error("Error: Unsupported Vault");
          break;
      }
    });
    const tokenMap = new Map<string, Account>();
    (await getMultipleAccounts(connection, tokenAccountKeys)).forEach((t) =>
      tokenMap.set(t.pubkey.toBase58(), this._parseTokenAccount(t.pubkey, t.account?.data!))
    );
    const mintMap = new Map<string, Mint>();
    (await getMultipleAccounts(connection, mintKeys)).forEach((m) =>
      mintMap.set(m.pubkey.toBase58(), this._parseMint(m.pubkey, m.account?.data!))
    );

    // fetch APR/APY from api endpoint
    const apyMap = new Map<string, number>();
    const apiData = await (await axios.get(types.API_ENDPOINT + types.TOKEN_PAIRS.reduce((a, b) => a + "," + b))).data;
    types.TOKEN_PAIRS.forEach((key) => {
      const data = apiData[key];
      if (data) apyMap.set(data.lpMint, Number(data.apy));
    });

    const fetchedVaults: types.VaultInfo[] = [];
    for (let vault of vaults) {
      vault.apy = apyMap.get(vault.base.underlyingMint.toBase58()) || 0;
      switch (vault.type) {
        case types.VaultType.Raydium:
          // raydium vault
          const raydiumVault = vault as types.RaydiumVaultInfo;
          raydiumVault.coinTokenAccount = tokenMap.get(raydiumVault.coinTokenAccount.address.toBase58())!;
          raydiumVault.pcTokenAccount = tokenMap.get(raydiumVault.pcTokenAccount.address.toBase58())!;
          raydiumVault.poolRewardATokenAccount = tokenMap.get(raydiumVault.poolRewardATokenAccount.address.toBase58())!;
          raydiumVault.poolRewardBTokenAccount = tokenMap.get(raydiumVault.poolRewardBTokenAccount.address.toBase58())!;
          raydiumVault.feeCollectorRewardATokenAccount = await getAssociatedTokenAddress(
            raydiumVault.poolRewardATokenAccount.mint,
            raydiumVault.base.fees.feeWallet
          );
          raydiumVault.feeCollectorRewardBTokenAccount = await getAssociatedTokenAddress(
            raydiumVault.poolRewardBTokenAccount.mint,
            raydiumVault.base.fees.feeWallet
          );
          fetchedVaults.push(raydiumVault);
          break;
        case types.VaultType.Orca:
          // orca vault
          const orcaVault = vault as types.OrcaVaultInfo;
          orcaVault.farmData.poolSwapTokenA = tokenMap.get(orcaVault.farmData.poolSwapTokenA.address.toBase58())!;
          orcaVault.farmData.poolSwapTokenB = tokenMap.get(orcaVault.farmData.poolSwapTokenB.address.toBase58())!;
          orcaVault.farmData.swapPoolMint = mintMap.get(orcaVault.farmData.swapPoolMint.address.toBase58())!;
          orcaVault.farmData.poolSwapAuthority = orcaVault.farmData.swapPoolMint.mintAuthority!;
          orcaVault.farmData.feeCollectorTokenAccount = await getAssociatedTokenAddress(
            orcaVault.farmData.rewardTokenMint,
            orcaVault.base.fees.feeWallet
          );
          orcaVault.farmData.swapPoolFeeTokenAccount = new PublicKey(
            configV2.markets.orca.amms.find(
              (amm) => amm.lp_token_mint === orcaVault.farmData.swapPoolMint.address.toBase58()
            )?.pool_fee_account!
          );
          const config = configV2.vaults.accounts.find((v) => v.orca?.account === orcaVault.vaultId.toBase58())?.orca!;
          orcaVault.farmData.convertAuthority = new PublicKey(config.farm_data.convert_authority);
          fetchedVaults.push(orcaVault);
          break;
        case types.VaultType.OrcaDD:
          // orca dd vault
          const orcaDDVault = vault as types.OrcaDDVaultInfo;
          orcaDDVault.farmData.poolSwapTokenA = tokenMap.get(orcaDDVault.farmData.poolSwapTokenA.address.toBase58())!;
          orcaDDVault.farmData.poolSwapTokenB = tokenMap.get(orcaDDVault.farmData.poolSwapTokenB.address.toBase58())!;
          orcaDDVault.farmData.swapPoolMint = mintMap.get(orcaDDVault.farmData.swapPoolMint.address.toBase58())!;
          orcaDDVault.farmData.poolSwapAuthority = orcaDDVault.farmData.swapPoolMint.mintAuthority!;
          orcaDDVault.farmData.feeCollectorTokenAccount = await getAssociatedTokenAddress(
            orcaDDVault.farmData.rewardTokenMint,
            orcaDDVault.base.fees.feeWallet
          );
          orcaDDVault.farmData.swapPoolFeeTokenAccount = new PublicKey(
            configV2.markets.orca.amms.find(
              (amm) => amm.lp_token_mint === orcaDDVault.farmData.swapPoolMint.address.toBase58()
            )?.pool_fee_account!
          );
          const _config = configV2.vaults.accounts.find((v) => v.orca?.account === orcaDDVault.vaultId.toBase58())
            ?.orca!;
          orcaDDVault.farmData.convertAuthority = new PublicKey(_config.farm_data.convert_authority);

          orcaDDVault.ddFarmData.poolSwapTokenA = tokenMap.get(
            orcaDDVault.ddFarmData.poolSwapTokenA.address.toBase58()
          )!;
          orcaDDVault.ddFarmData.poolSwapTokenB = tokenMap.get(
            orcaDDVault.ddFarmData.poolSwapTokenB.address.toBase58()
          )!;
          orcaDDVault.ddFarmData.swapPoolMint = mintMap.get(orcaDDVault.ddFarmData.swapPoolMint.address.toBase58())!;
          orcaDDVault.ddFarmData.poolSwapAuthority = orcaDDVault.ddFarmData.swapPoolMint.mintAuthority!;
          orcaDDVault.ddFarmData.feeCollectorTokenAccount = await getAssociatedTokenAddress(
            orcaDDVault.ddFarmData.rewardTokenMint,
            orcaDDVault.base.fees.feeWallet
          );
          orcaDDVault.ddFarmData.swapPoolFeeTokenAccount = new PublicKey(
            configV2.markets.orca.amms.find(
              (amm) => amm.lp_token_mint === orcaDDVault.ddFarmData.swapPoolMint.address.toBase58()
            )?.pool_fee_account!
          );
          orcaDDVault.ddFarmData.convertAuthority = new PublicKey(
            _config.dd_farm_data?.config_data?.convert_authority!
          );
          fetchedVaults.push(orcaDDVault);
          break;
        default:
          fetchedVaults.push(vault);
          break;
      }
    }

    return fetchedVaults;
  }

  private static _isAllowedId(id: PublicKey) {
    return !!configV2.vaults.accounts.find(
      (account) =>
        account.multi_deposit_optimizer?.account == id.toString() ||
        account.lending_optimizer?.account == id.toString() ||
        account.raydium?.account == id.toString() ||
        account.orca?.account == id.toString() ||
        account.quarry?.account == id.toString() ||
        account.atrix?.account == id.toString()
    );
  }

  private static _parseTokenAccount(address: PublicKey, data: Buffer): Account {
    const rawAccount = AccountLayout.decode(data);
    return {
      address,
      mint: rawAccount.mint,
      owner: rawAccount.owner,
      amount: rawAccount.amount,
      delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
      delegatedAmount: rawAccount.delegatedAmount,
      isInitialized: rawAccount.state !== 0,
      isFrozen: rawAccount.state === 2,
      isNative: !!rawAccount.isNativeOption,
      rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
      closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null,
    };
  }

  private static _defaultTokenAccount(address: PublicKey): Account {
    return {
      address,
      mint: PublicKey.default,
      owner: PublicKey.default,
      amount: BigInt(0),
      delegate: null,
      delegatedAmount: BigInt(0),
      isInitialized: true,
      isFrozen: false,
      isNative: false,
      rentExemptReserve: null,
      closeAuthority: null,
    };
  }

  private static _parseMint(address: PublicKey, data: Buffer): Mint {
    const rawMint = MintLayout.decode(data);
    return {
      address,
      mintAuthority: rawMint.mintAuthorityOption ? rawMint.mintAuthority : null,
      supply: rawMint.supply,
      decimals: rawMint.decimals,
      isInitialized: rawMint.isInitialized,
      freezeAuthority: rawMint.freezeAuthorityOption ? rawMint.freezeAuthority : null,
    };
  }

  private static _defaultMint(address: PublicKey): Mint {
    return {
      address,
      mintAuthority: null,
      supply: BigInt(0),
      decimals: 0,
      isInitialized: true,
      freezeAuthority: null,
    };
  }
};

export { infos };

const RESERVE_LAYOUT_SPAN = 622;
const RAYDIUM_VAULT_LAYOUT_SPAN = 1712;
const ORCA_VAULT_LAYOUT_SPAN = 1376;
const ORCA_DD_VAULT_LAYOUT_SPAN = 2016;
const DEPOSITOR_LAYOUT_SPAN = 440;
const WAD = new BN(10).pow(new BN(18));

export class ReserveInfoWrapper implements IReserveInfoWrapper {
  constructor(public reserveInfo: types.ReserveInfo) {}
  supplyTokenMint() {
    return this.reserveInfo.liquidity.mintPubkey;
  }

  supplyTokenDecimal() {
    return this.reserveInfo.liquidity.mintDecimals;
  }

  reserveTokenMint() {
    return this.reserveInfo.collateral.reserveTokenMint;
  }

  reserveTokenDecimal() {
    return this.reserveInfo.liquidity.mintDecimals;
  }

  reserveTokenSupply() {
    return this.reserveInfo.collateral.mintTotalSupply;
  }

  async calculateCollateralAmount(connection: Connection, amount: BN): Promise<BN> {
    const availableAmount = this.reserveInfo.liquidity.availableAmount;
    const platformAmountWads = this.reserveInfo.liquidity.platformAmountWads;
    const borrowedAmountWads = this.reserveInfo.liquidity.borrowedAmount;

    const collateralMintInfo = await getMint(connection, this.reserveInfo.collateral.reserveTokenMint);
    const supply = new BN(Number(collateralMintInfo.supply));

    const borrowedAmount = borrowedAmountWads.div(WAD);
    const platformAmount = platformAmountWads.div(WAD);

    const totalSupply = availableAmount.add(borrowedAmount).sub(platformAmount);
    const collateralAmount = amount.mul(supply).div(totalSupply);

    return collateralAmount;
  }

  getLendingMarketAuthority(marketId: PublicKey): PublicKey {
    const authority = PublicKey.findProgramAddressSync([marketId.toBuffer()], TULIP_PROGRAM_ID)[0];

    return authority;
  }

  supplyApy(): number {
    const WAD = new BN(10).pow(new BN(18));
    const availableAmount = this.reserveInfo.liquidity.availableAmount;
    const platformAmount = this.reserveInfo.liquidity.platformAmountWads.div(WAD);
    let borrowedAmount = this.reserveInfo.liquidity.borrowedAmount.div(WAD);
    const totalSupply = availableAmount.add(borrowedAmount).sub(platformAmount);
    if (borrowedAmount.gt(totalSupply)) {
      borrowedAmount = totalSupply;
    }

    const utilizationRatio = Number(borrowedAmount) / Number(totalSupply);
    const optimalUtilization = Number(this.reserveInfo.config.optimalUtilizationRate) / 100;
    const degenUtilization = Number(this.reserveInfo.config.degenUtilizationRate) / 100;
    const minBorrowRate = Number(this.reserveInfo.config.minBorrowRate) / 100;
    const optimalBorrowRate = Number(this.reserveInfo.config.optimalBorrowRate) / 100;
    const degenBorrowRate = Number(this.reserveInfo.config.degenBorrowRate) / 100;
    const maxBorrowRate = Number(this.reserveInfo.config.maxBorrowRate) / 100;

    let borrowAPR = 0;
    if (utilizationRatio <= optimalUtilization) {
      const normalizedFactor = utilizationRatio / optimalUtilization;
      borrowAPR = normalizedFactor * (optimalBorrowRate - minBorrowRate) + minBorrowRate;
    } else if (utilizationRatio > optimalUtilization && utilizationRatio <= degenUtilization) {
      const normalizedFactor = (utilizationRatio - optimalUtilization) / (degenUtilization - optimalUtilization);

      borrowAPR = normalizedFactor * (degenBorrowRate - optimalBorrowRate) + optimalBorrowRate;
    } else if (utilizationRatio > degenUtilization) {
      const normalizedFactor = (utilizationRatio - degenUtilization) / (1 - degenUtilization);

      borrowAPR = normalizedFactor * (maxBorrowRate - degenBorrowRate) + degenBorrowRate;
    }

    const dailyBorrowAPR = borrowAPR / 365;
    const dailyLendAPR = dailyBorrowAPR * utilizationRatio * 100;
    const DAILY_COMPOUNDING_CYCLES = (24 * 60) / 10;
    const YEARLY_COMPOUNDING_CYCLES = DAILY_COMPOUNDING_CYCLES * 365;
    const periodicRate = dailyLendAPR / DAILY_COMPOUNDING_CYCLES;

    const supplyAPY = 100 * (Math.pow(1 + periodicRate / 100, YEARLY_COMPOUNDING_CYCLES) - 1);

    return supplyAPY;
  }

  totalSupply(): BN {
    const WAD = new BN(10).pow(new BN(18));
    const availableAmount = this.reserveInfo.liquidity.availableAmount;
    const platformAmount = this.reserveInfo.liquidity.platformAmountWads.div(WAD);
    let borrowedAmount = this.reserveInfo.liquidity.borrowedAmount.div(WAD);
    return availableAmount.add(borrowedAmount).sub(platformAmount);
  }
}

export class VaultInfoWrapper implements IVaultInfoWrapper {
  constructor(public vaultInfo: types.VaultInfo) {}

  getApr() {
    const numberOfPeriods = 8760;
    const apr = (Math.pow(this.vaultInfo.apy / 100 + 1, 1 / numberOfPeriods) - 1) * 100 * 24 * 365;

    return Number(apr.toFixed(2));
  }

  getPoolTokenAccounts(): { coinTokenAccount: Account; pcTokenAccount: Account } {
    if (this.vaultInfo.type == types.VaultType.Raydium) {
      const raydiumVault = this.vaultInfo as types.RaydiumVaultInfo;
      return { coinTokenAccount: raydiumVault.coinTokenAccount, pcTokenAccount: raydiumVault.pcTokenAccount };
    } else if (this.vaultInfo.type == types.VaultType.Orca) {
      const orcaVault = this.vaultInfo as types.OrcaVaultInfo;
      return { coinTokenAccount: orcaVault.farmData.poolSwapTokenA, pcTokenAccount: orcaVault.farmData.poolSwapTokenB };
    } else if (this.vaultInfo.type == types.VaultType.OrcaDD) {
      const orcaDDVault = this.vaultInfo as types.OrcaDDVaultInfo;
      return {
        coinTokenAccount: orcaDDVault.farmData.poolSwapTokenA,
        pcTokenAccount: orcaDDVault.farmData.poolSwapTokenB,
      };
    } else throw "Error: Pool token accounts don't exist.";
  }

  getDepositedLpAmountAndCapacityLimit(): { lpAmount: BN; capacityLimit: BN } {
    return {
      lpAmount: this.vaultInfo.base.totalDepositedBalance,
      capacityLimit: this.vaultInfo.base.totalDepositedBalanceCap,
    };
  }

  deriveTrackingAddress(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("tracking"), this.vaultInfo.vaultId.toBuffer(), owner.toBuffer()],
      TULIP_VAULT_V2_PROGRAM_ID
    );
  }

  deriveTrackingPdaAddress(trackingAddress: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([trackingAddress.toBuffer()], TULIP_VAULT_V2_PROGRAM_ID);
  }

  deriveTrackingQueueAddress(trackingPdaAddress: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("queue"), trackingPdaAddress.toBuffer()],
      TULIP_VAULT_V2_PROGRAM_ID
    );
  }
}
