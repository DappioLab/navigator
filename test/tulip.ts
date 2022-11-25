import { PublicKey, Connection } from "@solana/web3.js";
import * as tulip from "../src/tulip";
import { getTokenList } from "../src/utils";

describe("Tulip", () => {
  // const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", {
  //   commitment,
  //   wsEndpoint: "wss://rpc-mainnet-fork.dappio.xyz/ws",
  // });
  // const connection = new Connection("https://solana-api.tt-prod.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https:////api.mainnet-beta.solana.com", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });
  // const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  //   wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  // });
  const connection = new Connection("https://cache-rpc.dappio.xyz/", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });

  const solReserveId = new PublicKey("8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36");
  const userKey = new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4");

  it(" Can get all reserves", async () => {
    const reserves = (await tulip.infos.getAllReserves(connection)) as tulip.ReserveInfo[];
    console.log(`Fetched ${reserves.length} reserves`);
  });
  it(" Can get all reserveWrappers", async () => {
    const tokenList = await getTokenList();
    const wrappers = (await tulip.infos.getAllReserveWrappers(connection)) as tulip.ReserveInfoWrapper[];
    const mintMap = new Map<string, tulip.ReserveInfoWrapper>();
    wrappers.forEach((r) => {
      const found = mintMap.get(r.reserveInfo.liquidity.mintPubkey.toBase58());
      if (!found) {
        mintMap.set(r.reserveInfo.liquidity.mintPubkey.toBase58(), r);
      } else {
        console.log("mint:", r.reserveInfo.liquidity.mintPubkey.toBase58());
        console.log(found);
        console.log(r);
        console.log(
          "filter out:",
          found.reserveInfo.liquidity.availableAmount.lt(r.reserveInfo.liquidity.availableAmount)
            ? found.reserveInfo.reserveId.toBase58()
            : r.reserveInfo.reserveId.toBase58()
        );
      }
    });
    const mints = await Promise.all(wrappers.map(async (w) => await w.reserveInfo.liquidity.mintPubkey.toBase58()));
    console.log(`Fetched ${wrappers.length} reserveInfoWrapper`);
    const reserves = mints.map((m) => tokenList.find((t) => t.mint === m)?.symbol).filter((s) => s);
    console.log(`${reserves.length} reserves are valid.\nAll reserves' symbol:\n ${reserves}`);
  });
  it(" Can get reserve", async () => {
    const reserve = (await tulip.infos.getReserve(connection, solReserveId)) as tulip.ReserveInfo;
    console.log(
      `Fetched reserve: ${JSON.stringify({
        id: reserve.reserveId,
        mint: reserve.liquidity.mintPubkey.toBase58(),
      })}`
    );
  });
  it(" Can get all vaults", async () => {
    const vaults = (await tulip.infos.getAllVaults(connection)) as tulip.VaultInfo[];
    console.log(`Fetched ${vaults.length} vaults`);
    vaults.forEach((v, i) => {
      console.log(`\n* Vault#${i + 1}`);
      console.log(`** VaultId: ${v.vaultId}`);
    });
  });
  it(" Can get vault", async () => {
    const vault = (await tulip.infos.getVault!(
      connection,
      new PublicKey("4gKvh8AmET6U84KXAJdnq1eU53mtniPXGyfDTW2R3rQN")
    )) as tulip.VaultInfo;
    console.log(`- Vault shareMint: ${vault.shareMint.toBase58()}`);
    console.log(`- Vault base PDA: ${vault.base.pda.toBase58()}`);
  });
  it(" Can get all depositors", async () => {
    const depositors = (await tulip.infos.getAllDepositors(connection, userKey)) as tulip.DepositorInfo[];
    console.log(`Fetched ${depositors.length} depositors`);
    depositors.forEach((d, i) => {
      console.log(`\n* Depositor#${i + 1}`);
      console.log(`** DepositedId: ${d.vaultId}`);
      console.log(`** Deposited Balance: ${Number(d.depositedBalance)}`);
      console.log(`** Corresponding vaultId: ${d.vaultId.toBase58()}`);
    });
  });
  it(" Can get depositor", async () => {
    const depositor = (await tulip.infos.getDepositor(
      connection,
      new PublicKey("4gKvh8AmET6U84KXAJdnq1eU53mtniPXGyfDTW2R3rQN")
    )) as tulip.DepositorInfo;
    console.log(`- Deposited Balance: ${Number(depositor.depositedBalance)}`);
    console.log(`- Corresponding vault: ${depositor.vaultId.toBase58()}`);
  });
});
