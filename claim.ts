import {
    Account,
    Connection,
    Keypair,
    Ed25519Keypair,
    Ed25519Program,
    Transaction,
    sendAndConfirmTransaction,
    PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import * as solend from "./Solend";
import * as saber from "./Saber";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import * as util from "./util"
const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const wallet = new Account(PrivateKey);
const walletPublicKey = wallet.publicKey;




async function main() {

    const connection = new Connection(   "https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "https://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed" } );
    //const connection = new Connection("https://raydium.genesysgo.net", { commitment: "processed" });
    let tx = new Transaction
    let swap = await saber.getAllSwap(connection);

    let allMiner = await saber.getAllMiner(connection, walletPublicKey);
    for (let miner of allMiner) {
        for (let info of swap) {
            if (info.farmingInfo?.infoPubkey.toString() == miner.farmKey.toString()) {

                let tx = new Transaction
                let claimIns = await saber.claimRewardTx(info.farmingInfo, walletPublicKey, connection);
                tx.add(claimIns);
                var recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
                tx.recentBlockhash = recentBlockhash;
                tx.feePayer = walletPublicKey;
                console.log(tx.serializeMessage().toString("base64"), "\n");
                //let simulation = await connection.simulateTransaction(tx.compileMessage(), [wallet])
                //console.log(simulation.value.err);
                let result = await sendAndConfirmTransaction(connection, tx, [wallet])

                console.log(result);




            }


        }


    }

}
main()
