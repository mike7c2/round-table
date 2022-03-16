import Libp2p from 'libp2p'
import { PublicKey, Connection, Keypair } from "@solana/web3.js"
import { ChatManager, ChatMessage, ChatEventListener } from "./Chat"
import { PresenceManager, PeerPresence } from "./Presence"
import { MatchManager, MatchState, MatchResult, MatchEventListener } from './Matcher';
import { getTableData } from "./Contract"
import { getP2PNode, getDefaultConfig } from '.';
import PeerId from "peer-id"
import crypto from "libp2p-crypto"

export interface IRoundChat {
    getChatLog(): ChatMessage[];
    getPeers(): PeerPresence[];
    sendChatMessage(msg: string): void;
    addChatListener(listener: ChatEventListener): void;
}

export interface IRoundPresence {
    getPeers(): PeerPresence[];
}

export interface IRoundMatch {
    getMatches(): MatchState[];
    addMatchListener(listener: MatchEventListener): void;
    findMatch(match: string, counter: number, callback: (match: MatchResult) => void): void;
    stopMatch(): void;
}

export interface IRoundPubSub {
    sub(event: string, listener: (...args: any[]) => void): void;
    pub(topic: string, message: Uint8Array): void;
}

/**
 * Central client component for RoundTable. Uses a libp2p node to communicate with RoundTable and exposes a client API
 * 
 * This client handles presence, chat and matching see chat.tsx, presence.tsx and matcher.tsx for their implementations.
 * 
 * The client also exposes `sub` and `pub` callbacks. These can be used for downstream software to implement
 * further protocols on top of roundtable.
 */
export class RoundTable implements IRoundChat, IRoundPresence, IRoundMatch, IRoundPubSub {
    libp2p: Libp2p;
    id: PublicKey;
    chatManager: ChatManager;
    presenceManager: PresenceManager;
    matchManager: MatchManager;

    constructor(
        libp2p: Libp2p,
        id: PublicKey,
        netName: string
    ) {
        this.libp2p = libp2p;
        this.id = id;

        this.chatManager = new ChatManager(this as IRoundPubSub, netName, this.id);
        this.presenceManager = new PresenceManager(this as IRoundPubSub, netName, this.id);
        this.matchManager = new MatchManager(this as IRoundPubSub, netName, this.id);
        this._startPresencePolling();
    };

    _startPresencePolling() {
        this.presenceManager._sendPresenceMessage();
        setInterval(x => {
            this.presenceManager._sendPresenceMessage();
        }, 10000);
    }

    getMatches(): MatchState[] {
        var matches = [];
        for (const k in this.matchManager.matchStateManager.matchMap) {
            matches.push(this.matchManager.matchStateManager.matchMap[k]);
        }
        return matches;
    }

    getChatLog(): ChatMessage[] {
        return this.chatManager.getChatLog();
    }

    getPeers(): PeerPresence[] {
        return this.presenceManager.getPeers();
    }

    sendChatMessage(msg: string) {
        this.chatManager.sendChatMessage(msg);
    }

    addChatListener(listener: ChatEventListener) {
        this.chatManager.addChatListener(listener)
    }

    addMatchListener(listener: MatchEventListener) {
        this.matchManager.addMatchStateListener(listener)
    }

    findMatch(match: string, counter: number, callback: (match: MatchResult) => void): boolean {
        return this.matchManager.matchAgent.startMatch(match, counter, callback);
    }

    stopMatch() {
        return this.matchManager.matchAgent.stopMatch();
    }

    sub(event: string, listener: (...args: any[]) => void) {
        this.libp2p.pubsub.on(event, listener);
        this.libp2p.pubsub.subscribe(event);
    }

    pub(topic: string, message: Uint8Array) {
        this.libp2p.pubsub.publish(topic, message);
    }
}

export async function initRoundTable(connection: Connection, id: PublicKey, channelId: Keypair, tableOwner: PublicKey, netName: string): Promise<RoundTable> {
    console.log("RoundTable: Fetching chain data")
    var chainData = await getTableData(connection, tableOwner)
    console.log("RoundTable: Chaindata")
    console.log(chainData)
    var config: any = getDefaultConfig(chainData.servers);

    console.log("RoundTable: Using config")
    console.log(config)

    const kp = new crypto.keys.supportedKeys.ed25519.Ed25519PrivateKey(channelId.secretKey, channelId.publicKey.toBytes());
    config.peerId = await PeerId.createFromPrivKey(crypto.keys.marshalPrivateKey(kp))
    var libp2p = await getP2PNode(config);
    console.log("RoundTable: Initialised P2P")
    console.log("RoundTable: Using ID " + libp2p.peerId.toString())

    return new RoundTable(libp2p, id, netName)
}