/**
 * Simple chat client. Uses a single pubsub channel to send and receive chat messages
 */
import { IRoundPubSub } from './RoundTable'
import { PublicKey } from "@solana/web3.js"

export const CHAT_PUBSUB_CHANNEL = "-chat";

function sanitise(unsafe: string) {
    return unsafe.slice(0, 160);
}

export type ChatEventListener = (msg: ChatMessage) => void;

export class ChatMessage {
    user: string;
    msg: string;
    time: string;
    constructor(
        user: string,
        msg: string,
        time: string
    ) {
        this.user = user;
        this.msg = msg;
        this.time = time;
    }
}

export class ChatManager {
    pubSub: IRoundPubSub;
    chatLog: ChatMessage[] = [];
    entries: number = 20;
    listeners: ChatEventListener[] = [];
    id: PublicKey;
    netName: string;

    constructor(pubSub: IRoundPubSub, netName: string, id: PublicKey) {
        this.pubSub = pubSub;
        this.id = id;
        this.netName = netName;
        console.log("CHAT: Using channel " + netName + CHAT_PUBSUB_CHANNEL)
        this.pubSub.sub(netName + CHAT_PUBSUB_CHANNEL, msg => {
            this._handleChatMessage(msg)
        });
    }

    _handleChatMessage(msg: any) {
        const msgData = new TextDecoder().decode(msg.data);
        const chatMsg: ChatMessage = JSON.parse(msgData);
        this.handleMessage(chatMsg)
    }

    handleMessage(pMsg: ChatMessage) {
        this.chatLog.push(pMsg);
        if (this.chatLog.length > this.entries) {
            this.chatLog = this.chatLog.slice(1)
        }
        for (var m in this.listeners) {
            this.listeners[m](pMsg);
        }
    }

    getChatLog(): ChatMessage[] {
        return this.chatLog;
    }

    sendChatMessage(msg: string) {
        const chatMsg = new ChatMessage(this.id.toString(), sanitise(msg), (new Date()).toLocaleTimeString());
        const msgData = new TextEncoder().encode(JSON.stringify(chatMsg))
        this.pubSub.pub(this.netName + CHAT_PUBSUB_CHANNEL, msgData);
        this.handleMessage(chatMsg)
    }

    addChatListener(listener: ChatEventListener) {
        this.listeners.push(listener)
    }
}