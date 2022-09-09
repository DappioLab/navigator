import { PublicKey, Connection } from "@solana/web3.js";
import * as nftFinance from "../src/nftFinance";
import { getTokenList } from "../src/utils";

describe("NFT Finance", () => {
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
  const connection = new Connection("https://rpc-mainnet-fork.epochs.studio", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180 * 1000,
    wsEndpoint: "wss://rpc-mainnet-fork.epochs.studio/ws",
  });
  // const connection = new Connection("https://ssc-dao.genesysgo.net", {
  //   commitment: "confirmed",
  //   confirmTransactionInitialTimeout: 180 * 1000,
  // });

  const nftMint1 = new PublicKey("CVEJtggYjsAFNHBBUb4dJYAHmxqzPtXYNLR3ZNhTi8Zk"); // Dappie Gang #1170
  const nftMint2 = new PublicKey("bTPywNyPj3ckpmANXFE5GVDvRvBNH4Ehmu89Hec16FH"); // Diamond Baepe #1945
  const poolId = new PublicKey("uZVnFrQnA3EXpoohLjioCUQ85B8isrfNCfCzMqNC4w1");
  const userKey = new PublicKey("G9on1ddvCc8xqfk2zMceky2GeSfVfhU8JqGHxNEWB5u4");

  it("Get rarities", async () => {
    const rarityInfos = await nftFinance.infos.getAllRarities(connection);
    console.log(rarityInfos);
  });

  it("Get pools", async () => {
    const poolInfos = await nftFinance.infos.getAllPools(connection);
    console.log(poolInfos);
  });

  it("Get farms", async () => {
    const farmInfos = await nftFinance.infos.getAllFarms(connection);
    console.log(farmInfos);
  });

  it("Get lockers", async () => {
    const lockerInfos = await nftFinance.infos.getAllNFTLockers(connection);
    console.log(lockerInfos);
  });

  it("Get farmers", async () => {
    const farmerInfos = await nftFinance.infos.getAllNFTFarmers(connection);
    console.log(farmerInfos);
  });

  it("Get FullInfos by mints", async () => {
    const fullInfos = await nftFinance.getFullInfosByMints(connection, [nftMint1, nftMint2]);
    console.log(fullInfos);
  });

  it("Get NFTU unclaimed amount", async () => {
    const unclaimed = await nftFinance.getNFTUUnclaimedAmount(connection, userKey, "DappieGang");
    console.log(unclaimed);
  });

  it("Get staked amount", async () => {
    const stakedAmount = await nftFinance.getStakedAmount(connection, "DappieGang");
    console.log(stakedAmount);
  });

  it("Get lockers and farmers", async () => {
    const lockersAndFarmers = await nftFinance.getLockersAndFarmers(connection, userKey);
    console.log(lockersAndFarmers);
  });

  it("Get FullInfo by poolId", async () => {
    const fullInfo = await nftFinance.getFullInfoByPoolId(connection, poolId);
    console.log(fullInfo);
  });
});
