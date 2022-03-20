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
        console.log("[keypair file] [tableOwner pubkey] [our hostname] [solana RPC url] [port] [announce WSS (true/false)]")
    }

    const kp = keyPairFromFile(process.argv[2]);
    const tableOwner = new PublicKey(process.argv[3]);
    const hostName = process.argv[4];
    const rpcUrl = process.argv[5];
    const port = parseInt(process.argv[6]);
    const announceWSS = process.argv[7] == "true";

    console.log("Starting server")
    console.log("ID: " + kp.publicKey.toString())
    console.log("hostname: " + hostName)
    console.log("RPC URL: " + rpcUrl)
    console.log("TableOwner:" + tableOwner.toString())
    console.log("Port: " + port)
    console.log("Announce WSS:" + announceWSS)

    const server = new RoundTableServer(kp, tableOwner, hostName, rpcUrl, port, announceWSS);
    await server.init()
}

setup().then(x => {
    console.log("Done")
});


