import { PublicKey, Connection, Keypair } from "@solana/web3.js"
import { getTableData } from "../Contract"
import Libp2p from 'libp2p'
import { buildConfig, initRoundTableLibP2PNode } from "./ServerP2P";
import PeerId from "peer-id"
import crypto from "libp2p-crypto"

export class RoundTableServer {
    id: Keypair;
    tableOwner: PublicKey;
    libp2p: Libp2p | null;
    hostname: string;
    connection: Connection;

    constructor(id: Keypair, tableOwner: PublicKey, hostname: string, rpc: string) {
        this.id = id;
        this.tableOwner = tableOwner;
        this.hostname = hostname;
        this.connection = new Connection(rpc)
        this.libp2p = null;
    }

    async init() {
        console.log("SERVER: Fetching chain data")
        var chainData = await getTableData(this.connection, this.tableOwner)
        console.log("SERVER: Chaindata")
        console.log(chainData)
        var config: any = buildConfig(this.hostname, chainData.servers);
        console.log("SERVER: Using config")
        console.log(config)

        const kp = new crypto.keys.supportedKeys.ed25519.Ed25519PrivateKey(this.id.secretKey, this.id.publicKey.toBytes());
        config.peerId = await PeerId.createFromPrivKey(crypto.keys.marshalPrivateKey(kp))
        var libp2p = await initRoundTableLibP2PNode(config);
        console.log("SERVER: Initialised P2P")
        console.log("SERVER: Using ID " + libp2p.peerId.toString())
        this.libp2p = libp2p;

        for (var i = 0; i < chainData.channels.length; i++) {
            console.log("SERVER: Subscribing to channel " + chainData.channels[i])
            libp2p.pubsub.subscribe(chainData.channels[i])
        }
    }
}