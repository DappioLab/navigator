import { PublicKey, Connection } from "@solana/web3.js";
import { IServicesTokenInfo } from "../src";
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
    const symbolMap = new Map<string, IServicesTokenInfo>();
    wrappers.forEach((r, i) => {
      const mint = r.reserveInfo.liquidity.mintPubkey.toBase58();
      const found = mintMap.get(mint);
      if (!found) {
        mintMap.set(mint, r);
        const token = tokenList.find((t) => t.mint === mint);
        if (token) {
          symbolMap.set(mint, token);
          console.log(`\n#${i + 1} ${token.symbol}\nreserveId: ${r.reserveInfo.reserveId.toBase58()}`);
          console.log("total supply:", Number(r.totalSupply()) / 10 ** token.decimals);
          console.log("supplyAPY:", r.supplyApy());
        }
      } else {
        console.log(
          "filter out:",
          found.reserveInfo.liquidity.availableAmount.lt(r.reserveInfo.liquidity.availableAmount)
            ? found.reserveInfo.reserveId.toBase58()
            : r.reserveInfo.reserveId.toBase58()
        );
      }
    });
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
