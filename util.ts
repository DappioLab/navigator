import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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
  sendAndConfirmTransaction
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
export async function wrapNative(
  amount: BN,
  walletPublicKey: PublicKey,
  connection: Connection,
  createAta: boolean,
) {
  let tx = new Transaction();
  let destinationAta = await findAssociatedTokenAddress(
    walletPublicKey,
    NATIVE_MINT,
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
  tokenMintAddress: PublicKey,
): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )
  )[0];
}
export async function checkTokenAccount(
  publickey: PublicKey,
  connection: Connection,
) {
  let accountInfo = await connection.getAccountInfo(publickey);
  if (accountInfo?.owner.toString() == TOKEN_PROGRAM_ID.toString()) {
    return true;
  } else return false;
}

export async function getTokenAccountAmount(
  connection: Connection,
  tokenAccountPubkey: PublicKey,
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

export async function getTokenSupply(
  connection: Connection,
  tokenMintPubkey: PublicKey,
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
  payer?: PublicKey,
) {
  if (payer == undefined) {
    payer = wallet as PublicKey;
  }
  payer = payer as PublicKey;
  let ATA = await findAssociatedTokenAddress(wallet, mint);
  const programId = new PublicKey(
    "9tiP8yZcekzfGzSBmp7n9LaDHRjxP2w7wJj8tpPJtfG",
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
  tokenAccountPubkey: PublicKey,
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
    amount: BN,
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
): Promise<string> {
  const walletPublicKey = wallet[0].publicKey;
  const tx = new Transaction();
  tx.add(allTx);
  const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = walletPublicKey;
  const result = sendAndConfirmTransaction(connection, tx, wallet);
  return result;
}
