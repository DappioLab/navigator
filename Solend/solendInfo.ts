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

  export const MININGREVERSES:any = [];

  export function MININGMULTIPLIER(reserve:PublicKey)  {
    switch(reserve.toString()){
      default:
        return new BN(0);
    }
}
export const SLNDPERYEAR = new BN(10E6);

export const SLND_PRICE_ORACLE = new PublicKey("7QKyBR3zLRhoEH5UMjcG8emDD2J2CCDmkxv3qsa2Mqif");
