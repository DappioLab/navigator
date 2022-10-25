import { Connection } from "@solana/web3.js";
import * as marinade from "../src/marinade";

describe("Marinade", () => {
  const connection = new Connection("https://api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
  });

  it(" VaultInfo", async () => {
    const vault = (await marinade.infos.getVault!(connection, marinade.MARINADE_STATE_ADDRESS)) as marinade.VaultInfo;
    const vaultInfoWrapper = new marinade.VaultInfoWrapper(vault);
    console.log(`- Marinade Version: ${vaultInfoWrapper.getVersion()}`);
  });
});
