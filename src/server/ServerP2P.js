import Libp2p from 'libp2p'
import Websockets from 'libp2p-websockets'
import WebRTCStar from 'libp2p-webrtc-star'
import { NOISE } from '@chainsafe/libp2p-noise'
import Mplex from 'libp2p-mplex'
import Bootstrap from 'libp2p-bootstrap'
import Gossipsub from '@achingbrain/libp2p-gossipsub'
import KadDHT from 'libp2p-kad-dht'
import { PublicKey } from "@solana/web3.js"

export function buildConfig(hostname, bootstraps) {

    const announceAddress = "/dns4/" + hostname + "/tcp/443/wss";
    const listenAddress = "/dns4/" + hostname + "/tcp/8080/ws";

    return {
        addresses: {
            announce: [
                announceAddress
            ],
            listen: [
                listenAddress
            ]
        },
        modules: {
            transport: [Websockets, WebRTCStar],
            connEncryption: [NOISE],
            pubsub: Gossipsub,
            peerDiscovery: [Bootstrap],
            streamMuxer: [Mplex],
            dht: KadDHT
        },
        config: {
            peerDiscovery: {
                [Bootstrap.tag]: {
                    enabled: true,
                    list: bootstraps
                }
            },
            relay: {
                enabled: true,
                hop: {
                    enabled: true,
                    active: true
                }
            },
        },
    };
}

export async function initRoundTableLibP2PNode(config) {

    const libp2p = await Libp2p.create(config)

    // Listen for new peers
    libp2p.on('peer:discovery', (peerId) => {
        console.log(`Found peer ${peerId.toB58String()}`)
    })

    // Listen for new connections to peers
    libp2p.connectionManager.on('peer:connect', (connection) => {
        console.log(`Connected to ${connection.remotePeer.toB58String()}`)
    })

    // Listen for peers disconnecting
    libp2p.connectionManager.on('peer:disconnect', (connection) => {
        console.log(`Disconnected from ${connection.remotePeer.toB58String()}`)
    })

    await libp2p.start()
    console.log('libp2p started!')

    return libp2p;
}

