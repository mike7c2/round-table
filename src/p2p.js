import Libp2p from 'libp2p'
import Websockets from 'libp2p-websockets'
import WebRTCStar from 'libp2p-webrtc-star'
import { NOISE } from '@chainsafe/libp2p-noise'
import Mplex from 'libp2p-mplex'
import Bootstrap from 'libp2p-bootstrap'
import Gossipsub from '@achingbrain/libp2p-gossipsub'
import KadDHT from 'libp2p-kad-dht'

var node_instance = null;
export function getDefaultConfig(bootstraps = ["/dns4/bs2.mike7c2.co.uk/tcp/443/wss/ipfs/QmVV9hEB5qrNeXwLtyVzbjHZQkCdjQbmvai6PdfrSoEJLM"]) {
    return {
        addresses: {
            // Don't bother with listen addresses - specifically, we don't care about direct connections
            // just now and are just using pubsub channels on bootstrap servers
            listen: [
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
                    // Add bootstrap server list here
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

export async function getP2PNode(config = getDefaultConfig()) {

    if (!node_instance) {
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
        node_instance = libp2p;
    }
    return node_instance;
}