/**
 * Presence manager
 * 
 * Uses a libp2p channel to send and receive presence messages to allow the client to see active users on the network.
 */
import { IRoundPubSub } from './RoundTable'
import { PublicKey } from "@solana/web3.js"

export const PRESENCE_PUBSUB_CHANNEL = "-presence";

export class PresenceMessage {
    user: PublicKey;
    constructor(
        user: PublicKey,
    ) {
        this.user = user;
    }
}

export class PeerPresence {
    id: PublicKey;
    lastSeen: number;

    constructor(
        id: PublicKey
    ) {
        this.id = id;
        this.lastSeen = 0;
    }

    setLastSeen(t: number) {
        this.lastSeen = t;
    }
}

export class PresenceManager {
    pubSub: IRoundPubSub;
    peerMap: any = {};
    id: PublicKey;
    netName: string;

    constructor(pubSub: IRoundPubSub, netName: string, id: PublicKey) {
        this.pubSub = pubSub;
        this.id = id;
        this.netName = netName;
        console.log("PRESENCE: Using channel " + netName + PRESENCE_PUBSUB_CHANNEL)

        this.pubSub.sub(netName + PRESENCE_PUBSUB_CHANNEL, msg => {
            this._handlePresenceMessage(msg);
        });
    }

    _handlePresenceMessage(msg: any) {
        const msgData = new TextDecoder().decode(msg.data);
        const presenceMsg: PresenceMessage = JSON.parse(msgData);
        this.handleObservation(presenceMsg);
    }

    handleObservation(pMsg: PresenceMessage) {
        if (!this.peerMap[pMsg.user.toString()]) {
            this.peerMap[pMsg.user.toString()] = new PeerPresence(pMsg.user);
        }
        this.peerMap[pMsg.user.toString()].lastSeen = (new Date()).getTime();
    }

    getPeers(): PeerPresence[] {
        var ret: PeerPresence[] = [];
        for (var k in this.peerMap) {
            ret.push(this.peerMap[k]);
        }
        return ret;
    }

    _sendPresenceMessage() {
        const presenceMsg: PresenceMessage = new PresenceMessage(
            this.id
        );
        const msgData = new TextEncoder().encode(JSON.stringify(presenceMsg))
        this.pubSub.pub(this.netName + PRESENCE_PUBSUB_CHANNEL, msgData);
    }
}