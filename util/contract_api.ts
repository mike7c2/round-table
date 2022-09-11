import { RoundTableContractClient, RoundTableTableData } from "../src/Contract";
import { Connection, PublicKey, Transaction, Keypair, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js"
import BN from 'bn.js';
import { readFileSync } from 'fs';

export const PROGRAM_ID = new PublicKey("FYkpPVwm9AwTgM8XmYjsK33DZsJZQVVZPNwxGrqvAmVr");

var contractClient = new RoundTableContractClient(PROGRAM_ID)

const getOperations : { [matchId: string]: any[]; } = {
    "getTableData": [contractClient.getTableData, [PublicKey], ["Table ID"]],
    "getSeatData": [contractClient.getSeatData, [PublicKey, PublicKey], ["Table ID", "User ID"]]
}

const txOperations : any = {
    "createTable": [contractClient.makeInitTableIx, [PublicKey, BN, BN, PublicKey, Boolean], ["Table ID", "Length of servers", "Length of channels", "Authority ID", "Closed"]],
    "deleteTable": [contractClient.makeDeleteTableIx, [PublicKey], ["Table ID"]],
    "addBootstrap": [contractClient.makeAddBoostrapIx, [PublicKey, String], ["Table ID", "Server address"]],
    "deleteBootstrap": [contractClient.makeDeleteBoostrapIx, [PublicKey, String], ["Table ID", "Server address"]],
    "addChannel": [contractClient.makeAddChannelIx, [PublicKey, String], ["Table ID", "Channel"]],
    "deleteChannel": [contractClient.makeDeleteChannelIx, [PublicKey, String], ["Table ID", "Channel"]],
    "addSeat": [contractClient.makeAddSeatIx, [PublicKey, PublicKey, PublicKey, PublicKey], ["User ID", "Authority ID", "Table ID", "Channel ID"]],
    "deleteSeat": [contractClient.makeRemoveSeatIx, [PublicKey, PublicKey, PublicKey], ["User ID", "Authority ID", "Table ID"]],
}

function makeHelp() : String {
    var help = ""
    help += "RoundTable Contract Client\n"
    help += "\n"
    help += "The client can be used to administer and query data from round table instances\n"
    help += "First argument is always rpc url"
    help += "\n"
    help += "Getters:\n"
    for (var k in getOperations) {
        help += "    " + k + "["
        for (var j in getOperations[k][1]) {
            help += getOperations[k][2][j] + ":" + getOperations[k][1][j].name + ", "
        }
        help = help.substring(0, help.length-2)
        help += " ]\n"
    }
    help += "\nContract calls:\n"
    for (var k in txOperations) {
        help += "    " + k + "[ KeypairPath:String, "
        for (var j in txOperations[k][1]) {
            help += txOperations[k][2][j] + ":" + txOperations[k][1][j].name + ", "
        }
        help = help.substring(0, help.length-2)
        help += " ]\n"
    }
    return help;
}

function keyPairFromFile(file : string) : Keypair {
    const keyFile = readFileSync(file, 'utf-8');
    const id = Keypair.fromSecretKey(new Uint8Array(JSON.parse(keyFile)))
    return id;    
}

async function run() {
    var connection = new Connection(process.argv[2], "confirmed");

    if (getOperations[process.argv[3]]) {
        var args_list : any = [connection];

        const func = getOperations[process.argv[3]];
        for (var i = 0; i < func[1].length; i++) {
            try {
                args_list.push(new func[1][i](process.argv[4+i]));
            } catch {
                console.log("Error parsing argument " + process.argv[4+i] + " as type " + func[1][i].name + " with value " + process.argv[3+i])
                throw "OMFG";
            }
        }
        console.log(args_list)
        func[0](...args_list).then( (result:any) => {
            console.log(result);
        });
    } else if (txOperations[process.argv[3]]) {
        const id = keyPairFromFile(process.argv[4])
        console.log("Keypair: " + id.publicKey.toString())
        var args_list : any = [];
        const func = txOperations[process.argv[3]];
        for (var i = 0; i < func[1].length; i++) {
            try {
                args_list.push(new func[1][i](process.argv[5+i]));
            } catch {
                console.log("Error parsing argument " + process.argv[5+i] + " as type " + func[1][i].name + " with value " + process.argv[3+i])
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
        console.log(makeHelp())
    }
}

run().then(() => {console.log("Complete")}).catch(err => {
    console.log("Encountered error: " + err.toString())
    console.log(makeHelp())
})