import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IInstancePool, IPoolInfoWrapper } from "../types";
import { CONFIG_LAYOUT, LIFINITY_AMM_LAYOUT } from "./layouts";
import { LIFINITY_ALL_AMM_ID } from "./ids";
import * as types from ".";
import { getMultipleAccounts } from "../utils";
import { AccountLayout, MintLayout } from "@solana/spl-token-v2";

const DIGIT = new BN(10000000000);

let infos: IInstancePool;

infos = class InstanceLifinity {
  static async getAllPools(connection: Connection): Promise<types.PoolInfo[]> {
    const lifinityAccounts = await getMultipleAccounts(connection, LIFINITY_ALL_AMM_ID);

    const pools = lifinityAccounts
      .filter((accountInfo) => accountInfo)
      .map((accountInfo) => {
        const pool = this.parsePool(accountInfo.account!.data, accountInfo.pubkey);
        return pool;
      });

    const poolConfigKeys: PublicKey[] = [];
    const tokenAccountKeys: PublicKey[] = [];
    const mintAccountKeys: PublicKey[] = [];

    pools.forEach((p) => {
      poolConfigKeys.push(p.poolConfig.key);

      tokenAccountKeys.push(p.tokenAAccount);
      tokenAccountKeys.push(p.tokenBAccount);

      mintAccountKeys.push(p.tokenAMint);
      mintAccountKeys.push(p.tokenBMint);
      mintAccountKeys.push(p.lpMint);
    });

    const poolConfigInfos = await getMultipleAccounts(connection, poolConfigKeys);
    const tokenAccountInfos = await getMultipleAccounts(connection, tokenAccountKeys);
    const mintAccountInfos = await getMultipleAccounts(connection, mintAccountKeys);

    return pools.map((pool, index) => {
      const tokenAAccount = AccountLayout.decode(tokenAccountInfos[index * 2].account!.data);
      const tokenBAccount = AccountLayout.decode(tokenAccountInfos[index * 2 + 1].account!.data);

      const tokenAMint = MintLayout.decode(mintAccountInfos[index * 3].account!.data);
      const tokenBMint = MintLayout.decode(mintAccountInfos[index * 3 + 1].account!.data);
      const lpMint = MintLayout.decode(mintAccountInfos[index * 3 + 2].account!.data);

      return {
        ...pool,
        poolConfig: this._parsePoolConfig(poolConfigInfos[index].account?.data, pools[index].poolConfig.key),
        tokenAAmount: tokenAAccount.amount,
        tokenADecimals: tokenAMint.decimals,
        tokenBAmount: tokenBAccount.amount,
        tokenBDecimals: tokenBMint.decimals,
        lpSupplyAmount: lpMint.supply,
        lpDecimals: lpMint.decimals,
      };
    });
  }

  static async getAllPoolWrappers(connection: Connection): Promise<PoolInfoWrapper[]> {
    const pools = await this.getAllPools(connection);
    return pools.map((pool) => new PoolInfoWrapper(pool));
  }

  static async getPool(connection: Connection, poolId: PublicKey): Promise<types.PoolInfo> {
    const lifinityAccount = await connection.getAccountInfo(poolId);
    if (!lifinityAccount) throw Error("Could not get Lifinity Account info");
    let poolInfo = this.parsePool(lifinityAccount.data, poolId);

    const AccountKeys: PublicKey[] = [];
    AccountKeys.push(poolInfo.poolConfig.key);
    AccountKeys.push(poolInfo.tokenAAccount);
    AccountKeys.push(poolInfo.tokenBAccount);
    AccountKeys.push(poolInfo.tokenAMint);
    AccountKeys.push(poolInfo.tokenBMint);
    AccountKeys.push(poolInfo.lpMint);

    const AccountInfos = await getMultipleAccounts(connection, AccountKeys);

    const poolConfig = this._parsePoolConfig(AccountInfos[0].account!.data, AccountInfos[0].pubkey);
    const tokenAAccount = AccountLayout.decode(AccountInfos[1].account!.data);
    const tokenBAccount = AccountLayout.decode(AccountInfos[2].account!.data);
    const tokenAMint = MintLayout.decode(AccountInfos[3].account!.data);
    const tokenBMint = MintLayout.decode(AccountInfos[4].account!.data);
    const lpMint = MintLayout.decode(AccountInfos[5].account!.data);

    return {
      ...poolInfo,
      poolConfig,
      tokenAAmount: tokenAAccount.amount,
      tokenADecimals: tokenAMint.decimals,
      tokenBAmount: tokenBAccount.amount,
      tokenBDecimals: tokenBMint.decimals,
      lpSupplyAmount: lpMint.supply,
      lpDecimals: lpMint.decimals,
    };
  }

  static async getPoolWrapper(connection: Connection, poolId: PublicKey): Promise<PoolInfoWrapper> {
    const pool = await this.getPool(connection, poolId);
    return new PoolInfoWrapper(pool);
  }

  static parsePool(data: Buffer, poolId: PublicKey): types.PoolInfo {
    const decodedData = LIFINITY_AMM_LAYOUT.decode(data);
    let {
      initializerKey,
      initializerDepositTokenAccount,
      initializerReceiveTokenAccount,
      initializerAmount,
      takerAmount,
      initialized,
      bumpSeed,
      freezeTrade,
      freezeDeposit,
      freezeWithdraw,
      baseDecimals,
      tokenProgramId,
      tokenAAccount,
      tokenBAccount,
      poolMint,
      tokenAMint,
      tokenBMint,
      poolFeeAccount,
      pythAccount,
      pythPcAccount,
      configAccount,
      tradeFeeNumerator,
      tradeFeeDenominator,
      hostFeeNumerator,
      hostFeeDenominator,
      curveType,
      curveParameters,
    } = decodedData;

    const tradeFee = tradeFeeDenominator.isZero()
      ? tradeFeeDenominator
      : tradeFeeNumerator.mul(DIGIT).div(tradeFeeDenominator);
    const hostFee = hostFeeDenominator.isZero()
      ? hostFeeDenominator
      : hostFeeNumerator.mul(DIGIT).div(hostFeeDenominator);

    return {
      poolId,
      initializerKey,
      initializerDepositTokenAccount,
      initializerReceiveTokenAccount,
      initializerAmount: new BN(initializerAmount),
      takerAmount: new BN(takerAmount),
      initialized: new BN(initialized),
      bumpSeed: new BN(bumpSeed),
      freezeTrade: new BN(freezeTrade),
      freezeDeposit: new BN(freezeDeposit),
      freezeWithdraw: new BN(freezeWithdraw),
      baseDecimals: new BN(baseDecimals),
      tokenProgramId,
      tokenAAccount,
      tokenBAccount,
      lpMint: poolMint,
      tokenAMint,
      tokenBMint,
      poolFeeAccount,
      pythAccount,
      pythPcAccount,
      poolConfig: { ...types.defaultPoolConfig, key: configAccount },
      tradeFee: new BN(tradeFee),
      hostFee: new BN(hostFee),
      curveType: new BN(curveType),
      curveParameters: new BN(curveParameters),
    };
  }
  private static _parsePoolConfig(data: any, pubkey: PublicKey): types.PoolConfig {
    const decodedData = CONFIG_LAYOUT.decode(data);
    let {
      concentrationRatio,
      lastPrice,
      adjustRatio,
      balanceRatio,
      lastBalancedPrice,
      configDenominator,
      pythConfidenceLimit,
      pythSlotLimit,
      volumeX,
      volumeY,
      volumeXinY,
      coefficientUp,
      coefficientDown,
      oracleStatus,
      depositCap,
      configTemp2,
    } = decodedData;

    return {
      key: pubkey,
      concentrationRatio: new BN(concentrationRatio),
      lastPrice: new BN(lastPrice),
      adjustRatio: new BN(adjustRatio),
      balanceRatio: new BN(balanceRatio),
      lastBalancedPrice: new BN(lastBalancedPrice),
      configDenominator: new BN(configDenominator),
      pythConfidenceLimit: new BN(pythConfidenceLimit),
      pythSlotLimit: new BN(pythSlotLimit),
      volumeX: new BN(volumeX),
      volumeY: new BN(volumeY),
      volumeXinY: new BN(volumeXinY),
      coefficientUp: new BN(coefficientUp),
      coefficientDown: new BN(coefficientDown),
      oracleStatus: new BN(oracleStatus),
      depositCap: new BN(depositCap),
      configTemp2: new BN(configTemp2),
    };
  }
};

export { infos };

export class PoolInfoWrapper implements IPoolInfoWrapper {
  constructor(public poolInfo: types.PoolInfo) {}

  getTokenAmounts(lpAmount: number): { tokenAAmount: number; tokenBAmount: number } {
    if (lpAmount === 0) return { tokenAAmount: 0, tokenBAmount: 0 };
    const tokenAAmount = this.poolInfo.lpSupplyAmount
      ? Number((this.poolInfo.tokenAAmount! * BigInt(lpAmount)) / this.poolInfo.lpSupplyAmount!)
      : 0;
    const tokenBAmount = this.poolInfo.lpSupplyAmount
      ? Number((this.poolInfo.tokenBAmount! * BigInt(lpAmount)) / this.poolInfo.lpSupplyAmount!)
      : 0;

    return {
      tokenAAmount,
      tokenBAmount,
    };
  }

  getLpAmount(tokenAmount: number, tokenMint: PublicKey): number {
    if (tokenAmount === 0) return 0;
    if (!tokenMint.equals(this.poolInfo.tokenAMint) && !tokenMint.equals(this.poolInfo.tokenBMint)) {
      throw new Error("Wrong token mint");
    }

    const balance = tokenMint.equals(this.poolInfo.tokenAMint)
      ? this.poolInfo.tokenAAmount!
      : this.poolInfo.tokenBAmount!;

    const sharePercent = tokenAmount / (Number(balance) + tokenAmount);

    return sharePercent * Number(this.poolInfo.lpSupplyAmount);
  }

  getLpPrice(tokenAPrice: number, tokenBPrice: number): number {
    const tokenABalance = Number(this.poolInfo.tokenAAmount) / 10 ** this.poolInfo.tokenADecimals!;
    const tokenBBalance = Number(this.poolInfo.tokenBAmount) / 10 ** this.poolInfo.tokenBDecimals!;
    const lpSupply = Number(this.poolInfo.lpSupplyAmount);
    const lpDecimals = this.poolInfo.lpDecimals!;

    const lpPrice =
      lpSupply > 0
        ? (tokenABalance * 10 ** lpDecimals * tokenAPrice + tokenBBalance * 10 ** lpDecimals * tokenBPrice) / lpSupply
        : 0;

    return lpPrice;
  }

  getApr(tradingVolumeIn24Hours: number, lpPrice: number): number {
    // TODO
    return 0;
  }

  getLiquidityUpperCap() {
    return this.poolInfo.poolConfig.depositCap;
  }
}
