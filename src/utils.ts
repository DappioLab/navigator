import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Connection,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  sendAndConfirmTransaction,
  AccountInfo,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token-v2";
import { publicKey, struct, u64, u32 } from "@project-serum/borsh";
import BN from "bn.js";
import request from "graphql-request";
import { IServicesTokenInfo, PageConfig } from "./types";

export async function wrapNative(amount: BN, walletPublicKey: PublicKey, connection?: Connection, createAta?: boolean) {
  let tx = new Transaction();
  let destinationAta = await getAssociatedTokenAddress(NATIVE_MINT, walletPublicKey);
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

export async function checkTokenAccount(publickey: PublicKey, connection: Connection) {
  let accountInfo = await connection.getAccountInfo(publickey);
  if (accountInfo?.owner.equals(TOKEN_PROGRAM_ID)) {
    return true;
  } else return false;
}

export async function getTokenAccountAmount(connection: Connection, tokenAccountPubkey: PublicKey) {
  let tokenLayout = struct([publicKey("mint"), publicKey("owner"), u64("amount")]);
  let accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
  let tokenAccountInfo = tokenLayout.decode(accountInfo?.data);
  return new BN(tokenAccountInfo.amount);
}

export async function getTokenSupply(connection: Connection, tokenMintPubkey: PublicKey) {
  let mintLayout = struct([u32("option"), publicKey("authority"), u64("amount")]);
  let accountInfo = await connection.getAccountInfo(tokenMintPubkey);
  let mintAccountInfo = mintLayout.decode(accountInfo?.data);
  return new BN(mintAccountInfo.amount);
}

export async function createATAWithoutCheckIx(wallet: PublicKey, mint: PublicKey, payer?: PublicKey) {
  if (payer == undefined) {
    payer = wallet as PublicKey;
  }
  payer = payer as PublicKey;
  let ATA = await getAssociatedTokenAddress(mint, wallet);
  const programId = new PublicKey("9tiP8yZcekzfGzSBmp7n9LaDHRjxP2w7wJj8tpPJtfG");
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
  let tokenInfos: IServicesTokenInfo[] = data.TokenInfos;
  return tokenInfos;
};

// reference from @jup-ag/core
export async function getMultipleAccounts(
  connection: Connection,
  publicKeys: PublicKey[],
  batchChunkSize = 1000,
  maxAccountsChunkSize = 100
): Promise<
  {
    pubkey: PublicKey;
    account: AccountInfo<Buffer> | null;
  }[]
> {
  const chunks = (array: PublicKey[], size: number) => {
    return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
      array.slice(index * size, (index + 1) * size)
    );
  };

  interface RPCResult {
    jsonrpc: string;
    result: {
      context: {
        apiVersion: string;
        slot: number;
      };
      value: AccountInfo<string>[];
    };
    id: string;
  }

  const results = (
    await Promise.all(
      chunks(publicKeys, batchChunkSize).map(async (batchPubkeys) => {
        const batch = chunks(batchPubkeys, maxAccountsChunkSize).map((pubkeys) => ({
          methodName: "getMultipleAccounts",
          args: connection._buildArgs([pubkeys], connection.commitment, "base64"),
        }));
        return (
          connection
            // @ts-ignore
            ._rpcBatchRequest(batch)
            .then((batchResults: RPCResult[]) => {
              const accounts = batchResults.reduce((acc: AccountInfo<string>[], res) => {
                acc.push(...res.result.value);
                return acc;
              }, []);

              return accounts.map((item) => {
                let account: AccountInfo<Buffer> | null = null;
                if (item) {
                  account = {
                    executable: item.executable,
                    owner: new PublicKey(item.owner),
                    lamports: item.lamports,
                    data: Buffer.from(item.data[0], item.data[1] as BufferEncoding),
                    rentEpoch: item.rentEpoch,
                  };
                }
                return account;
              });
            })
            .catch((e: Error) => {
              return batchPubkeys.map(() => null);
            })
        );
      })
    )
  ).flat();

  return results.map((res, index) => {
    return {
      pubkey: publicKeys[index],
      account: res,
    };
  });
}

export function paginate(
  accounts: {
    pubkey: PublicKey;
    account: AccountInfo<Buffer> | null;
  }[],
  page?: PageConfig
) {
  accounts.sort((a, b) => a.pubkey.toBase58().localeCompare(b.pubkey.toBase58()));
  if (page) {
    let batchSize = accounts.length / page.pageSize;
    let start = page.pageIndex * batchSize;
    let end = start + batchSize;
    return accounts.slice(start, end);
  }
  return accounts;
}
