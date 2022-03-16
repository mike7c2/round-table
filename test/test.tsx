import { getP2PNode } from "../lib/p2p";
import { RoundTable } from "../lib/RoundTable";
import { PublicKey } from "@solana/web3.js"

getP2PNode().then(node => {
    var id = new PublicKey("BBzshbppLmSfjZFM99on4baRThpzHD4X17ooLSVyN2pR")
    var net = new RoundTable(node, id);
});



