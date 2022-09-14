import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { TokenAccount } from ".";
import { publicKey, struct, u64, u32 } from "@project-serum/borsh";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";

export function getBigNumber(num: any) {
  return num === undefined || num === null ? 0 : parseFloat(num.toString());
}

export class TokenAmount {
  public wei: BigNumber;

  public decimals: number;
  public _decimals: BigNumber;

  constructor(wei: number | string | BigNumber, decimals: number = 0, isWei = true) {
    this.decimals = decimals;
    this._decimals = new BigNumber(10).exponentiatedBy(decimals);

    if (isWei) {
      this.wei = new BigNumber(wei);
    } else {
      this.wei = new BigNumber(wei).multipliedBy(this._decimals);
    }
  }

  toEther() {
    return this.wei.dividedBy(this._decimals);
  }

  toWei() {
    return this.wei;
  }

  format() {
    const vaule = this.wei.dividedBy(this._decimals);
    return vaule.toFormat(vaule.isInteger() ? 0 : this.decimals);
  }

  fixed() {
    return this.wei.dividedBy(this._decimals).toFixed(this.decimals);
  }

  isNullOrZero() {
    return this.wei.isNaN() || this.wei.isZero();
  }
  // + plus
  // - minus
  // × multipliedBy
  // ÷ dividedBy
}

export async function getTokenAccount(connection: Connection, tokenAccountPubkey: PublicKey) {
  let accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
  return parseTokenAccount(accountInfo?.data, tokenAccountPubkey);
}

export function parseTokenAccount(data: any, infoPubkey: PublicKey): TokenAccount {
  let tokenLayout = struct([publicKey("mint"), publicKey("owner"), u64("amount")]);
  let tokenAccountInfo = tokenLayout.decode(data);
  let { mint, owner, amount } = tokenAccountInfo;

  return {
    key: infoPubkey,
    mint,
    owner,
    amount,
  };
}

export async function getAllTokenAccount(wallet: PublicKey, connection: Connection): Promise<TokenAccount[]> {
  const tokenAccountInfos = (
    await connection.getTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;
  const tokenAccounts = [];
  for (const info of tokenAccountInfos) {
    const tokenAccount = parseTokenAccount(info.account.data, info.pubkey);
    tokenAccounts.push(tokenAccount);
  }
  return tokenAccounts;
}
