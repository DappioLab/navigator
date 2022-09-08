import { getMint } from "@solana/spl-token-v2";
import { Connection, PublicKey, GetProgramAccountsConfig, MemcmpFilter, DataSizeFilter } from "@solana/web3.js";
import BN from "bn.js";
import { IDepositorInfo, IInstanceMoneyMarket, IInstanceVault, IReserveInfoWrapper, IVaultInfoWrapper } from "../types";
import { vaultV2Config, TULIP_PROGRAM_ID, TULIP_VAULT_V2_PROGRAM_ID } from "./ids";
import { RAYDIUM_VAULT_LAYOUT, RESERVE_LAYOUT } from "./layout";
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

    const r = reserveAccounts.map((account) => this.parseReserve(account.account.data, account.pubkey));

    let reserves = [] as types.ReserveInfo[];
    for (let account of reserveAccounts) {
      let info = this.parseReserve(account.account.data, account.pubkey);
      reserves.push(info);
    }

    return reserves;
  }

  static async getAllReserveWrappers(connection: Connection, marketId?: PublicKey): Promise<ReserveInfoWrapper[]> {
    const allReserves = await this.getAllReserves(connection, marketId);
    const allReservesWrapper: ReserveInfoWrapper[] = [];

    allReserves.map((reserveInfo) => {
      allReservesWrapper.push(new ReserveInfoWrapper(reserveInfo));
    });

    return allReservesWrapper;
  }

  static async getReserve(connection: Connection, reserveId: PublicKey): Promise<types.ReserveInfo> {
    const reserveAccountInfo = await connection.getAccountInfo(reserveId);
    if (!reserveAccountInfo) throw Error("Error: Cannot get reserve account (tulip.getReserve)");
    return this.parseReserve(reserveAccountInfo?.data, reserveId);
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
    const allVaultAccount = await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, config);
    let allVault: types.VaultInfo[] = [];

    for (let vaultAccountInfo of allVaultAccount) {
      if (this._isAllowedId(vaultAccountInfo.pubkey)) {
        const vault = this.parseVault(vaultAccountInfo.account.data, vaultAccountInfo.pubkey);
        allVault.push(vault);
      } else continue;
    }

    return allVault;
  }

  static async getVault(connection: Connection, vaultId: PublicKey): Promise<types.VaultInfo> {
    const vaultAccountInfo = await connection.getAccountInfo(vaultId);
    if (!vaultAccountInfo) throw Error("Error: Cannot get reserve account (tulip.getVault)");

    const vault = this.parseVault(vaultAccountInfo?.data, vaultId);

    return vault;
  }

  static parseVault(data: Buffer, vaultId: PublicKey): types.VaultInfo {
    let parseVault;
    switch (data.length) {
      case RAYDIUM_VAULT_LAYOUT_SPAN:
        parseVault = this._parseRaydiumVault;
        break;
      default:
        parseVault = this._parseRaydiumVault;
    }
    let vault = {} as unknown as types.VaultInfo;
    let failId = 0;
    let successId = 0;
    try {
      vault = parseVault(data, vaultId);
      console.log({ successId, vaultId: vaultId.toBase58() });
    } catch (e) {
      failId++;
      console.log({ failId, vaultId: vaultId.toBase58() });
    }
    return vault;
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
    return vaultV2Config.vaults.accounts.find(
      (account) =>
        account.multi_deposit_optimizer?.account == id.toString() ||
        account.lending_optimizer?.account == id.toString() ||
        account.raydium?.account == id.toString() ||
        account.orca?.account == id.toString() ||
        account.quarry?.account == id.toString() ||
        account.atrix?.account == id.toString()
    )
      ? true
      : false;
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

const RESERVE_LAYOUT_SPAN = 622;
const RAYDIUM_VAULT_LAYOUT_SPAN = 1712;
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

// export async function getAllVaults(connection: Connection): Promise<VaultInfo[]> {
//   const sizeFilter: DataSizeFilter = {
//     dataSize: RAYDIUM_VAULT_V1_LAYOUT_SPAN,
//   };
//   const filters = [sizeFilter];
//   const config: GetProgramAccountsConfig = { filters: filters };
//   const allVaultAccount = await connection.getProgramAccounts(TULIP_VAULT_V2_PROGRAM_ID, config);
//   let allVault: VaultInfo[] = [];

//   for (let vaultAccountInfo of allVaultAccount) {
//     let parseVault;
//     switch (vaultAccountInfo.account.data.length) {
//       case RAYDIUM_VAULT_V1_LAYOUT_SPAN:
//         parseVault = parseRaydiumVault;
//         break;
//       default:
//         parseVault = parseRaydiumVault;
//     }

//     const vault = parseVault(vaultAccountInfo.account.data, vaultAccountInfo.pubkey);
//     allVault.push(vault);
//   }

//   return allVault;
// }

// export async function getVault(connection: Connection, vaultId: PublicKey): Promise<VaultInfo> {
//   const vaultAccountInfo = await connection.getAccountInfo(vaultId);

//   let parseVault;
//   switch (vaultAccountInfo?.data.length) {
//     case RAYDIUM_VAULT_V1_LAYOUT_SPAN:
//       parseVault = parseRaydiumVault;
//       break;
//     default:
//       parseVault = parseRaydiumVault;
//   }

//   const vault = parseVault(vaultAccountInfo?.data, vaultId);

//   return vault;
// }

// export function parseRaydiumVault(data: any, vaultId: PublicKey): RaydiumVaultInfo {
//   const decodeData = RAYDIUM_VAULT_LAYOUT.decode(data);
//   const {
//     base,
//     raydiumLpMintAddress,
//     raydiumAmmId,
//     raydiumAmmAuthority,
//     raydiumAmmOpenOrders,
//     raydiumAmmQuantitiesOrTargetOrders,
//     raydiumStakeProgram,
//     raydiumLiquidityProgram,
//     raydiumCoinTokenAccount,
//     raydiumPcTokenAccount,
//     raydiumPoolTempTokenAccount,
//     raydiumPoolLpTokenAccount,
//     raydiumPoolWithdrawQueue,
//     raydiumPoolId,
//     raydiumPoolAuthority,
//     raydiumPoolRewardATokenAccount,
//     raydiumPoolRewardBTokenAccount,
//     dualRewards,
//     vaultRewardATokenAccount,
//     vaultRewardBTokenAccount,
//     vaultStakeInfoAccount,
//     associatedStakeInfoAddress,
//     coinMint,
//     pcMint,
//     serumMarket,
//   } = decodeData;

//   const vaultAccount = vaultV2Config.vaults.accounts.find((account) => account.raydium?.account == vaultId.toString());

//   return {
//     vaultId,
//     shareMint: base.sharesMint,
//     base,
//     lpMint: raydiumLpMintAddress,
//     ammId: raydiumAmmId,
//     ammAuthority: raydiumAmmAuthority,
//     ammOpenOrders: raydiumAmmOpenOrders,
//     ammQuantitiesOrTargetOrders: raydiumAmmQuantitiesOrTargetOrders,
//     stakeProgram: raydiumStakeProgram,
//     liquidityProgram: raydiumLiquidityProgram,
//     coinTokenAccount: raydiumCoinTokenAccount,
//     pcTokenAccount: raydiumPcTokenAccount,
//     poolTempTokenAccount: raydiumPoolTempTokenAccount,
//     poolLpTokenAccount: raydiumPoolLpTokenAccount,
//     poolWithdrawQueue: raydiumPoolWithdrawQueue,
//     poolId: raydiumPoolId,
//     poolAuthority: raydiumPoolAuthority,
//     poolRewardATokenAccount: raydiumPoolRewardATokenAccount,
//     poolRewardBTokenAccount: raydiumPoolRewardBTokenAccount,
//     feeCollectorRewardATokenAccount: new PublicKey(vaultAccount?.raydium?.fee_collector_reward_a_token_account!),
//     feeCollectorRewardBTokenAccount: new PublicKey(vaultAccount?.raydium?.fee_collector_reward_b_token_account!),
//     dualRewards,
//     vaultRewardATokenAccount,
//     vaultRewardBTokenAccount,
//     vaultStakeInfoAccount,
//     associatedStakeInfoAddress,
//     coinMint,
//     pcMint,
//     serumMarket,
//   };
// }

// interface Fees {
//   feeMultiplier: BN;
//   controllerFee: BN;
//   platformFee: BN;
//   withdrawFee: BN;
//   depositFee: BN;
//   feeWallet: PublicKey;
//   totalCollectedA: BN;
//   totalCollectedB: BN;
// }

// interface RealizedYield {
//   gainPerSecond: BN;
//   apr: BN;
// }

// interface Base {
//   nonce: BN;
//   tag: BN[];
//   pda: PublicKey;
//   pdaNonce: BN;
//   pdaAlignment: BN[];
//   totalDepositedBalance: BN;
//   totalShares: BN;
//   underlyingMint: PublicKey;
//   underlyingWithdrawQueue: PublicKey;
//   underlyingDepositQueue: PublicKey;
//   underlyingCompoundQueue: PublicKey;
//   sharesMint: PublicKey;
//   withdrawsPaused: BN;
//   depositsPaused: BN;
//   compoundPaused: BN;
//   supportsCompound: BN;
//   rebasePaused: BN;
//   rebalancePaused: BN;
//   stateAlignment: BN[];
//   precisionFactor: BN;
//   lastCompoundTime: BN;
//   compoundInterval: BN;
//   slippageTolerance: BN;
//   slipAlignment: BN[];
//   fees: Fees;
//   farm: BN[];
//   configured: BN;
//   configuredAlignment: BN[];
//   pendingFees: BN;
//   totalDepositedBalanceCap: BN;
//   realizedYield: RealizedYield;
// }

// export interface RaydiumVaultInfo extends VaultInfo {
//   base: Base;
//   lpMint: PublicKey;
//   ammId: PublicKey;
//   ammAuthority: PublicKey;
//   ammOpenOrders: PublicKey;
//   ammQuantitiesOrTargetOrders: PublicKey;
//   stakeProgram: PublicKey;
//   liquidityProgram: PublicKey;
//   coinTokenAccount: PublicKey;
//   pcTokenAccount: PublicKey;
//   poolTempTokenAccount: PublicKey;
//   poolLpTokenAccount: PublicKey;
//   poolWithdrawQueue: PublicKey;
//   poolId: PublicKey;
//   poolAuthority: PublicKey;
//   poolRewardATokenAccount: PublicKey;
//   poolRewardBTokenAccount: PublicKey;
//   feeCollectorRewardATokenAccount: PublicKey;
//   feeCollectorRewardBTokenAccount: PublicKey;
//   dualRewards: BN;
//   vaultRewardATokenAccount: PublicKey;
//   vaultRewardBTokenAccount: PublicKey;
//   vaultStakeInfoAccount: PublicKey;
//   associatedStakeInfoAddress: PublicKey;
//   coinMint: PublicKey;
//   pcMint: PublicKey;
//   serumMarket: PublicKey;
// }

// export async function getAllReserveWrappers(
//   connection: Connection,
//   lendingMarket?: PublicKey
// ): Promise<ReserveInfoWrapper[]> {
//   const allReserves = await getAllReserves(connection, lendingMarket);
//   const allReservesWrapper: ReserveInfoWrapper[] = [];

//   allReserves.map((reserveInfo) => {
//     allReservesWrapper.push(new ReserveInfoWrapper(reserveInfo));
//   });

//   return allReservesWrapper;
// }

// export async function getAllReserves(connection: Connection, lendingMarket?: PublicKey): Promise<ReserveInfo[]> {
//   const dataSizeFilters: DataSizeFilter = {
//     dataSize: RESERVE_LAYOUT_SPAN,
//   };

//   let filters: any[] = [dataSizeFilters];
//   if (lendingMarket) {
//     const programIdMemcmp: MemcmpFilter = {
//       memcmp: {
//         //offset 10 byte
//         offset: 10,
//         bytes: lendingMarket.toString(),
//       },
//     };
//     filters = [programIdMemcmp, dataSizeFilters];
//   }

//   const config: GetProgramAccountsConfig = { filters: filters };
//   const reserveAccounts = await connection.getProgramAccounts(TULIP_PROGRAM_ID, config);
//   let reserves = [] as ReserveInfo[];
//   for (let account of reserveAccounts) {
//     let info = parseReserveData(account.account.data, account.pubkey);
//     reserves.push(info);
//   }

//   return reserves;
// }

// export async function getReserve(connection: Connection, reserveId: PublicKey): Promise<ReserveInfo> {
//   const reserveAccountInfo = await connection.getAccountInfo(reserveId);
//   return parseReserveData(reserveAccountInfo?.data, reserveId);
// }

// export async function getLendingMarketAuthority(lendingMarket: PublicKey): Promise<PublicKey> {
//   const authority = (await PublicKey.findProgramAddress([lendingMarket.toBuffer()], TULIP_PROGRAM_ID))[0];

//   return authority;
// }

// export function parseReserveData(data: any, pubkey: PublicKey): ReserveInfo {
//   const decodedData = RESERVE_LAYOUT.decode(data);
//   let { version, lastUpdate, lendingMarket, borrowAuthorizer, liquidity, collateral, config } = decodedData;

//   return {
//     reserveId: pubkey,
//     version,
//     lastUpdate,
//     lendingMarket,
//     borrowAuthorizer,
//     liquidity,
//     collateral,
//     config,
//   };
// }

// interface ReserveConfig {
//   optimalUtilizationRate: BN;
//   degenUtilizationRate: BN;
//   loanToValueRatio: BN;
//   liquidationBonus: BN;
//   liquidationThreshold: BN;
//   minBorrowRate: BN;
//   optimalBorrowRate: BN;
//   degenBorrowRate: BN;
//   maxBorrowRate: BN;
//   fees: ReserveFees;
// }

// interface ReserveFees {
//   borrowFeeWad: BN;
//   flashLoanFeeWad: BN;
//   hostFeePercentage: BN;
// }

// interface ReserveCollateral {
//   reserveTokenMint: PublicKey;
//   mintTotalSupply: BN;
//   supplyPubkey: PublicKey;
// }

// interface ReserveLiquidity {
//   mintPubkey: PublicKey;
//   mintDecimals: BN;
//   supplyPubkey: PublicKey;
//   feeReceiver: PublicKey;
//   oraclePubkey: PublicKey;
//   availableAmount: BN;
//   borrowedAmount: BN;
//   cumulativeBorrowRate: BN;
//   marketPrice: BN;
//   platformAmountWads: BN;
//   platformFee: BN;
// }

// interface LastUpdate {
//   lastUpdatedSlot: BN;
//   stale: boolean;
// }

// export interface ReserveInfo extends IReserveInfo {
//   version: BN;
//   lastUpdate: LastUpdate;
//   lendingMarket: PublicKey;
//   borrowAuthorizer: PublicKey;
//   liquidity: ReserveLiquidity;
//   collateral: ReserveCollateral;
//   config: ReserveConfig;
// }

// export interface VaultInfo extends IVaultInfo {
//   base: Base;
// }
