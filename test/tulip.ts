import { Account } from "@solana/spl-token-v2";
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
  it(" Can get all vault wrappers", async () => {
    let vaultInfoKeys: PublicKey[] = [];
    const vaults = (await tulip.infos.getAllVaultWrappers(connection)) as tulip.VaultInfoWrapper[];
    console.log(`Fetched ${vaults.length} vaults`);
    vaults.forEach((v, i) => {
      console.log(`\n* Vault#${i + 1}`);
      console.log(`** VaultId: ${v.vaultInfo.vaultId}`);
      console.log("feeWallet:", v.vaultInfo.base.fees.feeWallet.toBase58());
      console.log("apr:", v.getApr());
      const vaultDeposited = v.getDepositedLpAmountAndCapacityLimit();
      console.log("total deposit balance:", Number(vaultDeposited.lpAmount));
      console.log("total deposit balance Cap:", Number(vaultDeposited.capacityLimit));
      switch (v.vaultInfo.type) {
        case tulip.VaultType.Raydium:
          const raydiumVault = v.vaultInfo as tulip.RaydiumVaultInfo;
          console.log("Rayidum vault:");
          console.log(" . pool token A:");
          logTokenAccount(raydiumVault.coinTokenAccount);
          console.log(" . pool token B:");
          logTokenAccount(raydiumVault.pcTokenAccount);
          console.log(" . fee collector A:", raydiumVault.feeCollectorRewardATokenAccount.toBase58());
          console.log(" . fee collector B:", raydiumVault.feeCollectorRewardBTokenAccount.toBase58());
          break;
        case tulip.VaultType.Orca:
          const orcaVault = v.vaultInfo as tulip.OrcaVaultInfo;
          console.log("orca vault:");
          console.log(" . pool token A:");
          logTokenAccount(orcaVault.farmData.poolSwapTokenA);
          console.log(" . pool token B:");
          logTokenAccount(orcaVault.farmData.poolSwapTokenB);
          console.log(" . fee collector:", orcaVault.farmData.feeCollectorTokenAccount.toBase58());
          console.log(" . swap pool fee:", orcaVault.farmData.swapPoolFeeTokenAccount.toBase58());
          console.log(" . convert authority:", orcaVault.farmData.convertAuthority.toBase58());
          vaultInfoKeys = getOrcaVaultAddress(orcaVault, vaultInfoKeys);
          break;
        case tulip.VaultType.OrcaDD:
          const orcaDDVault = v.vaultInfo as tulip.OrcaDDVaultInfo;
          console.log("orca dd vault:");
          console.log(" . pool token A:");
          logTokenAccount(orcaDDVault.farmData.poolSwapTokenA);
          console.log(" . pool token B:");
          logTokenAccount(orcaDDVault.farmData.poolSwapTokenB);
          console.log(" . fee collector:", orcaDDVault.farmData.feeCollectorTokenAccount.toBase58());
          console.log(" . swap pool mint:", orcaDDVault.farmData.swapPoolMint.address.toBase58());
          console.log(" . swap pool fee:", orcaDDVault.farmData.swapPoolFeeTokenAccount.toBase58());
          console.log(" . convert authority:", orcaDDVault.farmData.convertAuthority.toBase58());
          console.log(" . pool token A(dd):");
          logTokenAccount(orcaDDVault.ddFarmData.poolSwapTokenA);
          console.log(" . pool token B(dd):");
          logTokenAccount(orcaDDVault.ddFarmData.poolSwapTokenB);
          console.log(" . fee collector(dd):", orcaDDVault.ddFarmData.feeCollectorTokenAccount.toBase58());
          console.log(" . swap pool mint:", orcaDDVault.farmData.swapPoolMint.address.toBase58());
          console.log(" . swap pool fee(dd):", orcaDDVault.ddFarmData.swapPoolFeeTokenAccount.toBase58());
          console.log(" . convert authority(dd):", orcaDDVault.ddFarmData.convertAuthority.toBase58());
          vaultInfoKeys = getOrcaVaultAddress(orcaDDVault, vaultInfoKeys);
          break;
      }
    });
    const vaultInfoSet = new Set<string>();
    console.log("\n\n===================");
    vaultInfoKeys.forEach((k) => vaultInfoSet.add(k.toBase58()));
    vaultInfoSet.forEach((k) => console.log(`"${k}",`));
    console.log("\n===================");
    console.log("# of vault info keys:", vaultInfoSet.size);
  });
  it(" Can get vault", async () => {
    const vault = (await tulip.infos.getVault!(
      connection,
      new PublicKey("51dmDpwuZNJF9ypw8Mt4Cyah4U1xdNRX8Dh7CEJVKU7n")
    )) as tulip.VaultInfo;
    console.log(`- Vault shareMint: ${vault.shareMint.toBase58()}`);
    console.log(`- Vault base PDA: ${vault.base.pda.toBase58()}`);
    console.log(`- Total Balance: ${Number(vault.base.totalDepositedBalance)}`);
    console.log(`- UnderlyingMint: ${vault.base.underlyingMint.toBase58()}`);
    console.log(`- Total Share: ${Number(vault.base.totalShares)}`);
    console.log(`- Total Balance Cap: ${Number(vault.base.totalDepositedBalanceCap)}`);
    console.log(
      `- Fees:\n  feeMultiplier: ${Number(vault.base.fees.feeMultiplier)}\n  controllerFee: ${Number(
        vault.base.fees.controllerFee
      )}\n  platformFee: ${Number(vault.base.fees.platformFee)}`
    );
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
    const vaultId = new PublicKey("7nbcWTUnvELLmLjJtMRrbg9qH9zabZ9VowJSfwB2j8y7");
    const depositorId = await tulip.infos.getDepositorId(vaultId, userKey);
    const depositor = (await tulip.infos.getDepositor(connection, depositorId)) as tulip.DepositorInfo;

    console.log(`Depositor Id: ${depositor.depositorId.toBase58()}`);
    console.log(` . Corresponding vault: ${depositor.vaultId.toBase58()}`);
    console.log(` . Deposited Balance: ${Number(depositor.depositedBalance)}`);
    console.log(` . last deposit time: ${Number(depositor.lastDepositTime)}`);
  });
});

function logTokenAccount(account: Account) {
  console.log(" .     address:", account.address.toBase58());
  console.log(" .     mint:", account.mint.toBase58());
  console.log(" .     amount:", account.amount);
}

function getOrcaVaultAddress(vault: tulip.VaultInfo, accountKeys: PublicKey[]): PublicKey[] {
  if (orcaV2VaultIds.find((k) => k === vault.vaultId.toBase58()))
    switch (vault.type) {
      case tulip.VaultType.Orca:
        const orcaVault = vault as tulip.OrcaVaultInfo;
        accountKeys.push(orcaVault.vaultId);
        accountKeys.push(orcaVault.base.pda);
        accountKeys.push(orcaVault.base.underlyingWithdrawQueue);
        accountKeys.push(orcaVault.farmData.vaultFarmTokenAccount);
        accountKeys.push(orcaVault.farmData.vaultRewardTokenAccount);
        accountKeys.push(orcaVault.farmData.vaultSwapTokenAccount);
        accountKeys.push(orcaVault.farmData.globalRewardTokenVault);
        accountKeys.push(orcaVault.farmData.globalBaseTokenVault);
        accountKeys.push(orcaVault.farmData.poolSwapTokenA.address);
        accountKeys.push(orcaVault.farmData.poolSwapTokenB.address);
        accountKeys.push(orcaVault.farmData.globalFarm);
        accountKeys.push(orcaVault.farmData.userFarmAddr);
        accountKeys.push(orcaVault.farmData.convertAuthority);
        accountKeys.push(orcaVault.farmData.poolSwapAccount);
        accountKeys.push(orcaVault.farmData.poolSwapAuthority);
        accountKeys.push(orcaVault.farmData.swapPoolMint.address);
        accountKeys.push(orcaVault.farmData.farmTokenMint);
        accountKeys.push(orcaVault.shareMint);
        accountKeys.push(orcaVault.farmData.swapPoolFeeTokenAccount);
        accountKeys.push(orcaVault.farmData.feeCollectorTokenAccount);
        break;
      case tulip.VaultType.OrcaDD:
        const orcaDDVault = vault as tulip.OrcaDDVaultInfo;

        accountKeys.push(orcaDDVault.vaultId);
        accountKeys.push(orcaDDVault.base.pda);
        accountKeys.push(orcaDDVault.base.underlyingWithdrawQueue);
        accountKeys.push(orcaDDVault.ddFarmData.vaultFarmTokenAccount);
        accountKeys.push(orcaDDVault.ddFarmData.vaultRewardTokenAccount);
        accountKeys.push(orcaDDVault.ddFarmData.vaultSwapTokenAccount);
        accountKeys.push(orcaDDVault.ddFarmData.globalRewardTokenVault);
        accountKeys.push(orcaDDVault.ddFarmData.globalBaseTokenVault);
        accountKeys.push(orcaDDVault.ddFarmData.poolSwapTokenA.address);
        accountKeys.push(orcaDDVault.ddFarmData.poolSwapTokenB.address);
        accountKeys.push(orcaDDVault.ddFarmData.globalFarm);
        accountKeys.push(orcaDDVault.ddFarmData.userFarmAddr);
        accountKeys.push(orcaDDVault.ddFarmData.convertAuthority);
        accountKeys.push(orcaDDVault.ddFarmData.poolSwapAccount);
        accountKeys.push(orcaDDVault.ddFarmData.poolSwapAuthority);
        accountKeys.push(orcaDDVault.ddFarmData.swapPoolMint.address);
        accountKeys.push(orcaDDVault.ddFarmData.farmTokenMint);
        accountKeys.push(orcaDDVault.shareMint);
        accountKeys.push(orcaDDVault.ddFarmData.swapPoolFeeTokenAccount);
        accountKeys.push(orcaDDVault.ddFarmData.feeCollectorTokenAccount);
        accountKeys.push(orcaDDVault.farmData.vaultFarmTokenAccount);
        accountKeys.push(orcaDDVault.farmData.vaultRewardTokenAccount);
        accountKeys.push(orcaDDVault.farmData.vaultSwapTokenAccount);
        accountKeys.push(orcaDDVault.farmData.globalRewardTokenVault);
        accountKeys.push(orcaDDVault.farmData.globalBaseTokenVault);
        accountKeys.push(orcaDDVault.farmData.poolSwapTokenA.address);
        accountKeys.push(orcaDDVault.farmData.poolSwapTokenB.address);
        accountKeys.push(orcaDDVault.farmData.globalFarm);
        accountKeys.push(orcaDDVault.farmData.userFarmAddr);
        accountKeys.push(orcaDDVault.farmData.convertAuthority);
        accountKeys.push(orcaDDVault.farmData.poolSwapAccount);
        accountKeys.push(orcaDDVault.farmData.poolSwapAuthority);
        accountKeys.push(orcaDDVault.farmData.swapPoolMint.address);
        accountKeys.push(orcaDDVault.farmData.farmTokenMint);
        accountKeys.push(orcaDDVault.farmData.swapPoolFeeTokenAccount);
        accountKeys.push(orcaDDVault.farmData.feeCollectorTokenAccount);
        break;
      default:
        break;
    }
  return accountKeys;
}

const orcaV2VaultIds = [
  "DUnC2MTUtcMhzr7JgUMF7dRyUoEiUTqv4aBy1gEi3gpt", // SAMO-USDC
  "CjwvvwuacJAJm8w54VcNDgpbnyde6k65mvdRpEFK2Dqm", // ATLAS-USDC
  "3q4BaXmKMJma9QWrodtp8V82iEPWTreVw57UcxsrTvgA", // SHDW-USDC
  "7nbcWTUnvELLmLjJtMRrbg9qH9zabZ9VowJSfwB2j8y7", // ORCA-USDC
  "82GUeHBorpNxwMiAdzjbrvV8CpcDyoV57fLLMmC8m4W5", // BASIS-USDC
  "J4cPE6XncW4pTCRferxiNpBEaHPy26HEoDnxBnxve3pw", // SHDW-SOL
  "EpcHToCXfMoW25Ng6yGzWwCFyW7hhPuetocFWGcBt13J", // CMFI-USDC
  "C4QPNt5wZrQS1hywhTbw86rtsoxCM4QvSaYuhn8RN1ea", // stSOL-wUST
];
