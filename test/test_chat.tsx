import { getP2PNode } from "../src/p2p";
import { RoundTable, ChatMessage } from "../src/";
import { PublicKey } from "@solana/web3.js"

function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function setup() {
    const node = await getP2PNode();

    var net = new RoundTable(node, new PublicKey(process.argv[2]), "round-table");
    function chatCallback(msg: ChatMessage) {
        console.log(msg)
    }
    net.addChatListener(chatCallback)
    while (1) {
        await delay(5000 + (Math.floor(Math.random() * 4000) - 200));
        console.log(process.argv[2] + " sending message")

        net.sendChatMessage("Blarg!")
    }
}

setup().then(x => {
    console.log("Done")
});


