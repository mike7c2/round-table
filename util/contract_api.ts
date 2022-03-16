import { getTableData, getSeatData, PROGRAM_ID, makeInitTableIx, makeDeleteTableIx,
    makeAddBoostrapIx, makeDeleteBoostrapIx , makeAddChannelIx, makeDeleteChannelIx,
    makeAddSeatIx, makeRemoveSeatIx } from "../src/Contract";
import {Connection, PublicKey, Transaction, Keypair, TransactionInstruction, sendAndConfirmTransaction} from "@solana/web3.js"
import BN from 'bn.js';
import { readFileSync } from 'fs';

//var connection = new Connection("http://localhost:8899/");
var connection = new Connection("https://api.devnet.solana.com");
const getOperations : any = {
    "getTableData": [getTableData, [PublicKey]],
    "getSeatData": [getSeatData, [PublicKey, PublicKey]]
}

const txOperations : any = {
    "createTable": [makeInitTableIx, [PublicKey, Boolean]],
    "deleteTable": [makeDeleteTableIx, [PublicKey]],
    "addBootstrap": [makeAddBoostrapIx, [PublicKey, String]],
    "deleteBootstrap": [makeDeleteBoostrapIx, [PublicKey, String]],
    "addChannel": [makeAddChannelIx, [PublicKey, String]],
    "deleteChannel": [makeDeleteChannelIx, [PublicKey, String]],
    "addSeat": [makeAddSeatIx, [PublicKey, PublicKey, PublicKey]],
    "deleteSeat": [makeRemoveSeatIx, [PublicKey, PublicKey]],
}

function keyPairFromFile(file : string) : Keypair {
    const keyFile = readFileSync(file, 'utf-8');
    const id = Keypair.fromSecretKey(new Uint8Array(JSON.parse(keyFile)))
    return id;    
}

async function run() {
    if (getOperations[process.argv[2]]) {
        var args_list : any = [connection];

        const func = getOperations[process.argv[2]];
        for (var i = 0; i < func[1].length; i++) {
            try {
                args_list.push(new func[1][i](process.argv[3+i]));
            } catch {
                console.log("Error parsing argument " + i.toString() + " as type " + func[1][i].name + " with value " + process.argv[3+i])
                throw "OMFG";
            }
        }
        func[0](...args_list).then( (result:any) => {
            console.log(result);
        });
    } else if (txOperations[process.argv[2]]) {
        const id = keyPairFromFile(process.argv[3])
        console.log("Keypair: " + id.publicKey.toString())
        var args_list : any = [];
        const func = txOperations[process.argv[2]];
        for (var i = 0; i < func[1].length; i++) {
            try {
                args_list.push(new func[1][i](process.argv[4+i]));
            } catch {
                console.log("Error parsing argument " + i.toString() + " as type " + func[1][i].name + " with value " + process.argv[3+i])
                throw "OMFG";
            }
        }

        func[0](...args_list).then( (ix:TransactionInstruction) => {
            connection.getLatestBlockhash().then((bh) => {
                const transaction = new Transaction({
                    feePayer: id.publicKey,
                    recentBlockhash: bh.blockhash
                });
                transaction.add(ix)

                sendAndConfirmTransaction(
                    connection,
                    transaction,
                    [id]
                ).then( (sig : string) => {
                    console.log("Sent transaction!")
                    console.log(sig)
                } );
            })
        });
    } else {
        console.log("Invalid command")
    }
}

run().then(() => {console.log("Done")})