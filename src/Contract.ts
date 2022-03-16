import { Connection, PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js"
import { deserializeUnchecked, serialize } from "borsh"

export const PROGRAM_ID = new PublicKey("7XefegQxy2HCgTcfx94snboYAhAvfrggcvAwyLBffSUw");

export function getTableAddress(owner: PublicKey, program_id: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([owner.toBytes()], program_id);
}

export function getSeatAddress(table: PublicKey, user: PublicKey, program_id: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress([table.toBytes(), user.toBytes()], program_id);
}

export class RoundTableTableData {
    servers: Uint8Array;
    channels: Uint8Array;
    closed: boolean;

    constructor(args: {
        servers: Uint8Array,
        channels: Uint8Array,
        closed: boolean
    }) {
        this.servers = args.servers;
        this.channels = args.channels;
        this.closed = args.closed
    }
}
export const RoundTableTableDataDefault = new RoundTableTableData({
    servers: new Uint8Array(512),
    channels: new Uint8Array(512),
    closed: false
})
export const RoundTableTableDataSchema = new Map([[RoundTableTableData, {
    kind: 'struct',
    fields: [
        ['servers', [512]],
        ['channels', [512]],
        ['closed', 'u8']
    ]
}]]);
export function tableDeserialize(data: Buffer) {
    return deserializeUnchecked(RoundTableTableDataSchema, RoundTableTableData, data);
}
export async function getTableData(connection: Connection, owner: PublicKey): Promise<any | null> {
    var pda = await getTableAddress(owner, PROGRAM_ID);
    const acc = await connection.getAccountInfo(pda[0])

    if (!acc || !acc.data) {
        return null;
    }

    const rawTable = tableDeserialize(acc.data);
    const bootstraps = new TextDecoder().decode(rawTable.servers).replace(/\0/g, '').split(";");
    const channels = new TextDecoder().decode(rawTable.channels).replace(/\0/g, '').split(";");
    bootstraps.splice(0, 1)
    channels.splice(0, 1)

    return {
        servers: bootstraps,
        channels: channels,
        closed: rawTable.closed
    }
}

export class RoundTableSeatData {
    channelPubkey: Uint8Array;

    constructor(args: {
        channelPubkey: Uint8Array
    }) {
        this.channelPubkey = args.channelPubkey
    }
}
export const RoundTableSeatDataDefault = new RoundTableSeatData({
    channelPubkey: new Uint8Array(32)
})
export const RoundTableSeatDataSchema = new Map([[RoundTableSeatData, {
    kind: 'struct',
    fields: [
        ['channelPubkey', [1024]],
    ]
}]]);
export function seatDeserialize(data: Buffer) {
    return deserializeUnchecked(RoundTableSeatDataSchema, RoundTableSeatData, data);
}
export async function getSeatData(connection: Connection, owner: PublicKey, user: PublicKey): Promise<RoundTableSeatData | null> {
    var table = (await getTableAddress(owner, PROGRAM_ID))[0];
    var pda = await getSeatAddress(table, user, PROGRAM_ID);
    const acc = await connection.getAccountInfo(pda[0])
    if (!acc || !acc.data) {
        return null;
    }
    return seatDeserialize(acc.data);
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

export async function makeInitTableIx(user: PublicKey, closed: boolean) {
    const table_pda = (await getTableAddress(user, PROGRAM_ID))[0];
    return new TransactionInstruction({
        data: new Buffer([RoundTableInstructions.InitTable, closed]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}

export async function makeDeleteTableIx(user: PublicKey, closed: boolean) {
    const table_pda = (await getTableAddress(user, PROGRAM_ID))[0];
    return new TransactionInstruction({
        data: new Buffer([RoundTableInstructions.DeleteTable]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}

export async function makeAddBoostrapIx(user: PublicKey, bootstrap: string) {
    const table_pda = (await getTableAddress(user, PROGRAM_ID))[0];
    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(bootstrap));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.AddBoostrap]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}

export async function makeDeleteBoostrapIx(user: PublicKey, bootstrap: string) {
    const table_pda = (await getTableAddress(user, PROGRAM_ID))[0];
    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(bootstrap));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.DeleteBootstrap]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}

export async function makeAddChannelIx(user: PublicKey, channel: string) {
    const table_pda = (await getTableAddress(user, PROGRAM_ID))[0];
    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(channel));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.AddChannel]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}

export async function makeDeleteChannelIx(user: PublicKey, channel: string) {
    const table_pda = (await getTableAddress(user, PROGRAM_ID))[0];
    var argBuffer = new Uint8Array(128);
    argBuffer.set(new TextEncoder().encode(channel));
    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.DeleteChannel]), argBuffer]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: table_pda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}

export async function makeAddSeatIx(user: PublicKey, tableOwner: PublicKey, channelPubkey: PublicKey) {
    const tablePda = (await getTableAddress(tableOwner, PROGRAM_ID))[0];
    const seatPda = (await getSeatAddress(tablePda, user, PROGRAM_ID))[0];

    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.AddSeat]), channelPubkey.toBytes()]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: tableOwner, isSigner: false, isWritable: false },
            { pubkey: tablePda, isSigner: false, isWritable: false },
            { pubkey: seatPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}

export async function makeRemoveSeatIx(user: PublicKey, tableOwner: PublicKey) {
    const tablePda = (await getTableAddress(tableOwner, PROGRAM_ID))[0];
    const seatPda = (await getSeatAddress(tablePda, user, PROGRAM_ID))[0];

    return new TransactionInstruction({
        data: Buffer.concat([new Buffer([RoundTableInstructions.DeleteSeat])]),
        keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: tableOwner, isSigner: false, isWritable: false },
            { pubkey: tablePda, isSigner: false, isWritable: false },
            { pubkey: seatPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID
    })
}