import { Connection, PublicKey } from "@solana/web3.js";
import * as lido from "../src/lido";

describe("Lido", () => {
  const connection = new Connection("https://api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });
  //TODO: Modify these addresses
  const userKey = new PublicKey("Dkx85wVaUaDy9i9XWFdZvYrw5h2WMP1N8TqXPBdXY5Wh");
  const tokenKey = new PublicKey("F9kWLTs28mWKmmvKDhAvtHuVwYKx6L4yG7C3n4WyLVh6");
  it(" Can get all vaults", async () => {
    const vaults = (await lido.infos.getAllVaults(connection)) as lido.VaultInfo[];
    console.log(`- Fetched ${vaults.length} vaults`);
  });
  it(" Can get vault", async () => {
    const vault = await lido.infos.getVault!(connection, tokenKey);
    console.log(`- VaultId: ${vault.vaultId.toBase58()}`);
    console.log(`- Vault shareMint: ${vault.shareMint.toBase58()}`);
    // console.log(`- Vault base PDA: ${vault.base.pda.toBase58()}`);
  });
  it(" Can get all depositors", async () => {
    const depositors = await lido.infos.getAllDepositors(connection, userKey);
    console.log(`Fetched ${depositors.length} depositors`);
    depositors.forEach((d, i) => {
      console.log(`\n* Depositor #${i + 1}`);
      console.log(`** DepositorId: ${d.depositorId}`);
      //   console.log(`** Deposited Balance: ${d.amount.toNumber()}`);
    });
  });
  it(" Can get depositor", async () => {
    const depositor = await lido.infos.getDepositor(connection, tokenKey);
    // console.log(`- Deposited Balance: ${depositor.depositedBalance.toNumber()}`);
    console.log(`- Owner: ${depositor.userKey.toBase58()}`);
  });
});
