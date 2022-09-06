import { PublicKey, Connection } from "@solana/web3.js";
import * as solend from "../src/solend";

describe("Solend", () => {
  // const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  //   commitment,
  //   wsEndpoint: "wss://rpc-mainnet-fork.dappio.xyz/ws",
  // });
  // const connection = new Connection("https://solana-api.tt-prod.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https://ssc-dao.genesysgo.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  const connection = new Connection("https:////api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });
  // const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  //   wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  // });

  const solReserveId = new PublicKey("8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36");

  it(" Can get all reserves", async () => {
    const reserves = (await solend.infos.getAllReserves(connection)) as solend.ReserveInfo[];
    console.log(`Fetched ${reserves.length} reserves`);
    console.log(`reserves with partner rewards: ${reserves.filter((r) => r.partnerRewardData.length > 0).length}`);
  });
  it(" Can get all reserveWrappers", async () => {
    const wrappers = (await solend.infos.getAllReserveWrappers(connection)) as solend.ReserveInfoWrapper[];
    const miningAPYs = await Promise.all(wrappers.map(async (w) => await w.miningApy(connection)));
    const supplyAPYs = await Promise.all(wrappers.map(async (w) => await w.supplyApy()));
    console.log(`Fetched ${wrappers.length} reserveInfoWrapper`);
    console.log(`Pool with miningAPY count: ${miningAPYs.filter((a) => a).length}`);
    console.log(`Pool with supplyAPY count: ${supplyAPYs.filter((a) => a).length} `);
    console.log(
      `reserves with partner rewards: ${wrappers.filter((w) => w.reserveInfo.partnerRewardData.length > 0).length}`
    );
  });
  it(" Can get reserve", async () => {
    const reserve = (await solend.infos.getReserve(connection, solReserveId)) as solend.ReserveInfo;
    console.log(
      `Fetched reserve: ${JSON.stringify({
        id: reserve.reserveId,
        mint: reserve.liquidity.mintPubkey.toBase58(),
      })}`
    );
  });
  it(" Can get all obligations", async () => {
    const obligations = (await solend.infos.getAllObligations(
      connection,
      new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4")
    )) as solend.ObligationInfo[];
    console.log(`Fetched ${obligations.length} obligations`);
    obligations.forEach((o, i) => {
      console.log(`\n* Obligation#${i + 1}`);
      console.log(`** ObligationId: ${o.obligationId}`);
      console.log(`** collateral count: ${o.obligationCollaterals.length}`);
      console.log(`** loan count: ${o.obligationLoans.length}`);
    });
  });
  it(" Can get obligation", async () => {
    const obligation = (await solend.infos.getObligation(
      connection,
      new PublicKey("41j1YyQCohRXZqZYDudemMvAAmFoCg9jyqEkEqd6djG1")
    )) as solend.ObligationInfo;
    console.log(`** collateral count: ${obligation.obligationCollaterals.length}`);
    console.log(`** loan count: ${obligation.obligationLoans.length}`);
  });
});
