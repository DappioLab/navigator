import {
  NATIVE_MINT,
  createCloseAccountInstruction,
} from "@solana/spl-token-v2";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import * as ins from "./instructions";
import { checkUserVaultCreated, VaultInfo, VaultInfoWrapper } from "./infos";
import {
  createATAWithoutCheckIx,
  findAssociatedTokenAddress,
  wrapNative,
} from "../utils";

export async function deposit(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  amount: BN,
  connection: Connection,
  programId: PublicKey, // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
  underlyingTokenAccount?: PublicKey
) {
  let tx: Transaction = new Transaction();
  let cleanupTx = new Transaction();
  if (underlyingTokenAccount) {
    underlyingTokenAccount = underlyingTokenAccount as PublicKey;
  } else {
    underlyingTokenAccount = await findAssociatedTokenAddress(
      wallet,
      vault.vaultInfo.underlyingTokenMint
    );
  }
  if (vault.vaultInfo.underlyingTokenMint.equals(NATIVE_MINT)) {
    tx.add(await wrapNative(amount, wallet, connection, true));
    cleanupTx.add(
      createCloseAccountInstruction(underlyingTokenAccount, wallet, wallet, [])
    );
  }
  tx.add(
    await createATAWithoutCheckIx(wallet, vault.vaultInfo.derivativeTokenMint)
  );
  if (
    !(await checkUserVaultCreated(
      wallet,
      vault.vaultInfo.infoPubkey,
      connection,
      programId
    ))
  ) {
    tx.add(await ins.createUserVaultIx(vault, wallet, programId));
  }
  tx.add(
    await ins.depositIx(
      vault,
      wallet,
      underlyingTokenAccount,
      amount,
      programId
    )
  );

  tx.add(cleanupTx);
  return tx;
}
export async function instantWithdraw(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  amount: BN,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let tx: Transaction = new Transaction();
  let cleanupTx = new Transaction();
  tx.add(
    await createATAWithoutCheckIx(wallet, vault.vaultInfo.underlyingTokenMint)
  );
  let underlyingTokenAccount = await findAssociatedTokenAddress(
    wallet,
    vault.vaultInfo.underlyingTokenMint
  );
  tx.add(
    await ins.instantWithdrawIx(
      vault,
      wallet,
      underlyingTokenAccount,
      amount,
      programId
    )
  );
  if (vault.vaultInfo.underlyingTokenMint.equals(NATIVE_MINT)) {
    cleanupTx.add(
      createCloseAccountInstruction(underlyingTokenAccount, wallet, wallet, [])
    );
  }
  tx.add(cleanupTx);
  return tx;
}

export async function initiateWithdraw(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  amount: BN,
  programId: PublicKey, // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
  shareTokenAccount?: PublicKey
) {
  let tx: Transaction = new Transaction();
  if (shareTokenAccount) {
    shareTokenAccount = shareTokenAccount as PublicKey;
  } else {
    shareTokenAccount = await findAssociatedTokenAddress(
      wallet,
      vault.vaultInfo.derivativeTokenMint
    );
  }
  tx.add(
    await ins.initiateWithdrawIx(
      vault,
      wallet,
      shareTokenAccount,
      amount,
      programId
    )
  );
  return tx;
}

export async function completeWithdraw(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let tx: Transaction = new Transaction();
  let cleanupTx = new Transaction();
  tx.add(
    await createATAWithoutCheckIx(wallet, vault.vaultInfo.underlyingTokenMint)
  );
  let underlyingTokenAccount = await findAssociatedTokenAddress(
    wallet,
    vault.vaultInfo.underlyingTokenMint
  );
  tx.add(
    await ins.completeWithdrawIx(
      vault,
      wallet,
      underlyingTokenAccount,
      programId
    )
  );
  if (vault.vaultInfo.underlyingTokenMint.equals(NATIVE_MINT)) {
    cleanupTx.add(
      createCloseAccountInstruction(underlyingTokenAccount, wallet, wallet, [])
    );
  }
  tx.add(cleanupTx);
  return tx;
}

export async function claimShares(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let tx: Transaction = new Transaction();
  tx.add(
    await createATAWithoutCheckIx(wallet, vault.vaultInfo.derivativeTokenMint)
  );
  let shareTokenAccount = await findAssociatedTokenAddress(
    wallet,
    vault.vaultInfo.derivativeTokenMint
  );
  tx.add(await ins.claimShareIx(vault, wallet, shareTokenAccount, programId));
  return tx;
}
