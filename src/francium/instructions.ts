import {
  PublicKey,
  TransactionInstruction,
  SYSVAR_CLOCK_PUBKEY,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { struct, u64, u8, u32 } from "@project-serum/borsh";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import BN from "bn.js";
import { getAnchorInsByIdl } from "../utils";
import {
  getRaydiunPositionKey,
  LendingInfo,
  RaydiumStrategyState,
} from "./infos";
import { Market } from "@project-serum/serum";
import {
  PoolInfo,
  AMM_AUTHORITY,
  POOL_PROGRAM_ID_V4,
  FarmInfoWrapper,
} from "../raydium";
import {
  FRANCIUM_LENDING_PROGRAM_ID,
  LENDING_AUTHORITY,
  LENDING_MARKET,
  LFY_RAYDIUM_PROGRAM_ID,
} from "./ids";

// Raydium Specific

export async function initializeRaydiumPosition(
  wallet: PublicKey,
  strategy: RaydiumStrategyState
) {
  let positionKey = await getRaydiunPositionKey(wallet, strategy.infoPubkey);
  let data = Buffer.alloc(13);
  let hash = "6cde4a0b8f992803";
  const dataLayout = struct([u32("nonce"), u8("bump")]);
  let seed = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      nonce: positionKey.nonce,
      bump: positionKey.bump,
    },
    seed
  );
  let dataString = hash.concat(seed.toString("hex"));
  data = Buffer.from(dataString, "hex");

  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: positionKey.address, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];

  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });

  return { instruction: ix, userKey: positionKey.address };
}

export async function transfer(
  wallet: PublicKey,
  strategy: RaydiumStrategyState,
  userAccount: PublicKey,
  stopLoss: BN,
  amount0: BN,
  amount1: BN,
  userTknAccount0: PublicKey,
  userTknAccount1: PublicKey
) {
  let hash = "a334c8e78c0345ba";
  const dataLayout = struct([u8("stopLoss"), u64("amount0"), u64("amount1")]);
  let data = Buffer.alloc(dataLayout.span + 8);
  let seed = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      stopLoss: stopLoss,
      amount0: amount0,
      amount1: amount1,
    },
    seed
  );
  let dataString = hash.concat(seed.toString("hex"));
  data = Buffer.from(dataString, "hex");
  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
    { pubkey: userTknAccount0, isSigner: false, isWritable: true },
    { pubkey: userTknAccount1, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount1, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];
  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });
  return ix;
}

export async function borrow(
  wallet: PublicKey,
  strategy: RaydiumStrategyState,
  lendInfo0: LendingInfo,
  lendInfo1: LendingInfo,
  ammInfo: PoolInfo,
  userAccount: PublicKey,
  amount0: BN,
  amount1: BN
) {
  let hash = "e4fd83cacf745912";
  const dataLayout = struct([u64("amount0"), u64("amount1")]);
  let data = Buffer.alloc(dataLayout.span + 8);
  let seed = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      amount0: amount0,
      amount1: amount1,
    },
    seed
  );
  let dataString = hash.concat(seed.toString("hex"));
  data = Buffer.from(dataString, "hex");
  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount1, isSigner: false, isWritable: true },
    { pubkey: LENDING_MARKET, isSigner: false, isWritable: true },
    { pubkey: LENDING_AUTHORITY, isSigner: false, isWritable: false },
    { pubkey: FRANCIUM_LENDING_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: strategy.lendingPool0, isSigner: false, isWritable: true },
    {
      pubkey: lendInfo0.lendingPoolTknAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: lendInfo0.lendingPoolCreditAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: strategy.strategyLendingCreditAccount0,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: strategy.lendingPool1, isSigner: false, isWritable: true },
    {
      pubkey: lendInfo1.lendingPoolTknAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: lendInfo1.lendingPoolCreditAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: strategy.strategyLendingCreditAccount1,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: strategy.ammId, isSigner: false, isWritable: true },
    { pubkey: ammInfo.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.lpMint, isSigner: false, isWritable: true },
  ];
  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });
  return ix;
}

export async function swap(
  wallet: PublicKey,
  strategy: RaydiumStrategyState,
  ammInfo: PoolInfo,
  serum: Market,
  userAccount: PublicKey
) {
  let hash = "f8c69e91e17587c80001000000000000000000000000000000";

  let data = Buffer.from(hash, "hex");
  let serumVaultSigner = await PublicKey.createProgramAddress(
    [
      serum.address.toBuffer(),
      serum.decoded.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
    ],
    serum.programId
  );
  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount1, isSigner: false, isWritable: true },
    { pubkey: strategy.lpAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: POOL_PROGRAM_ID_V4,
      isSigner: false,
      isWritable: false,
    },

    { pubkey: strategy.ammId, isSigner: false, isWritable: true },

    { pubkey: AMM_AUTHORITY, isSigner: false, isWritable: true },

    { pubkey: ammInfo.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.lpMint, isSigner: false, isWritable: true },
    { pubkey: ammInfo.serumProgramId, isSigner: false, isWritable: false },
    { pubkey: ammInfo.serumMarket, isSigner: false, isWritable: true },
    { pubkey: serum.bidsAddress, isSigner: false, isWritable: true },
    { pubkey: serum.asksAddress, isSigner: false, isWritable: true },
    {
      pubkey: new PublicKey(serum.decoded.eventQueue),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey(serum.decoded.baseVault),
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: new PublicKey(serum.decoded.quoteVault),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: true },
  ];

  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });
  return ix;
}

export async function addLiquidity(
  wallet: PublicKey,
  strategy: RaydiumStrategyState,
  ammInfo: PoolInfo,
  userAccount: PublicKey
) {
  let hash = "b59d59438fb63448";

  let data = Buffer.from(hash, "hex");
  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount1, isSigner: false, isWritable: true },
    { pubkey: strategy.lpAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: POOL_PROGRAM_ID_V4,
      isSigner: false,
      isWritable: false,
    },

    { pubkey: strategy.ammId, isSigner: false, isWritable: true },

    { pubkey: AMM_AUTHORITY, isSigner: false, isWritable: true },

    { pubkey: ammInfo.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.lpMint, isSigner: false, isWritable: true },
    { pubkey: ammInfo.serumMarket, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },

    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];

  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });
  return ix;
}

export async function stake(
  strategy: RaydiumStrategyState,
  stakeInfo: FarmInfoWrapper,
  strategyFarmInfo: PublicKey
) {
  let hash = "01c472f20e00000000";

  let data = Buffer.from(hash, "hex");
  let keys = [
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.lpAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.rewardAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.rewardAccountB, isSigner: false, isWritable: true },
    { pubkey: strategyFarmInfo, isSigner: false, isWritable: true },

    { pubkey: strategy.stakeProgramId, isSigner: false, isWritable: false },
    { pubkey: strategy.stakePoolId, isSigner: false, isWritable: true },
    //authority
    {
      pubkey: (await stakeInfo.authority())[0],
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: stakeInfo.farmInfo.poolLpTokenAccountPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: stakeInfo.farmInfo.poolRewardTokenAccountPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: stakeInfo.farmInfo.poolRewardTokenAccountPubkeyB as PublicKey,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];

  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });

  return ix;
}

export async function unstake(
  strategy: RaydiumStrategyState,
  stakeInfo: FarmInfoWrapper,
  wallet: PublicKey,
  strategyFarmInfo: PublicKey,
  userAccount: PublicKey,
  LPamount: BN,
  withdrawType: BN
) {
  let hash = "0e177c3d3343a578";
  const dataLayout = struct([u8("type"), u64("LPamount")]);
  let data = Buffer.alloc(dataLayout.span + 8);
  let seed = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      type: withdrawType,
      LPamount: LPamount,
    },
    seed
  );
  let dataString = hash.concat(seed.toString("hex"));
  data = Buffer.from(dataString, "hex");

  // TODO: Double-check if it's valid to remove Raydium config

  // const raydiumConfig = Object.values(RAYDIUM_FARM_CONFIG).find((config) =>
  //   config.strategyAccount.equals(strategy.infoPubkey)
  // );

  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.lpAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.rewardAccount, isSigner: false, isWritable: true },
    // TODO: Need double-check
    {
      pubkey: strategy.tknAccount1,
      isSigner: false,
      isWritable: true,
    },
    // TODO: Need double-check
    {
      pubkey: strategyFarmInfo,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: strategy.stakeProgramId, isSigner: false, isWritable: false },
    { pubkey: strategy.stakePoolId, isSigner: false, isWritable: true },
    {
      pubkey: (await stakeInfo.authority())[0],
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: stakeInfo.farmInfo.poolLpTokenAccountPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: stakeInfo.farmInfo.poolRewardTokenAccountPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: stakeInfo.farmInfo.poolRewardTokenAccountPubkeyB as PublicKey,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: strategy.lendingPool0, isSigner: false, isWritable: true },
    { pubkey: strategy.lendingPool1, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
  ];

  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });

  return ix;
}

export function updateLending(strategy: RaydiumStrategyState) {
  let keys0 = [
    {
      pubkey: LENDING_MARKET,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: strategy.lendingPool0,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  let keys1 = [
    {
      pubkey: LENDING_MARKET,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: strategy.lendingPool1,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
  ];
  let data = Buffer.alloc(1, 12);
  let tx = new Transaction();
  tx.add(
    new TransactionInstruction({
      keys: keys0,
      programId: FRANCIUM_LENDING_PROGRAM_ID,
      data,
    })
  );
  tx.add(
    new TransactionInstruction({
      keys: keys1,
      programId: FRANCIUM_LENDING_PROGRAM_ID,
      data,
    })
  );
  return tx;
}
export async function removeLiquidity(
  wallet: PublicKey,
  strategy: RaydiumStrategyState,
  ammInfo: PoolInfo,
  serum: Market,
  userAccount: PublicKey
) {
  let hash = "5055d14818ceb16c";

  let data = Buffer.from(hash, "hex");
  let serumVaultSigner = await PublicKey.createProgramAddress(
    [
      serum.address.toBuffer(),
      serum.decoded.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
    ],
    serum.programId
  );
  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount1, isSigner: false, isWritable: true },
    { pubkey: strategy.lpAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: strategy.ammProgramId, isSigner: false, isWritable: false },
    { pubkey: strategy.ammId, isSigner: false, isWritable: true },

    { pubkey: AMM_AUTHORITY, isSigner: false, isWritable: true },

    { pubkey: ammInfo.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.lpMint, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolWithdrawQueue, isSigner: false, isWritable: true },
    {
      pubkey: ammInfo.poolTempLpTokenAccount,
      isSigner: false,
      isWritable: true,
    },

    { pubkey: ammInfo.serumProgramId, isSigner: false, isWritable: false },
    { pubkey: ammInfo.serumMarket, isSigner: false, isWritable: true },
    {
      pubkey: new PublicKey(serum.decoded.baseVault),
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: new PublicKey(serum.decoded.quoteVault),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: true },
  ];
  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });
  return ix;
}

export async function swapAndWithdraw(
  wallet: PublicKey,
  strategy: RaydiumStrategyState,
  ammInfo: PoolInfo,
  serum: Market,
  userAccount: PublicKey,
  userTknAccount0: PublicKey,
  userTknAccount1: PublicKey,
  withdrawType: BN
) {
  let data = Buffer.alloc(9);
  let datahex = withdrawType.toString(16);
  //console.log(datahex)
  let datastring = "6f607d39534edca00".concat(datahex);
  //console.log(datastring)
  data = Buffer.from(datastring, "hex");
  let serumVaultSigner = await PublicKey.createProgramAddress(
    [
      serum.address.toBuffer(),
      serum.decoded.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
    ],
    serum.programId
  );

  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },

    { pubkey: userTknAccount0, isSigner: false, isWritable: true },
    { pubkey: userTknAccount1, isSigner: false, isWritable: true },
    { pubkey: strategy.infoPubkey, isSigner: false, isWritable: true },
    { pubkey: strategy.authority, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount0, isSigner: false, isWritable: true },
    { pubkey: strategy.tknAccount1, isSigner: false, isWritable: true },
    { pubkey: strategy.lpAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: POOL_PROGRAM_ID_V4,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: strategy.ammId, isSigner: false, isWritable: true },
    { pubkey: AMM_AUTHORITY, isSigner: false, isWritable: true },
    { pubkey: ammInfo.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammInfo.serumProgramId, isSigner: false, isWritable: false },
    { pubkey: ammInfo.serumMarket, isSigner: false, isWritable: true },
    { pubkey: serum.bidsAddress, isSigner: false, isWritable: true },
    { pubkey: serum.asksAddress, isSigner: false, isWritable: true },
    {
      pubkey: new PublicKey(serum.decoded.eventQueue),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey(serum.decoded.baseVault),
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: new PublicKey(serum.decoded.quoteVault),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: true },
  ];

  let ix = new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });

  return ix;
}

export function closeRaydiumPosition(
  userInfoPubkey: PublicKey,
  wallet: PublicKey
) {
  let keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: userInfoPubkey, isSigner: false, isWritable: true },
  ];

  let data = Buffer.from("ca6f062b7a4edabb", "hex");

  return new TransactionInstruction({
    keys,
    programId: LFY_RAYDIUM_PROGRAM_ID,
    data,
  });
}
