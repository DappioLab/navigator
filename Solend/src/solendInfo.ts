import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
export const SOLENDPROGRAMID = new PublicKey(
    "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo",
  );
  
export  const SOLENDLENDINGMARKETID = new PublicKey(
    "4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY",
  );
  
export  const MARKETAUTHORITY = new PublicKey(
    "GDmSxpPzLkfxxr6dHLNRnCoYVGzvgc41tozkrr4pHTjB",
  );
  
  export const MARKETOWNER = new PublicKey(
    "5pHk2TmnqQzRF9L6egy5FfiyBgS7G9cMZ5RFaJAvghzw",
  );
  export const MARKETPDA = new PublicKey(
      "DdZR6zRFiUt4S5mg7AV1uKB2z1f1WzcNYCaTEEWPAuby"
      );
  export const RESERVELAYOUTSPAN = 619;

  export const MININGREVERSES = ["8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36","BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw","3PArRsZQ6SLkr1WERZWyC6AqsajtALMq4C66ZMYz4dKQ","GYzjMCXTDue12eUGKKWAqtF5jcBYNmewr6Db6LaguEaX","8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE"];

  export function MININGMULTIPLIER(reserve:PublicKey)  {
    switch(reserve.toString()){
      case "8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36":
        return (new BN(3)).muln(10E6).divn(22);
      case "BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw":
        return (new BN(3)).muln(10E6).divn(22);
      case "3PArRsZQ6SLkr1WERZWyC6AqsajtALMq4C66ZMYz4dKQ":
        return (new BN(2)).muln(10E6).divn(22);
      case "GYzjMCXTDue12eUGKKWAqtF5jcBYNmewr6Db6LaguEaX":
        return (new BN(2)).muln(10E6).divn(22);
      case "8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE":
        return (new BN(1)).muln(10E6).divn(22);
      default:
        return new BN(0);
    }
}
export const SLNDPERYEAR = new BN(10E6);