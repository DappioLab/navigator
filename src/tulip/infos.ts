import { getAccount } from "@solana/spl-token-v2";
import {
  Connection,
  PublicKey,
  GetProgramAccountsConfig,
  MemcmpFilter,
  DataSizeFilter,
} from "@solana/web3.js";
import BN from "bn.js";
import { IReserveInfo, IReserveInfoWrapper } from "../types";
import { TULIP_PROGRAM_ID } from "./ids";
import { RESERVE_LAYOUT } from "./layout";

const RESERVE_LAYOUT_SPAN = 622;
const WAD = new BN(10).pow(new BN(18));

interface ReserveConfig {
  optimalUtilizationRate: BN;
  degenUtilizationRate: BN;
  loanToValueRatio: BN;
  liquidationBonus: BN;
  liquidationThreshold: BN;
  minBorrowRate: BN;
  optimalBorrowRate: BN;
  degenBorrowRate: BN;
  maxBorrowRate: BN;
  fees: ReserveFees;
}

interface ReserveFees {
  borrowFeeWad: BN;
  flashLoanFeeWad: BN;
  hostFeePercentage: BN;
}

interface ReserveCollateral {
  reserveTokenMint: PublicKey;
  mintTotalSupply: BN;
  supplyPubkey: PublicKey;
}

interface ReserveLiquidity {
  mintPubkey: PublicKey;
  mintDecimals: BN;
  supplyPubkey: PublicKey;
  feeReceiver: PublicKey;
  oraclePubkey: PublicKey;
  availableAmount: BN;
  borrowedAmount: BN;
  cumulativeBorrowRate: BN;
  marketPrice: BN;
  platformAmountWads: BN;
  platformFee: BN;
}

interface LastUpdate {
  lastUpdatedSlot: BN;
  stale: boolean;
}

export interface ReserveInfo extends IReserveInfo {
  version: BN;
  lastUpdate: LastUpdate;
  lendingMarket: PublicKey;
  borrowAuthorizer: PublicKey;
  liquidity: ReserveLiquidity;
  collateral: ReserveCollateral;
  config: ReserveConfig;
}

export class ReserveInfoWrapper implements IReserveInfoWrapper {
  constructor(public reserveInfo: ReserveInfo) {}
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

  async calculateCollateralAmount(
    connection: Connection,
    amount: BN
  ): Promise<BN> {
    const availableAmount = this.reserveInfo.liquidity.availableAmount;
    const platformAmountWads = this.reserveInfo.liquidity.platformAmountWads;
    const borrowedAmountWads = this.reserveInfo.liquidity.borrowedAmount;

    const collateralMintInfo = await getAccount(
      connection,
      this.reserveInfo.collateral.reserveTokenMint
    );
    const supply = new BN(Number(collateralMintInfo.amount));

    const borrowedAmount = borrowedAmountWads.div(WAD);
    const platformAmount = platformAmountWads.div(WAD);

    const totalSupply = availableAmount.add(borrowedAmount).sub(platformAmount);
    const collateralAmount = amount.mul(supply).div(totalSupply);

    return collateralAmount;
  }
}

export async function getAllReserveWrappers(
  connection: Connection,
  lendingMarket?: PublicKey
): Promise<ReserveInfoWrapper[]> {
  const allReserves = await getAllReserves(connection, lendingMarket);
  const allReservesWrapper: ReserveInfoWrapper[] = [];

  allReserves.map((reserveInfo) => {
    allReservesWrapper.push(new ReserveInfoWrapper(reserveInfo));
  });

  return allReservesWrapper;
}

export async function getAllReserves(
  connection: Connection,
  lendingMarket?: PublicKey
): Promise<ReserveInfo[]> {
  const dataSizeFilters: DataSizeFilter = {
    dataSize: RESERVE_LAYOUT_SPAN,
  };

  let filters: any[] = [dataSizeFilters];
  if (lendingMarket) {
    const programIdMemcmp: MemcmpFilter = {
      memcmp: {
        //offset 10 byte
        offset: 10,
        bytes: lendingMarket.toString(),
      },
    };
    filters = [programIdMemcmp, dataSizeFilters];
  }

  const config: GetProgramAccountsConfig = { filters: filters };
  const reserveAccounts = await connection.getProgramAccounts(
    TULIP_PROGRAM_ID,
    config
  );
  let reserves = [] as ReserveInfo[];
  for (let account of reserveAccounts) {
    let info = parseReserveData(account.account.data, account.pubkey);
    reserves.push(info);
  }

  return reserves;
}

export async function getReserve(
  connection: Connection,
  reserveId: PublicKey
): Promise<ReserveInfo> {
  const reserveAccountInfo = await connection.getAccountInfo(reserveId);
  return parseReserveData(reserveAccountInfo?.data, reserveId);
}

export async function getLendingMarketAuthority(
  lendingMarket: PublicKey
): Promise<PublicKey> {
  const authority = (
    await PublicKey.findProgramAddress(
      [lendingMarket.toBuffer()],
      TULIP_PROGRAM_ID
    )
  )[0];

  return authority;
}

export function parseReserveData(data: any, pubkey: PublicKey): ReserveInfo {
  const decodedData = RESERVE_LAYOUT.decode(data);
  let {
    version,
    lastUpdate,
    lendingMarket,
    borrowAuthorizer,
    liquidity,
    collateral,
    config,
  } = decodedData;

  return {
    reserveId: pubkey,
    version,
    lastUpdate,
    lendingMarket,
    borrowAuthorizer,
    liquidity,
    collateral,
    config,
  };
}
