import { Connection } from "@solana/web3.js";
import { assert } from "console";
import * as marinade from "../src/marinade";

describe("Marinade", () => {
  const connection = new Connection("https://api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });

  it(" Can get vault", async () => {
    const vault = (await marinade.infos.getVault(connection, marinade.MARINADE_STATE_ADDRESS)) as marinade.VaultInfo;
    console.log(`- VaultId: ${vault.vaultId.toBase58()}`);
  });

  it(" Can get all vaults", async () => {
    const vaults = (await marinade.infos.getAllVaults(connection)) as marinade.VaultInfo[];

    // Should only return main Marinade Account information
    assert(vaults.length == 1);

    console.log(`- Fetched ${vaults.length} vault`);
  });
});
