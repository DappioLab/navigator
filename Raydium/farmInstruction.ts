import { PublicKey, TransactionInstruction, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js"
import { publicKey, struct, u64, u128, u8, bool, u16, i64 } from "@project-serum/borsh";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
export function depositInstruction(
    programId: PublicKey,
    // staking pool
    poolId: PublicKey,
    poolAuthority: PublicKey,
    // user
    userInfoAccount: PublicKey,
    userOwner: PublicKey,
    userLpTokenAccount: PublicKey,
    poolLpTokenAccount: PublicKey,
    userRewardTokenAccount: PublicKey,
    poolRewardTokenAccount: PublicKey,
    // tokenProgramId: PublicKey,
    amount: BN
): TransactionInstruction {
    const dataLayout = struct([u8('instruction'), u64('amount')])

    const keys = [
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: userInfoAccount, isSigner: false, isWritable: true },
        { pubkey: userOwner, isSigner: true, isWritable: false },
        { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ]

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
        {
            instruction: 1,
            amount
        },
        data
    )

    return new TransactionInstruction({
        keys,
        programId,
        data
    })
}
export function depositInstructionV4(
    programId: PublicKey,
    // staking pool
    poolId: PublicKey,
    poolAuthority: PublicKey,
    // user
    userInfoAccount: PublicKey,
    userOwner: PublicKey,
    userLpTokenAccount: PublicKey,
    poolLpTokenAccount: PublicKey,
    userRewardTokenAccount: PublicKey,
    poolRewardTokenAccount: PublicKey,
    userRewardTokenAccountB: PublicKey,
    poolRewardTokenAccountB: PublicKey,
    // tokenProgramId: PublicKey,
    amount: BN
): TransactionInstruction {
    const dataLayout = struct([u8('instruction'), u64('amount')])

    const keys = [
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: userInfoAccount, isSigner: false, isWritable: true },
        { pubkey: userOwner, isSigner: true, isWritable: false },
        { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: userRewardTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: poolRewardTokenAccountB, isSigner: false, isWritable: true }
    ]

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
        {
            instruction: 1,
            amount
        },
        data
    )

    return new TransactionInstruction({
        keys,
        programId,
        data
    })
}
export function withdrawInstruction(
    programId: PublicKey,
    // staking pool
    poolId: PublicKey,
    poolAuthority: PublicKey,
    // user
    userInfoAccount: PublicKey,
    userOwner: PublicKey,
    userLpTokenAccount: PublicKey,
    poolLpTokenAccount: PublicKey,
    userRewardTokenAccount: PublicKey,
    poolRewardTokenAccount: PublicKey,
    // tokenProgramId: PublicKey,
    amount: BN
): TransactionInstruction {
    const dataLayout = struct([u8('instruction'), u64('amount')])

    const keys = [
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: userInfoAccount, isSigner: false, isWritable: true },
        { pubkey: userOwner, isSigner: true, isWritable: false },
        { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ]

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
        {
            instruction: 2,
            amount
        },
        data
    )

    return new TransactionInstruction({
        keys,
        programId,
        data
    })
}
export function withdrawInstructionV4(
    programId: PublicKey,
    // staking pool
    poolId: PublicKey,
    poolAuthority: PublicKey,
    // user
    userInfoAccount: PublicKey,
    userOwner: PublicKey,
    userLpTokenAccount: PublicKey,
    poolLpTokenAccount: PublicKey,
    userRewardTokenAccount: PublicKey,
    poolRewardTokenAccount: PublicKey,
    userRewardTokenAccountB: PublicKey,
    poolRewardTokenAccountB: PublicKey,
    // tokenProgramId: PublicKey,
    amount: BN
): TransactionInstruction {
    const dataLayout = struct([u8('instruction'), u64('amount')])

    const keys = [
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: userInfoAccount, isSigner: false, isWritable: true },
        { pubkey: userOwner, isSigner: true, isWritable: false },
        { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolRewardTokenAccount, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: userRewardTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: poolRewardTokenAccountB, isSigner: false, isWritable: true }
    ]

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
        {
            instruction: 2,
            amount
        },
        data
    )

    return new TransactionInstruction({
        keys,
        programId,
        data
    })
}
