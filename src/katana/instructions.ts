import { TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import BN from "bn.js";
import { struct, u64, u8 } from "@project-serum/borsh";
import { getDepositorId, VaultInfoWrapper } from "./infos";

// NOTICE: This file will be removed!

export async function createUserVaultIx(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let userVault = await getDepositorId(
    wallet,
    vault.vaultInfo.vaultId,
    programId
  );
  const dataLayout = struct([u8("bump")]);
  let data = Buffer.alloc(9);
  let datahex = userVault[1].toString(16);
  // TODO: derive discriminator from hash
  let datastring = "924464453f2eb6c7".concat(datahex);
  data = Buffer.from(datastring, "hex");

  let keys = [
    { pubkey: userVault[0], isSigner: false, isWritable: true },
    { pubkey: vault.vaultInfo.vaultId, isSigner: false, isWritable: true },
    { pubkey: wallet, isSigner: false, isWritable: false },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export async function depositIx(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  tokenAccount: PublicKey,
  amount: BN, // NOTICE: Need to be BN.Endianness?
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let userVault = await getDepositorId(
    wallet,
    vault.vaultInfo.vaultId,
    programId
  );
  const dataLayout = struct([u64("amount")]);
  let data = Buffer.alloc(dataLayout.span + 8);
  dataLayout.encode(
    {
      amount: new BN(amount),
    },
    data
  );
  let datahex = data.toString("hex");
  let datastring = "f223c68952e1f2b6".concat(datahex);
  data = Buffer.from(datastring, "hex");
  let keys = [
    { pubkey: vault.vaultInfo.vaultId, isSigner: false, isWritable: true },
    {
      pubkey: await vault.getPricePerPage(),
      isSigner: false,
      isWritable: false,
    },
    { pubkey: userVault[0], isSigner: false, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.underlyingTokenVault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault.vaultInfo.underlyingTokenMint,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export async function claimShareIx(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  tokenAccount: PublicKey,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let userVault = await getDepositorId(
    wallet,
    vault.vaultInfo.vaultId,
    programId
  );
  let data = Buffer.alloc(8);
  // TODO: derive discriminator from hash
  let datastring = "82831ded86146ef5";
  data = Buffer.from(datastring, "hex");
  let keys = [
    { pubkey: vault.vaultInfo.vaultId, isSigner: false, isWritable: true },
    {
      pubkey: await vault.getPricePerPage(),
      isSigner: false,
      isWritable: false,
    },
    { pubkey: userVault[0], isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.underlyingTokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault.vaultInfo.derivativeTokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault.vaultInfo.derivativeTokenVault,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.vaultAuthority,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export async function initiateWithdrawIx(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  tokenAccount: PublicKey,
  amount: BN,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let userVault = await getDepositorId(
    wallet,
    vault.vaultInfo.vaultId,
    programId
  );
  const dataLayout = struct([u64("amount")]);
  let data = Buffer.alloc(dataLayout.span + 8);
  dataLayout.encode(
    {
      amount: new BN(amount),
    },
    data
  );
  let datahex = data.toString("hex");
  // TODO: derive discriminator from hash
  let datastring = "9cac8cf5b6faefa0".concat(datahex);
  data = Buffer.from(datastring, "hex");
  let keys = [
    { pubkey: vault.vaultInfo.vaultId, isSigner: false, isWritable: true },
    { pubkey: userVault[0], isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.underlyingTokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault.vaultInfo.derivativeTokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault.vaultInfo.derivativeTokenVault,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.vaultAuthority,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export async function completeWithdrawIx(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  tokenAccount: PublicKey,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let userVault = await getDepositorId(
    wallet,
    vault.vaultInfo.vaultId,
    programId
  );
  let data = Buffer.alloc(8);
  // TODO: derive discriminator from hash
  let datastring = "ac818d115ffdfb62";
  data = Buffer.from(datastring, "hex");
  let keys = [
    { pubkey: vault.vaultInfo.vaultId, isSigner: false, isWritable: true },
    {
      pubkey: await vault.getPricePerPage(),
      isSigner: false,
      isWritable: false,
    },
    { pubkey: userVault[0], isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.underlyingTokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault.vaultInfo.derivativeTokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault.vaultInfo.underlyingTokenVault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault.vaultInfo.derivativeTokenVault,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.vaultAuthority,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export async function instantWithdrawIx(
  vault: VaultInfoWrapper,
  wallet: PublicKey,
  tokenAccount: PublicKey,
  amount: BN,
  programId: PublicKey // KATANA_COVER_PROGRAM_ID or KATANA_PUT_PROGRAM_ID
) {
  let userVault = await getDepositorId(
    wallet,
    vault.vaultInfo.vaultId,
    programId
  );
  const dataLayout = struct([u64("amount")]);
  let data = Buffer.alloc(dataLayout.span + 8);
  dataLayout.encode(
    {
      amount: new BN(amount),
    },
    data
  );
  let datahex = data.toString("hex");
  // TODO: derive discriminator from hash
  let datastring = "ab3191b0306570a2".concat(datahex);
  data = Buffer.from(datastring, "hex");
  let keys = [
    { pubkey: vault.vaultInfo.vaultId, isSigner: false, isWritable: true },
    { pubkey: userVault[0], isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.underlyingTokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault.vaultInfo.underlyingTokenVault,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    {
      pubkey: vault.vaultInfo.vaultAuthority,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
