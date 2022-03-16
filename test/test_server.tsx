import { RoundTableServer } from "../src/server/Server"
import { PublicKey, Keypair } from "@solana/web3.js"
import { readFileSync } from 'fs';
import { argv } from "process";

function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function keyPairFromFile(file: string): Keypair {
    const keyFile = readFileSync(file, 'utf-8');
    const id = Keypair.fromSecretKey(new Uint8Array(JSON.parse(keyFile)))
    return id;
}

async function setup() {
    if (process.argv.length < 6) {
        console.log("Need more arguments")
        console.log("[keypair file] [tableOwner pubkey] [our hostname] [solana RPC url")
    }

    const kp = keyPairFromFile(process.argv[2]);
    const tableOwner = new PublicKey(process.argv[3]);
    const hostName = process.argv[4];
    const rpcUrl = process.argv[5];

    console.log("Starting server")
    console.log("ID: " + kp.publicKey.toString())
    console.log("hostname: " + hostName)
    console.log("RPC URL: " + rpcUrl)
    console.log("TableOwner:" + tableOwner.toString())

    const server = new RoundTableServer(kp, tableOwner, hostName, rpcUrl);
    await server.init()
}

setup().then(x => {
    console.log("Done")
});


