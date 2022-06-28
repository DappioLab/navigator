import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api";
import { MINING_RESERVES } from "./infos";
import { SLND_PRICE_ORACLE } from "./ids";

export async function isMining(reserveAddress: PublicKey) {
  for (let address of MINING_RESERVES) {
    if (reserveAddress.equals(address)) {
      return true;
    }
  }
  return false;
}

export async function getSlndPrice(connection: Connection) {
  let priceFeed = await parseAggregatorAccountData(
    connection,
    SLND_PRICE_ORACLE
  );
  let price = priceFeed.lastRoundResult?.result as number;
  return new BN(price * 1000);
}
