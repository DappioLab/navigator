import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token-v2";
import * as sha256 from "js-sha256";
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  TransferParams,
  Connection,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  publicKey,
  struct,
  u64,
  u128,
  u8,
  bool,
  u16,
  u32,
} from "@project-serum/borsh";
import request from "graphql-request";

export async function wrapNative(
  amount: BN,
  walletPublicKey: PublicKey,
  connection?: Connection,
  createAta?: boolean
) {
  let tx = new Transaction();
  let destinationAta = await findAssociatedTokenAddress(
    walletPublicKey,
    NATIVE_MINT
  );
  let createATA = await createATAWithoutCheckIx(walletPublicKey, NATIVE_MINT);
  tx.add(createATA);
  let transferPram = {
    fromPubkey: walletPublicKey,
    lamports: amount.toNumber(),
    toPubkey: destinationAta,
  };
  let transferLamportIx = SystemProgram.transfer(transferPram);
  tx.add(transferLamportIx);
  let key = [{ pubkey: destinationAta, isSigner: false, isWritable: true }];
  let dataString = "11";
  let data = Buffer.from(dataString, "hex");
  let syncNativeIx = new TransactionInstruction({
    keys: key,
    programId: TOKEN_PROGRAM_ID,
    data: data,
  });
  tx.add(syncNativeIx);
  return tx;
}
export async function findAssociatedTokenAddress(
  walletAddress: PublicKey,
  tokenMintAddress: PublicKey
): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0];
}
export async function checkTokenAccount(
  publickey: PublicKey,
  connection: Connection
) {
  let accountInfo = await connection.getAccountInfo(publickey);
  if (accountInfo?.owner.equals(TOKEN_PROGRAM_ID)) {
    return true;
  } else return false;
}

export async function getTokenAccountAmount(
  connection: Connection,
  tokenAccountPubkey: PublicKey
) {
  let tokenLayout = struct([
    publicKey("mint"),
    publicKey("owner"),
    u64("amount"),
  ]);
  let accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
  let tokenAccountInfo = tokenLayout.decode(accountInfo?.data);
  return new BN(tokenAccountInfo.amount);
}

export async function getAllTokenAccount(
  wallet: PublicKey,
  connection: Connection
): Promise<TokenAccount[]> {
  const tokenAccountInfos = await (
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

export async function getTokenSupply(
  connection: Connection,
  tokenMintPubkey: PublicKey
) {
  let mintLayout = struct([
    u32("option"),
    publicKey("authority"),
    u64("amount"),
  ]);
  let accountInfo = await connection.getAccountInfo(tokenMintPubkey);
  let mintAccountInfo = mintLayout.decode(accountInfo?.data);
  return new BN(mintAccountInfo.amount);
}

export async function createATAWithoutCheckIx(
  wallet: PublicKey,
  mint: PublicKey,
  payer?: PublicKey
) {
  if (payer == undefined) {
    payer = wallet as PublicKey;
  }
  payer = payer as PublicKey;
  let ATA = await findAssociatedTokenAddress(wallet, mint);
  const programId = new PublicKey(
    "9tiP8yZcekzfGzSBmp7n9LaDHRjxP2w7wJj8tpPJtfG"
  );
  let keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ATA, isSigner: false, isWritable: true },
    { pubkey: wallet, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    programId: programId,
  });
}

export async function getTokenAccount(
  connection: Connection,
  tokenAccountPubkey: PublicKey
) {
  let accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
  return parseTokenAccount(accountInfo?.data, tokenAccountPubkey);
}

export function parseTokenAccount(data: any, infoPubkey: PublicKey) {
  let tokenLayout = struct([
    publicKey("mint"),
    publicKey("owner"),
    u64("amount"),
  ]);
  let tokenAccountInfo = tokenLayout.decode(data);
  let { mint, owner, amount } = tokenAccountInfo;
  return new TokenAccount(infoPubkey, mint, owner, amount);
}
export class TokenAccount {
  infoPubkey: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: BN;
  constructor(
    infoPubkey: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    amount: BN
  ) {
    this.infoPubkey = infoPubkey;
    this.mint = mint;
    this.owner = owner;
    this.amount = new BN(amount);
  }
}

export function getAnchorInsByIdl(name: string): Buffer {
  const SIGHASH_GLOBAL_NAMESPACE = "global";
  const preimage = `${SIGHASH_GLOBAL_NAMESPACE}:${name}`;
  const hash = sha256.sha256.digest(preimage);
  const data = Buffer.from(hash).slice(0, 8);
  return data;
}

export async function signAndSendAll(
  allTx: Transaction,
  connection: Connection,
  wallet: Keypair[],
  printRaw?: boolean
): Promise<string> {
  const walletPublicKey = wallet[0].publicKey;
  const tx = new Transaction();
  tx.add(allTx);
  const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = walletPublicKey;
  if (printRaw) {
    console.log(tx.serializeMessage().toString("base64"));
  }
  const result = sendAndConfirmTransaction(connection, tx, wallet);
  return result;
}

// Saber curve stable swap utils

export const N_COINS = new BN(2); // n
export const ZERO = new BN(0);
export const ONE = new BN(1);

// maximum iterations of newton's method approximation
const MAX_ITERS = 20;

/**
 * Compute the StableSwap invariant
 * @param ampFactor Amplification coefficient (A)
 * @param amountA Swap balance of token A
 * @param amountB Swap balance of token B
 * Reference: https://github.com/curvefi/curve-contract/blob/7116b4a261580813ef057887c5009e22473ddb7d/tests/simulation.py#L31
 */
export const computeD = (ampFactor: BN, amountA: BN, amountB: BN): BN => {
  const Ann = ampFactor.mul(N_COINS); // A*n^n
  const S = amountA.add(amountB); // sum(x_i), a.k.a S
  if (S.eq(ZERO)) {
    return ZERO;
  }

  let dPrev = ZERO;
  let d = S;

  for (let i = 0; d.sub(dPrev).abs().gt(ONE) && i < MAX_ITERS; i++) {
    dPrev = d;
    let dP = d;
    dP = dP.mul(d).div(amountA.mul(N_COINS));
    dP = dP.mul(d).div(amountB.mul(N_COINS));

    const dNumerator = d.mul(Ann.mul(S).add(dP.mul(N_COINS)));
    const dDenominator = d.mul(Ann.sub(ONE)).add(dP.mul(N_COINS.add(ONE)));
    d = dNumerator.div(dDenominator);
  }

  return d;
};

/**
 * Compute Y amount in respect to X on the StableSwap curve
 * @param ampFactor Amplification coefficient (A)
 * @param x The quantity of underlying asset
 * @param d StableSwap invariant
 * Reference: https://github.com/curvefi/curve-contract/blob/7116b4a261580813ef057887c5009e22473ddb7d/tests/simulation.py#L55
 */
export const computeY = (ampFactor: BN, x: BN, d: BN): BN => {
  const Ann = ampFactor.mul(N_COINS); // A*n^n
  // sum' = prod' = x
  const b = x.add(d.div(Ann)).sub(d); // b = sum' - (A*n**n - 1) * D / (A * n**n)
  const c = // c =  D ** (n + 1) / (n ** (2 * n) * prod' * A)
    d
      .mul(d)
      .mul(d)
      .div(N_COINS.mul(N_COINS.mul(x.mul(Ann))));

  let yPrev = ZERO;
  let y = d;
  for (let i = 0; i < MAX_ITERS && y.sub(yPrev).abs().gt(ONE); i++) {
    yPrev = y;
    y = y.mul(y).add(c).div(N_COINS.mul(y).add(b));
  }

  return y;
};

export const normalizedTradeFee = (trade: BN, n_coins: BN, amount: BN): BN => {
  const adjustedTradeFee = n_coins.div(n_coins.sub(ONE).mul(new BN(4)));
  return amount.div(ONE).mul(trade).mul(adjustedTradeFee);
};

export const getTokenList = async () => {
  const query = `
  {
    TokenInfos {
      chainId
      price
      mint
      name
      decimals
      symbol
      logoURI
    }
  }
  `;
  let serviceEndpoint = "https://services-v2.dappio.xyz/graphql";
  let data = await request(serviceEndpoint, query);
  return data.TokenInfos;
};
