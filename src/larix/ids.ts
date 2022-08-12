import { PublicKey } from "@solana/web3.js";

export const LARIX_PROGRAM_ID = new PublicKey("7Zb1bGi32pfsrBkzWdqd4dFhUXwp5Nybr1zuaEwN34hy");

export const MARKET_AUTHORITY = new PublicKey("BxnUi6jyYbtEEgkBq4bPLKzDpSfWVAzgyf3TF2jfC1my");

export const MARKET_OWNER = new PublicKey("5pHk2TmnqQzRF9L6egy5FfiyBgS7G9cMZ5RFaJAvghzw");
export const MARKET_PDA = new PublicKey("BxnUi6jyYbtEEgkBq4bPLKzDpSfWVAzgyf3TF2jfC1my");
export const LARIX_MINT = new PublicKey("Lrxqnh6ZHKbGy3dcrCED43nsoLkM1LTzU2jRfWe8qUC");

export const MINE_SUPPLY = new PublicKey("HCUZ8TiRfFcXAwCMEeTrirfrGCB1jB2KAocTi1jbfHrd");

// Market Ids
export const LARIX_MARKET_ID_MAIN_POOL = new PublicKey("5geyZJdffDBNoMqEbogbPvdgH9ue7NREobtW8M3C1qfe");
export const LARIX_MARKET_ID_BONFIDA_POOL = new PublicKey("5enDUZdptakV39Sra9QQYBstJbLVZHHqT74CgeL2fMqV");
export const LARIX_MARKET_ID_XSOL_POOL = new PublicKey("Cc5BGXYUFRpg9sy16WpwYaB6y82Yp6obhNbA55pCC4ZS");
export const LARIX_MARKET_ID_LARIX_POOL = new PublicKey("5abm8NyiDikUaG262iEr76UE8X7M9UsmqgZW2ouNLNDZ");
export const LARIX_MARKET_ID_STEP_POOL = new PublicKey("3kKjWexdb97MvYVrUmPRYUUaLgzPdPcThAgFnLtXo8Uw");
export const LARIX_MARKET_ID_STEPN_POOL = new PublicKey("DRcWrCAKxSoew1YPjNPs8XduiPxS9FCMimsC7VkQwKfj");

export const LARIX_LENDING_MARKET_ID_ALL = [
  LARIX_MARKET_ID_MAIN_POOL,
  LARIX_MARKET_ID_BONFIDA_POOL,
  LARIX_MARKET_ID_LARIX_POOL,
  LARIX_MARKET_ID_STEPN_POOL,
  LARIX_MARKET_ID_STEP_POOL,
  LARIX_MARKET_ID_XSOL_POOL,
];

export const LARIX_MAIN_POOL_MINER_SEED = "Dappio";
export const LARIX_MAIN_POOL_OBLIGATION_SEED = "Dappio-l-main-ob";