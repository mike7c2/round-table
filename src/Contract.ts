import { Connection, PublicKey, TransactionInstruction, SystemProgram, VoteAuthorizationLayout, Commitment, Transaction } from "@solana/web3.js"
import BN from "bn.js";
import { deserializeUnchecked, serialize } from "borsh"

export const PROGRAM_ID = new PublicKey("FYkpPVwm9AwTgM8XmYjsK33DZsJZQVVZPNwxGrqvAmVr");

export function getTableAddress(owner: PublicKey, program_id: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([owner.toBytes()], program_id);
}

export function getTableServersAddress(owner: PublicKey, program_id: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([new TextEncoder().encode("servers"), owner.toBytes()], program_id);
}

export function getTableChannelsAddress(owner: PublicKey, program_id: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([new TextEncoder().encode("channels"), owner.toBytes()], program_id);
}

export function getSeatAddress(table: PublicKey, user: PublicKey, program_id: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([table.toBytes(), user.toBytes()], program_id);
}

export class RoundTableTableData {
    tableId: Uint8Array;
    authority: Uint8Array;
    closed: boolean;

    constructor(args: {
        tableId: Uint8Array,
        authority: Uint8Array,
        closed: boolean
    }) {
        this.tableId = args.tableId
        this.authority = args.authority
        this.closed = args.closed
    }
}
export const RoundTableTableDataDefault = new RoundTableTableData({
    tableId: new Uint8Array(32),
    authority: new Uint8Array(32),
    closed: false
})
export const RoundTableTableDataSchema = new Map([[RoundTableTableData, {
    kind: 'struct',
    fields: [
        ['tableId', [32]],
        ['authority', [32]],
        ['closed', 'u8']
    ]
}]]);
export function tableDeserialize(data: Buffer) {
    return deserializeUnchecked(RoundTableTableDataSchema, RoundTableTableData, data);
}

export class RoundTableInitTableArgsData {
    channelsLen: BN;
    serversLen: BN;
    authority: Uint8Array;
    closed: boolean;

    constructor(args: {
        channelsLen: BN,
        serversLen: BN,
        authority: Uint8Array,
        closed: boolean
    }) {
        this.channelsLen = args.channelsLen
        this.serversLen = args.serversLen
        this.authority = args.authority
        this.closed = args.closed
    }
}
export const RoundTableInitTableArgsDataDefault = new RoundTableInitTableArgsData({
    channelsLen: new BN(0),
    serversLen: new BN(0),
    authority: new Uint8Array(32),
    closed: false
})
export const RoundTableInitTableArgsDataSchema = new Map([[RoundTableInitTableArgsData, {
    kind: 'struct',
    fields: [
        ['channelsLen', 'u32'],
        ['serversLen', 'u32'],
        ['authority', [32]],
        ['closed', 'u8']
    ]
}]]);
function initTableArgsSerialize(data : RoundTableInitTableArgsData) {
    return Buffer.from(serialize(RoundTableInitTableArgsDataSchema, data));
}


export class RoundTableSeatData {
    tableId: Uint8Array;
    owner: Uint8Array;
    channelPubkey: Uint8Array;

    constructor(args: {
        tableId: Uint8Array,
        owner: Uint8Array,
        channelPubkey: Uint8Array
    }) {
        this.tableId = args.tableId
        this.owner = args.owner
        this.channelPubkey = args.channelPubkey
    }
}
export const RoundTableSeatDataDefault = new RoundTableSeatData({
    tableId: new Uint8Array(32),
    owner: new Uint8Array(32),
    channelPubkey: new Uint8Array(32)
})
export const RoundTableSeatDataSchema = new Map([[RoundTableSeatData, {
    kind: 'struct',
    fields: [
        ['tableId', [32]],
        ['owner', [32]],
        ['channelPubkey', [32]],
    ]
}]]);
export function seatDeserialize(data: Buffer) {
    return deserializeUnchecked(RoundTableSeatDataSchema, RoundTableSeatData, data);
}

export async function getSeatData(connection: Connection, owner: PublicKey, user: PublicKey, programId: PublicKey): Promise<RoundTableSeatData | null> {
    var table = (await getTableAddress(owner, programId))[0];
    var pda = await getSeatAddress(table, user, programId);
    const acc = await connection.getAccountInfo(pda[0])
    if (!acc || !acc.data) {
        return null;
    }
    return seatDeserialize(acc.data);
}

export async function getTableData(connection: Connection, owner: PublicKey, programId: PublicKey): Promise<any | null> {
    var pda = await getTableAddress(owner, programId);
    var serversPda = await getTableServersAddress(owner, programId);
    var channelsPda = await getTableChannelsAddress(owner, programId);
    const acc = await connection.getMultipleAccountsInfo([pda[0], serversPda[0], channelsPda[0]]);

    if (!acc[0] || acc[0].data || !acc[1] || !acc[1].data || !acc[2] || !acc[2].data) {
        return null;
    }

    const rawTable = tableDeserialize(acc[0].data);
    const bootstraps = new TextDecoder().decode(acc[1].data).replace(/\0/g, '').split(";");
    const channels = new TextDecoder().decode(acc[2].data).replace(/\0/g, '').split(";");
    bootstraps.splice(0, 1)
    channels.splice(0, 1)

    return {
        servers: bootstraps,
        channels: channels,
        authority: rawTable.authority,
        closed: rawTable.closed
    }
}

enum RoundTableInstructions {
    InitTable = 0,
    DeleteTable = 1,
    AddBoostrap = 2,
    DeleteBootstrap = 3,
    AddChannel = 4,
    DeleteChannel = 5,
    AddSeat = 6,
    DeleteSeat = 7
}

export async function makeInitTableIx(user: PublicKey, serversLen: BN, channelsLen: BN, authority: PublicKey, closed: boolean, programId: PublicKey) : Promise<TransactionInstruction> {
    const table_pda = (await getTableAddress(user, programId))[0];
    const tableServersPda = (await getTableServersAddress(user, programId))[0];
    const tableChannelsPda = (await getTableChannelsAddress(user, programId))[0];

    return new TransactionInstruction({
        
        data: new Buffer([RoundTableInstructions.InitTable, initTableArgsSerialize({
            serversLen: serversLen,
            channelsLen: channelsLen,
            authority: authority.toBytes(),
            closed: closed
        })]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: tableServersPda, isSigner: false, isWritable: true },
            { pubkey: tableChannelsPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export async function makeDeleteTableIx(user: PublicKey, programId: PublicKey) : Promise<TransactionInstruction> {
    const table_pda = (await getTableAddress(user, programId))[0];
    const tableServersPda = (await getTableServersAddress(user, programId))[0];
    const tableChannelsPda = (await getTableChannelsAddress(user, programId))[0];

    return new TransactionInstruction({
        data: new Buffer([RoundTableInstructions.DeleteTable]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: tableServersPda, isSigner: false, isWritable: true },
            { pubkey: tableChannelsPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export async function makeAddBoostrapIx(user: PublicKey, bootstrap: string, programId: PublicKey) : Promise<TransactionInstruction> {
    const table_pda = (await getTableAddress(user, programId))[0];
    const tableServersPda = (await getTableServersAddress(user, programId))[0];

    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(bootstrap));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.AddBoostrap]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: tableServersPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export async function makeDeleteBoostrapIx(user: PublicKey, bootstrap: string, programId: PublicKey) : Promise<TransactionInstruction> {
    const table_pda = (await getTableAddress(user, programId))[0];
    const tableServersPda = (await getTableServersAddress(user, programId))[0];

    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(bootstrap));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.DeleteBootstrap]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: tableServersPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export async function makeAddChannelIx(user: PublicKey, channel: string, programId: PublicKey) : Promise<TransactionInstruction> {
    const table_pda = (await getTableAddress(user, programId))[0];
    const tableChannelsPda = (await getTableChannelsAddress(user, programId))[0];

    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(channel));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.AddChannel]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: tableChannelsPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export async function makeDeleteChannelIx(user: PublicKey, channel: string, programId: PublicKey) : Promise<TransactionInstruction> {
    const table_pda = (await getTableAddress(user, programId))[0];
    const tableChannelsPda = (await getTableChannelsAddress(user, programId))[0];

    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(channel));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.DeleteChannel]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: tableChannelsPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export async function makeAddSeatIx(user: PublicKey, tableAuthority: PublicKey, tableOwner: PublicKey, channelPubkey: PublicKey, programId: PublicKey) : Promise<TransactionInstruction> {
    const tablePda = (await getTableAddress(tableOwner, programId))[0];
    const seatPda = (await getSeatAddress(tablePda, user, programId))[0];

    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.AddSeat]), channelPubkey.toBytes()]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: tableAuthority, isSigner: false, isWritable: false },
            { pubkey: tableOwner, isSigner: false, isWritable: false },
            { pubkey: tablePda, isSigner: false, isWritable: false },
            { pubkey: seatPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export async function makeRemoveSeatIx(user: PublicKey, tableAuthority: PublicKey, tableOwner: PublicKey, programId: PublicKey) : Promise<TransactionInstruction> {
    const tablePda = (await getTableAddress(tableOwner, programId))[0];
    const seatPda = (await getSeatAddress(tablePda, user, programId))[0];

    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.DeleteSeat])]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: tableAuthority, isSigner: false, isWritable: false },
            { pubkey: tableOwner, isSigner: false, isWritable: false },
            { pubkey: tablePda, isSigner: false, isWritable: false },
            { pubkey: seatPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: programId
    })
}

export class RoundTableContractClient {
    programId : PublicKey;

    constructor(
        programId : PublicKey,
    ) {
        this.programId = programId;
    }

    getTableAddress(owner: PublicKey): Promise<[PublicKey, number]> {
        return getTableAddress(owner, this.programId);
    }
    
    getTableServersAddress(owner: PublicKey): Promise<[PublicKey, number]> {
        return getTableServersAddress(owner, this.programId);
    }
    
    getTableChannelsAddress(owner: PublicKey): Promise<[PublicKey, number]> {
        return getTableChannelsAddress(owner, this.programId);
    }
    
    getSeatAddress(table: PublicKey, user: PublicKey): Promise<[PublicKey, number]> {
        return getSeatAddress(table, user, this.programId)
    }

    getSeatData(connection: Connection, owner: PublicKey, user: PublicKey): Promise<RoundTableSeatData | null> {
        return getSeatData(connection, owner, user, this.programId)
    }
    
    getTableData(connection: Connection, owner: PublicKey): Promise<any | null> {
        return getTableData(connection, owner, this.programId)
    }

    makeInitTableIx(user: PublicKey, serversLen: BN, channelsLen: BN, authority: PublicKey, closed: boolean) : Promise<TransactionInstruction> {
        return makeInitTableIx(user, serversLen, channelsLen, authority, closed, this.programId);
    }
    
    makeDeleteTableIx(user: PublicKey) : Promise<TransactionInstruction> {
        return makeDeleteTableIx(user, this.programId)
    }
    
    makeAddBoostrapIx(user: PublicKey, bootstrap: string) : Promise<TransactionInstruction> {
        return makeAddBoostrapIx(user, bootstrap, this.programId)
    }
    
    makeDeleteBoostrapIx(user: PublicKey, bootstrap: string) : Promise<TransactionInstruction> {
        return makeDeleteBoostrapIx(user, bootstrap, this.programId)
    }
    
    makeAddChannelIx(user: PublicKey, channel: string) : Promise<TransactionInstruction> {
        return makeAddChannelIx(user, channel, this.programId)
    }
    
    makeDeleteChannelIx(user: PublicKey, channel: string) : Promise<TransactionInstruction> {
        return makeDeleteChannelIx(user, channel, this.programId)
    }
    
    makeAddSeatIx(user: PublicKey, tableAuthority: PublicKey, tableOwner: PublicKey, channelPubkey: PublicKey) : Promise<TransactionInstruction> {
        return makeAddSeatIx(user, tableAuthority, tableOwner, channelPubkey, this.programId)
    }
    
    makeRemoveSeatIx(user: PublicKey, tableAuthority: PublicKey, tableOwner: PublicKey) : Promise<TransactionInstruction> {
        return makeRemoveSeatIx(user, tableAuthority, tableOwner, this.programId)
    }
}