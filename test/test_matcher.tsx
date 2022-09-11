import { getP2PNode } from "../src/p2p";
import { RoundTable } from "../src/RoundTable";
import { Keypair, PublicKey } from "@solana/web3.js"

function delay(time : number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

async function setup() {
    const node = await getP2PNode();
    var id;
    if ( process.argv[2] ) {
        id = new PublicKey(process.argv[2])
    } else {
        id = new Keypair().publicKey;
    }
    var matchType;
    if (process.argv[3] ) {
        matchType = process.argv[3]
    } else {
        matchType = "test"
    }
    var net = new RoundTable(node, id, "dc-devnet");

    //while (1) {
        await delay(5000 +  (Math.floor(Math.random() * 4000)-200));
        var active = true;
        net.findMatch(matchType, 0, result => {
            console.log(result)
            active = false;
        })

        while (active) {
            await delay(1000);
        }
    //}
}

setup().then(x => {
    console.log("Done")
});


