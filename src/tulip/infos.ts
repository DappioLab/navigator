import { getMint } from "@solana/spl-token-v2";
import { Connection, PublicKey, GetProgramAccountsConfig, MemcmpFilter, DataSizeFilter } from "@solana/web3.js";
import BN from "bn.js";
import { IInstanceMoneyMarket, IInstanceVault, IReserveInfoWrapper, IVaultInfoWrapper } from "../types";
import { vaultV2Config, TULIP_PROGRAM_ID, TULIP_VAULT_V2_PROGRAM_ID } from "./ids";
import { DEPOSITOR_LAYOUT, RAYDIUM_VAULT_LAYOUT, RESERVE_LAYOUT } from "./layout";
import * as types from ".";

let infos: IInstanceMoneyMarket & IInstanceVault;

infos = class InstanceTulip {
  static async getAllReserves(connection: Connection, marketId?: PublicKey): Promise<types.ReserveInfo[]> {
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
    const reserveAccounts = await connection.getProgramAccounts(TULIP_PROGRAM_ID, config);

    const reserves = reserveAccounts.map((account) => this.parseReserve(account.account.data, account.pubkey));
    return reserves;
  }

  static async getAllReserveWrappers(connection: Connection, marketId?: PublicKey): Promise<ReserveInfoWrapper[]> {
    const reserves = await this.getAllReserves(connection, marketId);
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

  static async getAllVaults(connection: Connection): Promise<types.VaultInfo[]> {
    const sizeFilter: DataSizeFilter = {
      dataSize: RAYDIUM_VAULT_LAYOUT_SPAN,
    };
    const filters = [sizeFilter];
    const config: GetProgramAccountsConfig = { filters: filters };

    const accountInfos = await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, config);
    const vaults: types.VaultInfo[] = accountInfos
      .filter((info) => this._isAllowedId(info.pubkey))
      .map((info) => this.parseVault(info.account.data, info.pubkey));
    return vaults;
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

  static async getDepositorId(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId: PublicKey = TULIP_VAULT_V2_PROGRAM_ID
  ): Promise<PublicKey> {
    return (await this.getDepositorIdWithBump(vaultId, userKey, programId)).pda;
  }

  static async getDepositorIdWithBump(
    vaultId: PublicKey,
    userKey: PublicKey,
    programId: PublicKey = TULIP_VAULT_V2_PROGRAM_ID
  ): Promise<{ pda: PublicKey; bump: number }> {
    let [pda, bump] = await PublicKey.findProgramAddress(
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
      extra_data_account,
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
      extra_data_account,
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

    const vaultAccount = vaultV2Config.vaults.accounts.find(
      (account) => account.raydium?.account == vaultId.toString()
    );

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
      feeCollectorRewardATokenAccount: new PublicKey(vaultAccount?.raydium?.fee_collector_reward_a_token_account!),
      feeCollectorRewardBTokenAccount: new PublicKey(vaultAccount?.raydium?.fee_collector_reward_b_token_account!),
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
  private static _isAllowedId(id: PublicKey) {
    return !!vaultV2Config.vaults.accounts.find(
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

  async getLendingMarketAuthority(marketId: PublicKey): Promise<PublicKey> {
    const authority = (await PublicKey.findProgramAddress([marketId.toBuffer()], TULIP_PROGRAM_ID))[0];

    return authority;
  }
}

export class VaultInfoWrapper implements IVaultInfoWrapper {
  constructor(public vaultInfo: types.VaultInfo) {}

  async deriveTrackingAddress(owner: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("tracking"), this.vaultInfo.vaultId.toBuffer(), owner.toBuffer()],
      TULIP_VAULT_V2_PROGRAM_ID
    );
  }

  async deriveTrackingPdaAddress(trackingAddress: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress([trackingAddress.toBuffer()], TULIP_VAULT_V2_PROGRAM_ID);
  }

  async deriveTrackingQueueAddress(trackingPdaAddress: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("queue"), trackingPdaAddress.toBuffer()],
      TULIP_VAULT_V2_PROGRAM_ID
    );
  }
}
