import { RoundTable, initRoundTable } from "../src/RoundTable";
import { Keypair, PublicKey, Connection } from "@solana/web3.js"

function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function setup() {
    const connection: Connection = new Connection("https://api.devnet.solana.com")
    const tableOwner: PublicKey = new PublicKey("69GoySbK6vc9QyWsCYTMUjpQXCocbDJansszPTEaEtMp")
    const id: PublicKey = new PublicKey("DRSRtpAcN9emERXqjVLtLb5iCWDWt9VJ2LzVpUfuuKZ8")
    const channelId: Keypair = new Keypair();
    const netName: string = "round-table"

    const table = await initRoundTable(
        connection,
        id,
        channelId,
        tableOwner,
        netName
    )

    while (1) {
        await delay(5000 + (Math.floor(Math.random() * 4000) - 200));
        var active = true;
        table.findMatch("test", 0, result => {
            console.log(result)
            active = false;
        })

        while (active) {
            await delay(1000);
        }
    }
}

setup().then(x => {
    console.log("Done")
});


