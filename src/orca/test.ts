import { Connection } from "@solana/web3.js";
import { getAllPools } from "./infos";

const connection = new Connection("https://api.mainnet-beta.solana.com", {
  commitment: "processed",
});

(async () => {
  let data = await getAllPools(connection);
  data.map((item, index) => {
    console.log(item.apr, item.poolId.toBase58(), "/");
  });
})();
