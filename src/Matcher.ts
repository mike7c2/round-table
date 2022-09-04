/*
 * A simple protocol to allow players to match into pairs when looking for the same type of match
 *
 * This files contains the implementation of a state manager which watches for messages and uses
 * them to build a picture of state on the network, and an agent which executes the protocol.
 *
 * The protocol implements the following process:
 * 
 * A user wishing to join a game first checks if there are any games already existing in the state that match the game they want
 * If there are, the user makes a `claim` to join one of those games. If they are accepted the host sends an `ack` starting the game
 * If there are no ready games the player will advertise a new game as host. When another player claims a seat in their game they 
 * ack it and start the game
 * 
 * The matcher uses 4 pubsub channels, 1 for each type of message to keep the protocol very simply for just now (each stream has only 1 type of message)
 * 
 * The unadvertise message is used to clear an advert from the network state. It is sent both when a game is successfully filled and when the advertiser wants to cancel the game
 */

import { IRoundPubSub } from './RoundTable'
import { PublicKey } from "@solana/web3.js"
import { timeStamp } from 'console';
import { getTextOfJSDocComment } from 'typescript';

export const ADVERTISE_TIMEOUT = 15000;
export const SERVING_REBROADCAST_TIMEOUT = 10000;
export const CLAIM_ACK_TIMEOUT = 5000;

export const MATCH_ADVERTISE_PUBSUB_CHANNEL = "-match-advertise";
export const MATCH_UNADVERTISE_PUBSUB_CHANNEL = "-match-unadvertise";
export const MATCH_CLAIM_PUBSUB_CHANNEL = "-match-claim";
export const MATCH_ACK_PUBSUB_CHANNEL = "-match-ack";

export function getMatchID(advertiser: PublicKey, match: string): string {
    return advertiser.toString() + match
}

export class MatchAdvertiseMessage {
    advertiser: PublicKey;
    match: string;
    counter: number;

    constructor(
        user: PublicKey,
        match: string,
        counter: number
    ) {
        this.advertiser = user;
        this.match = match;
        this.counter = counter;
    }

    serialise(): any {
        return {
            advertiser: this.advertiser.toString(),
            match: this.match,
            counter: this.counter
        }
    }

    static deserialise(msg: any) {
        return new MatchAdvertiseMessage(
            new PublicKey(msg.advertiser),
            msg.match,
            msg.counter
        )
    }
}

export class MatchUnadvertiseMessage {
    matchId: string;

    constructor(
        matchId: string
    ) {
        this.matchId = matchId;
    }

    serialise(): any {
        return {
            matchId: this.matchId
        }
    }

    static deserialise(msg: any) {
        return new MatchUnadvertiseMessage(
            msg.matchId,
        )
    }
}

export class MatchClaimMessage {
    matchId: string;
    user: PublicKey;
    counter: number;

    constructor(
        matchId: string,
        user: PublicKey,
        counter: number
    ) {
        this.matchId = matchId;
        this.user = user;
        this.counter = counter;
    }

    serialise(): any {
        return {
            matchId: this.matchId,
            user: this.user.toString(),
            counter: this.counter
        }
    }

    static deserialise(msg: any) {
        return new MatchClaimMessage(
            msg.matchId,
            new PublicKey(msg.user),
            msg.counter
        )
    }
}

export class MatchAckMessage {
    matchId: string;
    user: PublicKey;

    constructor(
        matchId: string,
        user: PublicKey
    ) {
        this.matchId = matchId;
        this.user = user;
    }

    serialise(): any {
        return {
            matchId: this.matchId,
            user: this.user.toString()
        }
    }

    static deserialise(msg: any) {
        return new MatchAckMessage(
            msg.matchId,
            new PublicKey(msg.user)
        )
    }
}

export type MatchEventListener = (match: MatchState) => void;

export class MatchState {
    advertiser: PublicKey;
    advertiserCounter: number;
    match: string;
    matchId: string;
    lastSeen: number;
    claimsSeen: ([PublicKey, number])[];
    acksSeen: PublicKey[];

    constructor(
        advertiser: PublicKey,
        advertiserCounter: number,
        match: string,
        lastSeen: number
    ) {
        this.advertiser = advertiser;
        this.advertiserCounter = advertiserCounter;
        this.match = match;
        this.matchId = getMatchID(advertiser, match);
        this.lastSeen = lastSeen;
        this.claimsSeen = [];
        this.acksSeen = [];
    }

    getCounter(id: PublicKey) {
        if (this.advertiser.equals(id)) {
            return this.advertiserCounter;
        } else {
            for (var i = 0; i < this.claimsSeen.length; i++) {
                if (this.claimsSeen[i][0].equals(id)) {
                    return this.claimsSeen[i][1]
                }
            }
        }
        return -1;
    }
}

export class MatchStateManager {
    matchMap: { [matchId: string]: MatchState; } = {};
    listeners: MatchEventListener[] = [];

    constructor() {

    }

    handleAdvertiseMessage(msg: MatchAdvertiseMessage) {
        console.log("Matcher: Got advertise message")
        const matchId = getMatchID(msg.advertiser, msg.match);
        if (this.matchMap[matchId]) {
            this.matchMap[matchId].lastSeen = (new Date()).getTime();
        } else {
            this.matchMap[matchId] = new MatchState(msg.advertiser, msg.counter, msg.match, (new Date()).getTime());
        }
        this.raiseUpdateEvent(matchId);
    }

    handleUnadvertiseMessage(msg: MatchUnadvertiseMessage) {
        console.log("Matcher: Got unadvertise message")
        if (this.matchMap[msg.matchId]) {
            delete this.matchMap[msg.matchId];
        }
    }

    handleClaimMessage(msg: MatchClaimMessage) {
        console.log("Matcher: Got claim message")
        if (this.matchMap[msg.matchId]) {
            for (var c in this.matchMap[msg.matchId].claimsSeen) {
                if (this.matchMap[msg.matchId].claimsSeen[c][0].equals(msg.user)) {
                    return;
                }
            }

            this.matchMap[msg.matchId].claimsSeen.push([msg.user, msg.counter])
            this.raiseUpdateEvent(msg.matchId);
        }
    }

    handleAckMessage(msg: MatchAckMessage) {
        console.log("Matcher: Got Ack message")
        if (this.matchMap[msg.matchId]) {
            const match = this.matchMap[msg.matchId];

            for (var a in match.acksSeen) {
                if (match.acksSeen[a].equals(msg.user)) {
                    return;
                }
            }
            match.acksSeen.push(msg.user)
            this.raiseUpdateEvent(msg.matchId);
            this.remove(msg.matchId);
        }
    }

    remove(matchId: string) {
        delete this.matchMap[matchId];
    }

    raiseUpdateEvent(matchId: string) {
        for (var l in this.listeners) {
            try {
                this.listeners[l](this.matchMap[matchId]);
            } catch (e: any) {
                console.log("Matcher: Exception in stateUpdateEvent")
                console.log(e)
            }
        }
    }

    checkTimeouts(time: number) {
        const t = (new Date()).getTime();
        for (var m in this.matchMap) {
            if ((t - this.matchMap[m].lastSeen) > ADVERTISE_TIMEOUT) {
                delete this.matchMap[m];
            }
        }
    }

    addListener(listener: MatchEventListener) {
        this.listeners.push(listener)
    }
}

export enum MatchAgentsStates {
    IDLE = 0,
    SERVING_WAITING_CLAIMS,
    JOINING_WAITING_ACK
};

export class MatchResult {
    match: MatchState | null = null;

    constructor(match: MatchState | null) {
        this.match = match;
    }
}

export class MatchAgent {
    id: PublicKey;
    state: MatchAgentsStates = MatchAgentsStates.IDLE;
    counter: number;
    lastActionStart: number = 0;
    targetMatch: string | null = null;
    matchId: string | null = null;
    manager: MatchManager;
    matchCallback: ((result: MatchResult) => void) | null = null;

    constructor(manager: MatchManager, id: PublicKey, counter: number = 0) {
        this.manager = manager;
        this.id = id;
        this.counter = counter;
    }

    clearState() {
        this.state = MatchAgentsStates.IDLE;
        this.matchId = null;
        this.targetMatch = null;
        this.matchCallback = null;
    }

    restartMatch() {
        if (this.state == MatchAgentsStates.IDLE || !this.targetMatch || !this.matchCallback) {
            return;
        }
        this.state = MatchAgentsStates.IDLE
        this.startMatch(this.targetMatch, this.counter, this.matchCallback);
    }

    startMatch(targetMatch: string, counter: number, matchCallback: (result: MatchResult) => void): boolean {
        console.log("Matcher: Starting match: " + targetMatch)
        if (this.state != MatchAgentsStates.IDLE) {
            // Cannot start matching, already matching
            console.log("Matcher: Can't start match, not IDLE")
            return false;
        }
        this.counter = counter;
        this.targetMatch = targetMatch;
        this.matchCallback = matchCallback;
        this.matchId = null;

        // Check if there is already a match that we can try to join
        // Randomise order for better matching with more peers
        const items = Object.entries(this.manager.matchStateManager.matchMap);
        const randomItems = items.sort((a,b) => {return Math.random() - 0.5});

        for (var m in randomItems) {
            var match = randomItems[m][1];
            if (match.match == this.targetMatch && (!match.advertiser.equals(this.id)) && (match.acksSeen.length == 0)) {
                console.log("Matcher: Joining existing game with id: " + match.matchId)
                this.state = MatchAgentsStates.JOINING_WAITING_ACK;
                this.lastActionStart = (new Date()).getTime();
                this.manager.sendClaimMessage(new MatchClaimMessage(
                    match.matchId,
                    this.id,
                    this.counter
                ))
                this.matchId = match.matchId;
                console.log("Matcher: Set match ID " + this.matchId)
                return true;
            }
        }

        console.log("Matcher: Advertising game")
        // Or start to advertise our own match
        this.matchId = getMatchID(this.id, targetMatch);
        console.log("Matcher: Setting matchId " + this.matchId)
        this.state = MatchAgentsStates.SERVING_WAITING_CLAIMS;
        this.lastActionStart = (new Date()).getTime();
        this.manager.sendAdvertiseMessage(new MatchAdvertiseMessage(
            this.id,
            this.targetMatch,
            this.counter
        ))

        return true;
    }

    stopMatch() {
        if (this.state == MatchAgentsStates.IDLE) {
            // Cannot stop matching, not matching

        } else if (this.state == MatchAgentsStates.SERVING_WAITING_CLAIMS) {
            if (this.matchId) {
                this.manager.sendUnadvertiseMessage(new MatchUnadvertiseMessage(
                    this.matchId
                ))
            }

            this._matchCallback(new MatchResult(null));
            this.clearState();
        } else if (this.state == MatchAgentsStates.JOINING_WAITING_ACK) {
            this._matchCallback(new MatchResult(null));
            this.clearState();
        }
    }

    handleMatchStateUpdate(matchState: MatchState) {
        if (this.matchId != matchState.matchId) {
            // This is not state for the current match
            //console.log("Matcher: Wrong matchId " + this.matchId + " " + matchState.matchId)
            return;
        }

        console.log("Matcher: Handling match state update in state: " + MatchAgentsStates[this.state])

        if (this.state == MatchAgentsStates.SERVING_WAITING_CLAIMS) {
            if (matchState.claimsSeen.length != 0) {
                this.manager.sendAckMessage(new MatchAckMessage(
                    this.matchId,
                    matchState.claimsSeen[0][0]
                ))
                this.manager.matchStateManager.remove(matchState.matchId)
                try {
                    this._matchCallback(new MatchResult(matchState));
                } catch (e: any) {
                    console.log("Matcher: Exception in match callback: ")
                    console.log(e)
                }
                this.clearState();
            }
        } else if (this.state == MatchAgentsStates.JOINING_WAITING_ACK) {
            if (matchState.acksSeen.length != 0) {
                if (this.id.equals(matchState.acksSeen[0])) {
                    this.manager.matchStateManager.remove(matchState.matchId)
                    try {
                        this._matchCallback(new MatchResult(matchState));
                    } catch (e: any) {
                        console.log("Matcher: Exception in match callback: ")
                        console.log(e)
                    }
                    this.clearState();
                } else {
                    console.log("Matcher: Restarting")
                    this.restartMatch();
                }
            }
        } else {
            console.log("Matcher: Bad state")
        }
    }

    _matchCallback(result: MatchResult) {
        if (this.matchCallback) {
            this.matchCallback(result);
        }
    }

    poll(time: number) {
        if (this.state == MatchAgentsStates.SERVING_WAITING_CLAIMS) {
            if (time - this.lastActionStart > SERVING_REBROADCAST_TIMEOUT) {
                console.log("Matcher: Timed out creating game")
                this.restartMatch();
            }
        } else if (this.state == MatchAgentsStates.JOINING_WAITING_ACK) {
            if (this.matchId && !this.manager.matchStateManager.matchMap[this.matchId]) {
                console.log("Matcher: Invalid game")
                this.restartMatch();
            } else if (this.matchId && this.manager.matchStateManager.matchMap[this.matchId].acksSeen.length > 0) {
                if (!this.manager.matchStateManager.matchMap[this.matchId].acksSeen[0].equals(this.id)) {
                    console.log("Matcher: Not in game")
                    this.restartMatch();
                }
            } else if (time - this.lastActionStart > CLAIM_ACK_TIMEOUT) {
                console.log("Matcher: Timed out waiting for ack")
                this.restartMatch();
            }
        }
    }
}

export class MatchManager {
    pubSub: IRoundPubSub;
    matchStateManager: MatchStateManager;
    matchAgent: MatchAgent;
    listeners: MatchEventListener[] = [];

    constructor(roundNet: IRoundPubSub, id: PublicKey) {
        this.pubSub = roundNet;
        this.pubSub.sub(MATCH_ADVERTISE_PUBSUB_CHANNEL, msg => {
            this._handleAdvertiseMessage(msg)
        });
        this.pubSub.sub(MATCH_UNADVERTISE_PUBSUB_CHANNEL, msg => {
            this._handleUnadvertiseMessage(msg)
        });
        this.pubSub.sub(MATCH_CLAIM_PUBSUB_CHANNEL, msg => {
            this._handleClaimMessage(msg)
        });
        this.pubSub.sub(MATCH_ACK_PUBSUB_CHANNEL, msg => {
            this._handleAckMessage(msg)
        });

        this.matchAgent = new MatchAgent(this, id);
        this.matchStateManager = new MatchStateManager();
        this.matchStateManager.addListener(state => {
            this.matchAgent.handleMatchStateUpdate(state);
        })

        setInterval(() => {
            this.matchAgent.poll((new Date()).getTime())
        }, 100);

        setInterval(() => {
            this.matchStateManager.checkTimeouts((new Date()).getTime())
        }, 2000);
    }

    _handleAdvertiseMessage(msg: any) {
        try {
            const msgData = new TextDecoder().decode(msg.data);
            var aMsg = MatchAdvertiseMessage.deserialise(JSON.parse(msgData));
            this.matchStateManager.handleAdvertiseMessage(aMsg)
        } catch (e: any) {
            console.log("Matcher: Exception whilst handling Advertise Message")
            console.log(e)
        }
    }

    _handleUnadvertiseMessage(msg: any) {
        try {
            const msgData = new TextDecoder().decode(msg.data);
            const uMsg = MatchUnadvertiseMessage.deserialise(JSON.parse(msgData));
            this.matchStateManager.handleUnadvertiseMessage(uMsg)
        } catch (e: any) {
            console.log("Matcher: Exception whilst handling Unadvertise Message")
            console.log(e)
        }
    }

    _handleClaimMessage(msg: any) {
        try {
            const msgData = new TextDecoder().decode(msg.data);
            const cMsg = MatchClaimMessage.deserialise(JSON.parse(msgData));
            this.matchStateManager.handleClaimMessage(cMsg)
        } catch (e: any) {
            console.log("Matcher: Exception whilst handling Claim Message")
            console.log(e)
        }
    }

    _handleAckMessage(msg: any) {
        try {
            const msgData = new TextDecoder().decode(msg.data);
            const ackMsg = MatchAckMessage.deserialise(JSON.parse(msgData));
            this.matchStateManager.handleAckMessage(ackMsg)
        } catch (e: any) {
            console.log("Matcher: Exception whilst handling Ack Message")
            console.log(e)
        }
    }

    sendAdvertiseMessage(msg: MatchAdvertiseMessage) {
        const encoded = new TextEncoder().encode(JSON.stringify(msg.serialise()))
        this.pubSub.pub(
            MATCH_ADVERTISE_PUBSUB_CHANNEL,
            encoded
        );
        this._handleAdvertiseMessage({ data: encoded });
    }

    sendUnadvertiseMessage(msg: MatchUnadvertiseMessage) {
        const encoded = new TextEncoder().encode(JSON.stringify(msg.serialise()))
        this.pubSub.pub(
            MATCH_UNADVERTISE_PUBSUB_CHANNEL,
            encoded
        );
        this._handleUnadvertiseMessage({ data: encoded });
    }

    sendClaimMessage(msg: MatchClaimMessage) {
        const encoded = new TextEncoder().encode(JSON.stringify(msg.serialise()))
        this.pubSub.pub(
            MATCH_CLAIM_PUBSUB_CHANNEL,
            encoded
        );
        this._handleClaimMessage({ data: encoded });
    }

    sendAckMessage(msg: MatchAckMessage) {
        const encoded = new TextEncoder().encode(JSON.stringify(msg.serialise()))
        this.pubSub.pub(
            MATCH_ACK_PUBSUB_CHANNEL,
            encoded
        );
        this._handleAckMessage({ data: encoded });
    }

    addMatchStateListener(listener: MatchEventListener) {
        this.matchStateManager.addListener(listener)
    }
}
