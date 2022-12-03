import { getMint } from "@solana/spl-token-v2";
import { Connection, PublicKey, GetProgramAccountsConfig, MemcmpFilter, DataSizeFilter } from "@solana/web3.js";
import BN from "bn.js";
import { IInstanceMoneyMarket, IInstanceVault, IReserveInfoWrapper, IVaultInfoWrapper, PageConfig } from "../types";
import { configV2, TULIP_PROGRAM_ID, TULIP_VAULT_V2_PROGRAM_ID } from "./ids";
import {
  DEPOSITOR_LAYOUT,
  LENDING_OPTIMIZER_VAULT_LAYOUT,
  MULTI_DEPOSIT_OPTIMIZER_VAULT_LAYOUT,
  ORCA_DD_VAULT_LAYOUT,
  ORCA_VAULT_LAYOUT,
  RAYDIUM_VAULT_LAYOUT,
  RESERVE_LAYOUT,
} from "./layout";
import * as types from ".";
import { paginate } from "../utils";

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

    const lendingOptimizerSizeFilter: DataSizeFilter = {
      dataSize: LENDING_OPTIMIZER_VAULT_LAYOUT_SPAN,
    };
    const lendingOptimizerFilters = [lendingOptimizerSizeFilter];
    const lendingOptimizerConfig: GetProgramAccountsConfig = { filters: lendingOptimizerFilters };

    const multiDepositOptimizerSizeFilter: DataSizeFilter = {
      dataSize: MULTI_DEPOSIT_OPTIMIZER_VAULT_LAYOUT_SPAN,
    };
    const multiDepositOptimizerFilters = [multiDepositOptimizerSizeFilter];
    const multiDepositOptimizerConfig: GetProgramAccountsConfig = { filters: multiDepositOptimizerFilters };

    const raydiumVaults = paginate(await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, raydiumConfig), page);
    const orcaVaults = paginate(await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, orcaConfig), page);
    const orcaDDVaults = paginate(await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, orcaDDConfig), page);
    const lendingOptimizerVaults = paginate(
      await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, lendingOptimizerConfig),
      page
    );
    const multiDepositOptimizerVaults = paginate(
      await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, multiDepositOptimizerConfig),
      page
    );
    const vaultAccountInfos = [
      ...raydiumVaults,
      ...orcaVaults,
      ...orcaDDVaults,
      ...lendingOptimizerVaults,
      ...multiDepositOptimizerVaults,
    ];

    const vaults: types.VaultInfo[] = vaultAccountInfos
      .filter((info) => this._isAllowedId(info.pubkey))
      .map((info) => this.parseVault(info.account!.data, info.pubkey));

    return vaults;
  }

  static async getAllVaultWrappers(connection: Connection, page?: PageConfig): Promise<IVaultInfoWrapper[]> {
    return (await this.getAllVaults(connection, page)).map((vault) => new VaultInfoWrapper(vault));
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    const vaultAccountInfo = await connection.getAccountInfo(vaultId);
    if (!vaultAccountInfo) throw Error("Error: Cannot get reserve account (tulip.getVault)");

    const vault: types.VaultInfo = this.parseVault(vaultAccountInfo?.data, vaultId);

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
      case LENDING_OPTIMIZER_VAULT_LAYOUT_SPAN:
        parseVault = this._parseLendingOptimizerVault;
        break;
      case MULTI_DEPOSIT_OPTIMIZER_VAULT_LAYOUT_SPAN:
        parseVault = this._parseMultiDepositOptimizerVault;
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

    const config = configV2.vaults.accounts.find((account) => account.raydium?.account == vaultId.toString());

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      lpMint: raydiumLpMintAddress,
      ammId: raydiumAmmId,
      ammAuthority: raydiumAmmAuthority,
      ammOpenOrders: raydiumAmmOpenOrders,
      ammQuantitiesOrTargetOrders: raydiumAmmQuantitiesOrTargetOrders,
      stakeProgram: raydiumStakeProgram,
      liquidityProgram: raydiumLiquidityProgram,
      coinTokenAccount: raydiumCoinTokenAccount,
      pcTokenAccount: raydiumPcTokenAccount,
      poolTempTokenAccount: raydiumPoolTempTokenAccount,
      poolLpTokenAccount: raydiumPoolLpTokenAccount,
      poolWithdrawQueue: raydiumPoolWithdrawQueue,
      poolId: raydiumPoolId,
      poolAuthority: raydiumPoolAuthority,
      poolRewardATokenAccount: raydiumPoolRewardATokenAccount,
      poolRewardBTokenAccount: raydiumPoolRewardBTokenAccount,
      feeCollectorRewardATokenAccount: new PublicKey(config?.raydium?.fee_collector_reward_a_token_account!),
      feeCollectorRewardBTokenAccount: new PublicKey(config?.raydium?.fee_collector_reward_b_token_account!),
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

    const config = configV2.vaults.accounts.find((account) => account.orca?.account == vaultId.toString());

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      farmData,
      feeCollectorTokenAccount: new PublicKey(config?.orca?.farm_data.fee_collector_token_account!),
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

    const config = configV2.vaults.accounts.find((account) => account.orca?.account == vaultId.toString());

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      farmData,
      ddFarmData,
      ddCompoundQueue,
      ddCompoundQueueNonce,
      ddConfigured,
      ddWithdrawQueue,
      ddWithdrawQueueNonce,
      farmFeeCollectorTokenAccount: new PublicKey(config?.orca?.farm_data.fee_collector_token_account!),
      ddFeeCollectorTokenAccount: new PublicKey(config?.orca?.dd_farm_data?.config_data.fee_collector_token_account!),
    };
  }

  private static _parseLendingOptimizerVault(data: any, vaultId: PublicKey): types.LendingOptimizerVaultInfo {
    const decodeData = LENDING_OPTIMIZER_VAULT_LAYOUT.decode(data);
    const { base, currentFarmProgram, currentPlatformInformation, currentPlatformCount, lastRebaseSlot } = decodeData;

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      currentFarmProgram,
      currentPlatformInformation,
      currentPlatformCount,
      lastRebaseSlot,
    };
  }

  private static _parseMultiDepositOptimizerVault(data: any, vaultId: PublicKey): types.MultiDepositOptimizerVaultInfo {
    const decodeData = MULTI_DEPOSIT_OPTIMIZER_VAULT_LAYOUT.decode(data);
    const { base, lastRebaseSlot, standaloneVaults, targetVault, stateTransitionAccount, minimumRebalanceAmount } =
      decodeData;

    return {
      vaultId,
      shareMint: base.sharesMint,
      base,
      lastRebaseSlot,
      standaloneVaults,
      targetVault,
      stateTransitionAccount,
      minimumRebalanceAmount,
    };
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
};

export { infos };

const RESERVE_LAYOUT_SPAN = 622;
const RAYDIUM_VAULT_LAYOUT_SPAN = 1712;
const ORCA_VAULT_LAYOUT_SPAN = 1376;
const ORCA_DD_VAULT_LAYOUT_SPAN = 2016;
const LENDING_OPTIMIZER_VAULT_LAYOUT_SPAN = 1648;
const MULTI_DEPOSIT_OPTIMIZER_VAULT_LAYOUT_SPAN = 2072;
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
    // TODO
    return 0;
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
