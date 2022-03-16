
import PeerId from "peer-id"
import crypto from "libp2p-crypto"
import { getDefaultConfig, getP2PNode } from "./p2p"
import { RoundTable } from "./RoundTable"
import { PublicKey } from "@solana/web3.js"

/**
 * Setup roundtable instance with default config and instance key derived from
 * user provided public ID.
 * @param  {PublicKey} id   PublicKey ID to use with RoundTable
 * @param  {PublicKey} sig  Signature data to generate instance key
 * @return {[RoundTable]}    Initialised RoundTable instance
 */
export async function setupRoundTable(id: PublicKey, sig: Uint8Array, netName: string) {
    var cfg: any = getDefaultConfig();
    cfg.peerId = await PeerId.createFromPrivKey(
        crypto.keys.marshalPrivateKey(
            await crypto.keys.generateKeyPairFromSeed("Ed25519", sig.slice(0, 32), 512)
        ));
    const node = await getP2PNode(cfg);
    return new RoundTable(node, id, netName);
}