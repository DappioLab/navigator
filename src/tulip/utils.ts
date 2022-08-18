import { getAccount } from "@solana/spl-token-v2";
import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js";
import { ReserveInfo } from "./infos";

const WAD = new BN(10).pow(new BN(18));

export async function calculateCollateralAmount(
  connection: Connection,
  amount: BN,
  reserve: ReserveInfo
): Promise<BN> {
  const availableAmount = reserve.liquidity.availableAmount;
  const platformAmountWads = reserve.liquidity.platformAmountWads;
  const borrowedAmountWads = reserve.liquidity.borrowedAmount;

  const collateralMintInfo = await getAccount(
    connection,
    reserve.collateral.reserveTokenMint
  );
  const supply = new BN(Number(collateralMintInfo.amount));

  const borrowedAmount = borrowedAmountWads.div(WAD);
  const platformAmount = platformAmountWads.div(WAD);

  const totalSupply = availableAmount.add(borrowedAmount).sub(platformAmount);
  const collateralAmount = amount.mul(supply).div(totalSupply);

  return collateralAmount;
}
