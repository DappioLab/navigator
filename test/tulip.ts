import { PublicKey, Connection } from "@solana/web3.js";
import * as tulip from "../src/tulip";

describe("Tulip", () => {
  // const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  //   commitment,
  //   wsEndpoint: "wss://rpc-mainnet-fork.dappio.xyz/ws",
  // });
  // const connection = new Connection("https://solana-api.tt-prod.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  const connection = new Connection("https://ssc-dao.genesysgo.net", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });
  // const connection = new Connection("https:////api.mainnet-beta.solana.com", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  //   wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  // });

  const solReserveId = new PublicKey("8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36");

  // it(" Can get all reserves", async () => {
  //   const reserves = (await tulip.infos.getAllReserves(connection)) as tulip.ReserveInfo[];
  //   console.log(`Fetched ${reserves.length} reserves`);
  //   // console.log(`${reserves.map((r)=>token)}`);
  // });
  // it(" Can get all reserveWrappers", async () => {
  //   const wrappers = (await tulip.infos.getAllReserveWrappers(connection)) as tulip.ReserveInfoWrapper[];
  //   // const miningAPYs = await Promise.all(wrappers.map(async (w) => await w.miningApy(connection)));
  //   // const supplyAPYs = await Promise.all(wrappers.map(async (w) => await w.supplyApy()));
  //   console.log(`Fetched ${wrappers.length} reserveInfoWrapper`);
  //   // console.log(`Pool with miningAPY count: ${miningAPYs.filter((a) => a).length}`);
  //   // console.log(`Pool with supplyAPY count: ${supplyAPYs.filter((a) => a).length} `);
  //   // console.log(
  //   //   `reserves with partner rewards: ${wrappers.filter((w) => w.reserveInfo.partnerRewardData.length > 0).length}`
  //   // );
  // });
  // it(" Can get reserve", async () => {
  //   const reserve = (await tulip.infos.getReserve(connection, solReserveId)) as tulip.ReserveInfo;
  //   console.log(
  //     `Fetched reserve: ${JSON.stringify({
  //       id: reserve.reserveId,
  //       mint: reserve.liquidity.mintPubkey.toBase58(),
  //     })}`
  //   );
  // });
  it(" Can get all vaults", async () => {
    const vaults = (await tulip.infos.getAllVaults(connection)) as tulip.VaultInfo[];
    console.log(`Fetched ${vaults.length} vaults`);
    // vaults.forEach((v, i) => {
    //   console.log(`\n* Vault#${i + 1}`);
    //   console.log(`** VaultId: ${v.vaultId}`);
    // });
  });
  it(" Can get vault", async () => {
    const vault = (await tulip.infos.getVault!(
      connection,
      new PublicKey("4gKvh8AmET6U84KXAJdnq1eU53mtniPXGyfDTW2R3rQN")
      // new PublicKey("BMBaSwtdHxeXaCW68oMGDr26kLoK2bPP8aSMrNgkm62U")
    )) as tulip.VaultInfo;
    console.log(`- Vault shareMint: ${vault.shareMint.toBase58()}`);
    console.log(`- Vault base PDA: ${vault.base.pda.toBase58()}`);
  });
});
