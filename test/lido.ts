import { Connection, PublicKey } from "@solana/web3.js";
import { assert } from "console";
import * as lido from "../src/lido";

describe("Lido", () => {
  const connection = new Connection("https://api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });
  //TODO: Modify these addresses
  const userKey = new PublicKey("Dkx85wVaUaDy9i9XWFdZvYrw5h2WMP1N8TqXPBdXY5Wh");
  const tokenKey = new PublicKey("F9kWLTs28mWKmmvKDhAvtHuVwYKx6L4yG7C3n4WyLVh6");
  // it(" Can get all vaults", async () => {
  //   const vaults = (await lido.infos.getAllVaults(connection)) as lido.VaultInfo[];

  //   // Should only return main Lido Account information
  //   assert(vaults.length == 1);

  //   console.log(`- Fetched ${vaults.length} vault`);
  // });
  // it(" Can get vault", async () => {
  //   const vault = await lido.infos.getVault!(connection, lido.LIDO_ADDRESS);
  //   console.log(`- VaultId: ${vault.vaultId.toBase58()}`);
  //   console.log(`- Vault shareMint: ${vault.shareMint.toBase58()}`);
  // });
  // it(" Can get all depositors", async () => {
  //   const depositors = (await lido.infos.getAllDepositors(connection, userKey)) as lido.DepositorInfo[];
  //   console.log(`Fetched ${depositors.length} depositors`);
  //   depositors.forEach((d, i) => {
  //     console.log(`\n* Depositor #${i + 1}`);
  //     console.log(`** DepositorId: ${d.depositorId}`);
  //     console.log(`** Deposited Balance: ${d.rawAccount.amount}`);
  //   });
  // });
  // it(" Can get depositor", async () => {
  //   const depositor = (await lido.infos.getDepositor(connection, tokenKey)) as lido.DepositorInfo;
  //   console.log(`- Deposited Balance: ${depositor.rawAccount.amount}`);
  //   console.log(`- Owner: ${depositor.userKey.toBase58()}`);
  // });
  // it(" Can get maintainers", async () => {
  //   const vault = (await lido.infos.getVault(connection, lido.LIDO_ADDRESS)) as lido.VaultInfo;
  //   vault.maintainers.entries.forEach((m, i) => {
  //     console.log(`\n* Maintainer #${i + 1}`);
  //     console.log(`** Maintainer Pubkey: ${m.pubkey.toBase58()}`);
  //   });
  // });
  // it(" Can get validators", async () => {
  //   const vault = (await lido.infos.getVault(connection, lido.LIDO_ADDRESS)) as lido.VaultInfo;
  //   vault.validators.entries.forEach((v, i) => {
  //     console.log(`\n* Validator #${i + 1}`);
  //     console.log(`** Validator Pubkey: ${v.pubkey.toBase58()}`);
  //   });
  // });
  it(" Can get APR", async () => {
    const vault = (await lido.infos.getVault(connection, lido.LIDO_ADDRESS)) as lido.VaultInfo;
    const vaultWrapper = new lido.VaultInfoWrapper(vault);
    console.log(await vaultWrapper.getApy());
  });
});
