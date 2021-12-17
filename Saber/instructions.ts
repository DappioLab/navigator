import {
    PublicKey,
    SYSVAR_CLOCK_PUBKEY,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    TransferParams,
    Connection,
    SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import BN from 'bn.js';
import { SwapInfo } from './swapInfoLayout';
import { publicKey, struct, u64, u128, u8, bool, u16 } from "@project-serum/borsh";
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SWAP_PROGRAM_ID ,SABER_WRAP_PROGRAM_ID ,QURARRY_MINE_PROGRAM_ID,SABER_QUARRY_REWARDER,SABER_FARM_MINTER,SABER_MINT_WRAPPER,QURARRY_MINT_WRAPPER, IOU_TOKEN_MINT, CLAIM_FEE_TOKEN_ACCOUNT, SABER_TOKEN_MINT, MINTER_PROGRAM_ID} from './saberInfo';
import { wrapInfo } from './wrapInfo';
import { FarmInfo, getMinerKey } from './farmInfoLayout';
import {findAssociatedTokenAddress} from '../util'

enum SaberInstruction {
    swap = 1,
    deposit = 2,
    withdraw = 3,
    withdrawOne = 4,
}

export function deposit(swapInfo: SwapInfo, AtokenAmount: BN, BtokenAmount: BN, minimalRecieve: BN, wallet: PublicKey, AtokenSourceAccount: PublicKey, BtokenSourceAccount: PublicKey, LPtokenAccount: PublicKey) {
    const dataLayout = struct([
        u8('instruction'),
        u64('AtokenAmount'),
        u64('BtokenAmount'),
        u64('minimalRecieve'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            instruction:
                SaberInstruction.deposit,
            AtokenAmount: new BN(AtokenAmount),
            BtokenAmount: new BN(BtokenAmount),
            minimalRecieve: new BN(minimalRecieve),
        },
        data,
    );
    const keys = [
        { pubkey: swapInfo.infoPublicKey, isSigner: false, isWritable: false },
        { pubkey: swapInfo.authority, isSigner: false, isWritable: false },
        { pubkey: wallet, isSigner: true, isWritable: false },
        { pubkey: AtokenSourceAccount, isSigner: false, isWritable: true },
        { pubkey: BtokenSourceAccount, isSigner: false, isWritable: true },
        { pubkey: swapInfo.tokenAccountA, isSigner: false, isWritable: true },
        { pubkey: swapInfo.tokenAccountB, isSigner: false, isWritable: true },
        { pubkey: swapInfo.poolMint, isSigner: false, isWritable: true },
        { pubkey: LPtokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SWAP_PROGRAM_ID,
        data,
    });
}

export function withdrawOne(swapInfo: SwapInfo, tokenType: String, LPtokenAmount: BN, minimalRecieve: BN, wallet: PublicKey, LPtokenSourceAccount: PublicKey, recieveTokenAccount: PublicKey) {
    const dataLayout = struct([
        u8('instruction'),
        u64('LPtokenAmount'),
        u64('minimalRecieve'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            instruction:
                SaberInstruction.withdrawOne,
            LPtokenAmount: new BN(LPtokenAmount),
            minimalRecieve: new BN(minimalRecieve),
        },
        data,
    );
    let baseTokenAccount = PublicKey.default;
    let quoteTokenAccount = PublicKey.default;
    let feeTokenAccount = PublicKey.default;
    if (tokenType == "A"){
        baseTokenAccount = swapInfo.tokenAccountA;
        quoteTokenAccount = swapInfo.tokenAccountB;
        feeTokenAccount = swapInfo.adminFeeAccountA;
    }
    else if (tokenType == "B") {
        baseTokenAccount = swapInfo.tokenAccountB;
        quoteTokenAccount = swapInfo.tokenAccountA;
        feeTokenAccount = swapInfo.adminFeeAccountB;
    }
    else{
        console.log("panic!!, no withdraw type provided");
    }

    const keys = [
        { pubkey: swapInfo.infoPublicKey, isSigner: false, isWritable: false },
        { pubkey: swapInfo.authority, isSigner: false, isWritable: false },
        { pubkey: wallet, isSigner: true, isWritable: false },
        { pubkey: swapInfo.poolMint, isSigner: false, isWritable: true },
        { pubkey: LPtokenSourceAccount, isSigner: false, isWritable: true },
        { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
        { pubkey: quoteTokenAccount, isSigner: false, isWritable: true },
        { pubkey: recieveTokenAccount, isSigner: false, isWritable: true },
        { pubkey: feeTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SWAP_PROGRAM_ID,
        data,
    });
}

export function wrapToken(wrapInfo: wrapInfo, wallet: PublicKey, amount: BN, wrapInTokenAccount: PublicKey, wrapOutTokenAccount: PublicKey) {
    if (amount.eq(new BN(0))){
        return new Transaction;
    }
    const dataLayout = struct([
        u64('amount'),
    ]);
    let data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            amount: new BN(amount),
        },
        data,
    );
    let datahex = data.toString('hex');
    let datastring = 'f223c68952e1f2b6'.concat(datahex);
    data = Buffer.from(datastring, "hex")
    const keys = [
        { pubkey: wrapInfo.wrapAuthority, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.wrappedTokenMint, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.underlyingTokenAccount, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: false },

        { pubkey: wrapInTokenAccount, isSigner: false, isWritable: true },
        { pubkey: wrapOutTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SABER_WRAP_PROGRAM_ID,
        data,
    });
}
export function unwrapToken(wrapInfo: wrapInfo, wallet: PublicKey, unwrapTokenAccount: PublicKey, originalTokenAccount: PublicKey) {
    const dataLayout = struct([
        u64('amount'),
    ]);
    let data = Buffer.alloc(dataLayout.span);
    let datastring = '60f6a682e5322b46';
    data = Buffer.from(datastring, "hex");
    const keys = [
        { pubkey:wrapInfo.wrapAuthority, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.wrappedTokenMint, isSigner: false, isWritable: true },
        { pubkey: wrapInfo.underlyingTokenAccount, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: false },

        { pubkey: originalTokenAccount, isSigner: false, isWritable: true },
        { pubkey: unwrapTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: SABER_WRAP_PROGRAM_ID,
        data,
    });
}
export async function depositToFarmIx(farmInfo:FarmInfo,wallet:PublicKey,amount:BN){
    let miner = await getMinerKey(wallet,farmInfo.infoPubkey)
    let minerVault = await findAssociatedTokenAddress(miner[0],farmInfo.tokenMintKey)
    let minerLPAccount = await findAssociatedTokenAddress(wallet,farmInfo.tokenMintKey)
    const dataLayout = struct([
        u64('amount'),
    ]);
    let amountData = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            amount: new BN(amount),
        },
        amountData,
    );
    let dataString = '887e5ba228830d7f'.concat(amountData.toString('hex'));
    let data = Buffer.from(dataString, "hex");
    let keys = [
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: miner[0], isSigner: false, isWritable: true },
        { pubkey: farmInfo.infoPubkey, isSigner: false, isWritable: true },
        { pubkey: minerVault, isSigner: false, isWritable: true },
        { pubkey: minerLPAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SABER_QUARRY_REWARDER, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: QURARRY_MINE_PROGRAM_ID,
        data,
    });
}
export async function createMinerAccountIx(FarmInfo:FarmInfo,wallet:PublicKey){
    let miner = await getMinerKey(wallet,FarmInfo.infoPubkey)
    const dataLayout = struct([
        u64('amount'),
    ]);
    let bumpData = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            amount: new BN(miner[1]),
        },
        bumpData,
    );
    let dataString = '7e179d01935ef545'.concat(bumpData.toString('hex'));
    let data = Buffer.from(dataString, "hex")
    let minerBytes = new Uint8Array(Buffer.from('Miner', 'utf-8'))

    let minerVault = await findAssociatedTokenAddress(miner[0],FarmInfo.tokenMintKey)
    const keys =[
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: miner[0], isSigner: false, isWritable: true },
        { pubkey: FarmInfo.infoPubkey, isSigner: false, isWritable: true },
        { pubkey: SABER_QUARRY_REWARDER, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: FarmInfo.tokenMintKey, isSigner: false, isWritable: false },
        { pubkey: minerVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: QURARRY_MINE_PROGRAM_ID,
        data,
    });
}

export async function withdrawFromFarmIx(farmInfo:FarmInfo,wallet:PublicKey,amount:BN){
    let miner = await getMinerKey(wallet,farmInfo.infoPubkey)
    let minerVault = await findAssociatedTokenAddress(miner[0],farmInfo.tokenMintKey)
    let minerLPAccount = await findAssociatedTokenAddress(wallet,farmInfo.tokenMintKey)
    const dataLayout = struct([
        u64('amount'),
    ]);
    let amountData = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
        {
            amount: new BN(amount),
        },
        amountData,
    );
    let dataString = '0204e13d13b66aaa'.concat(amountData.toString('hex'));
    let data = Buffer.from(dataString, "hex");
    let keys = [
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: miner[0], isSigner: false, isWritable: true },
        { pubkey: farmInfo.infoPubkey, isSigner: false, isWritable: true },
        { pubkey: minerVault, isSigner: false, isWritable: true },
        { pubkey: minerLPAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SABER_QUARRY_REWARDER, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        programId: QURARRY_MINE_PROGRAM_ID,
        data,
    });
}
export async function claimReward(farmInfo:FarmInfo,wallet:PublicKey) {
    let tx = new Transaction;
    let miner = await getMinerKey(wallet,farmInfo.infoPubkey)
    let minerVault = await findAssociatedTokenAddress(miner[0],farmInfo.tokenMintKey)
    let minerLPAccount = await findAssociatedTokenAddress(wallet,farmInfo.tokenMintKey)
    let iouTokenAccount = await findAssociatedTokenAddress(wallet,IOU_TOKEN_MINT);
    let dataString = '0490844774179750'
    let data = Buffer.from(dataString, "hex");
    let keys = [
        { pubkey: SABER_MINT_WRAPPER, isSigner: false, isWritable: true },
        { pubkey: QURARRY_MINT_WRAPPER, isSigner: false, isWritable: false },
        { pubkey: SABER_FARM_MINTER, isSigner: false, isWritable: true },
        { pubkey: IOU_TOKEN_MINT, isSigner: false, isWritable: true },
        { pubkey: iouTokenAccount, isSigner: false, isWritable: true },
        { pubkey: CLAIM_FEE_TOKEN_ACCOUNT, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: miner[0], isSigner: false, isWritable: true },
        { pubkey: farmInfo.infoPubkey, isSigner: false, isWritable: true },
        { pubkey: minerVault, isSigner: false, isWritable: true },
        { pubkey: minerLPAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SABER_QUARRY_REWARDER, isSigner: false, isWritable: false },
    ];
    tx.add( new TransactionInstruction({
        keys,
        programId: QURARRY_MINE_PROGRAM_ID,
        data,
    }));
    let sbrTokenAccount = await findAssociatedTokenAddress(wallet,SABER_TOKEN_MINT);
    keys = [
        { pubkey: new PublicKey("CL9wkGFT3SZRRNa9dgaovuRV7jrVVigBUZ6DjcgySsCU"), isSigner: false, isWritable: false },
        { pubkey: IOU_TOKEN_MINT, isSigner: false, isWritable: true },
        { pubkey: SABER_TOKEN_MINT, isSigner: false, isWritable: true },
        { pubkey: new PublicKey("ESg7xPUBioCqK4QaSvuZkhuekagvKcx326wNo3U7kRWc"), isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: wallet, isSigner: true, isWritable: true },
        { pubkey: iouTokenAccount, isSigner: false, isWritable: true },
        { pubkey: sbrTokenAccount, isSigner: false, isWritable: true },
        { pubkey: new PublicKey("9qRjwMQYrkd5JvsENaYYxSCgwEuVhK4qAo5kCFHSmdmL"), isSigner: false, isWritable: false },
        { pubkey: new PublicKey("GyktbGXbH9kvxP8RGfWsnFtuRgC7QCQo2WBqpo3ryk7L"), isSigner: false, isWritable: false },
        { pubkey: new PublicKey("UBEBk5idELqykEEaycYtQ7iBVrCg6NmvFSzMpdr22mL"), isSigner: false, isWritable: false },
        { pubkey: new PublicKey("GNSuMDSnUP9oK4HRtCi41zAbUzEqeLK1QPoby6dLVD9v"), isSigner: false, isWritable: true },
    ];
    dataString = "dbeee821de003643"
    data = Buffer.from(dataString, "hex");
    tx.add(new TransactionInstruction({
        keys,
        programId: MINTER_PROGRAM_ID,
        data,
    }))
    return tx;
}
