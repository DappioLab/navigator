import {
  AccountInfo,
  Connection,
  DataSizeFilter,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import { getTokenAccount } from "../util";
import { FarmInfo, parseFarmV1, parseFarmV45 } from "./farmInfo";
import {
  FARM_LEDGER_LAYOUT_V3_1,
  FARM_LEDGER_LAYOUT_V3_2,
  FARM_LEDGER_LAYOUT_V5_1,
  FARM_LEDGER_LAYOUT_V5_2,
  STAKE_PROGRAM_ID,
  STAKE_PROGRAM_ID_V5,
} from "./info";

type LedgerInfo = {
  pubkey: PublicKey;
  farmVersion: number;
  farmId: string;
  owner: string;
  deposited: number;
  rewardDebts: number[];
  mints: { stakedTokenMint: string; rewardAMint: string; rewardBMint?: string };
};
// Get all ledgers for certain user wallet.
export async function getAllLedgers(
  connection: Connection,
  ownerPubkey: PublicKey
): Promise<LedgerInfo[]> {
  let memcmpFilter: MemcmpFilter = {
    memcmp: {
      offset: 8 + 32,
      bytes: ownerPubkey.toString(),
    },
  };
  let dataSizeFilter = (datasize: any): DataSizeFilter => {
    return { dataSize: datasize };
  };
  let filters_v3_1 = [
    memcmpFilter,
    dataSizeFilter(FARM_LEDGER_LAYOUT_V3_1.span),
  ];
  let filters_v3_2 = [
    memcmpFilter,
    dataSizeFilter(FARM_LEDGER_LAYOUT_V3_2.span),
  ];
  let filters_v5_1 = [
    memcmpFilter,
    dataSizeFilter(FARM_LEDGER_LAYOUT_V5_1.span),
  ];
  let filters_v5_2 = [
    memcmpFilter,
    dataSizeFilter(FARM_LEDGER_LAYOUT_V5_2.span),
  ];

  let allLedgersInV3_1 = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
    filters: filters_v3_1,
  });
  let allLedgersInV3_2 = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
    filters: filters_v3_2,
  });
  let allLedgersInV5_1 = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID_V5,
    { filters: filters_v5_1 }
  );
  let allLedgersInV5_2 = await connection.getProgramAccounts(
    STAKE_PROGRAM_ID_V5,
    { filters: filters_v5_2 }
  );

  let ledgerInfoV3_1 = await getLegerInfos(
    connection,
    allLedgersInV3_1,
    FARM_LEDGER_LAYOUT_V3_1,
    3
  );
  let ledgerInfoV3_2 = await getLegerInfos(
    connection,
    allLedgersInV3_2,
    FARM_LEDGER_LAYOUT_V3_2,
    3
  );
  let ledgerInfoV5_1 = await getLegerInfos(
    connection,
    allLedgersInV5_1,
    FARM_LEDGER_LAYOUT_V5_1,
    5
  );
  let ledgerInfoV5_2 = await getLegerInfos(
    connection,
    allLedgersInV5_2,
    FARM_LEDGER_LAYOUT_V5_2,
    5
  );

  return [
    ...ledgerInfoV3_1,
    ...ledgerInfoV3_2,
    ...ledgerInfoV5_1,
    ...ledgerInfoV5_2,
  ];
}

export async function getLegerInfos(
  connection: Connection,
  ledgers: {
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
  }[],
  layout: any,
  farmVersion: 3 | 5
): Promise<LedgerInfo[]> {
  return await Promise.all(
    ledgers.map(async (ledger) => {
      let decoded = layout.decode(ledger.account.data);
      let relatedMints = await getFarmRelatedMints(
        connection,
        decoded,
        farmVersion
      );

      return {
        pubkey: ledger.pubkey,
        farmVersion: farmVersion,
        mints: relatedMints,
        farmId: decoded.id.toBase58(),
        owner: decoded.owner.toBase58(),
        deposited: decoded.deposited.toNumber(),
        rewardDebts: decoded.rewardDebts.map((rewardDebt: any) =>
          rewardDebt.toNumber()
        ),
      } as LedgerInfo;
    })
  );
}
// Inner fucntion used by getLedgerInfos
async function getFarmRelatedMints(
  connection: Connection,
  decoded: any,
  farmVersion: 3 | 5
) {
  let farmIdPubkey = new PublicKey(decoded.id.toBase58());
  let farmAccInfo = await connection.getAccountInfo(farmIdPubkey);
  let farmInfo: FarmInfo =
    farmVersion === 3
      ? parseFarmV1(farmAccInfo?.data, farmIdPubkey)
      : parseFarmV45(farmAccInfo?.data, farmIdPubkey, farmVersion);
  let stakedTokenMint = (
    await getTokenAccount(connection, farmInfo.poolLpTokenAccountPubkey)
  ).mint.toBase58();

  let rewardAMint = (
    await getTokenAccount(connection, farmInfo.poolRewardTokenAccountPubkey)
  ).mint.toBase58();
  let rewardBMint =
    farmVersion !== 3
      ? await (
          await getTokenAccount(
            connection,
            farmInfo.poolRewardTokenAccountPubkeyB!
          )
        ).mint.toBase58()
      : undefined;
  return { stakedTokenMint, rewardAMint, rewardBMint };
}

export async function getAssociatedLedgerAccount({
  programId,
  poolId,
  owner,
}: {
  programId: PublicKey;
  poolId: PublicKey;
  owner: PublicKey;
}) {
  const [publicKey] = await PublicKey.findProgramAddress(
    [
      poolId.toBuffer(),
      owner.toBuffer(),
      Buffer.from("staker_info_v2_associated_seed", "utf-8"),
    ],
    programId
  );
  return publicKey;
}
