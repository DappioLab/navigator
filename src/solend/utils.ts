import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js";
import { parseAggregatorAccountData } from "@switchboard-xyz/switchboard-api";
import { MINING_RESERVES } from "./infos";
import { SLND_PRICE_ORACLE } from "./ids";

export async function isMining(reserveId: PublicKey) {
  for (let address of MINING_RESERVES) {
    if (reserveId.equals(address)) {
      return true;
    }
  }
  return false;
}

export async function getSlndPrice(connection: Connection) {
  let priceFeed = await parseAggregatorAccountData(connection, SLND_PRICE_ORACLE);
  let price = priceFeed.lastRoundResult?.result as number;
  return new BN(price * 1000);
}

export enum ApiEndpoints {
  partnerReward = "https://api.solend.fi/liquidity-mining/external-reward-stats-v2?flat=true",
}
