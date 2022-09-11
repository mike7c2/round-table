use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct InitTableArgs {
    pub channels_len: u32,
    pub servers_len: u32,
    pub authority: Pubkey,
    pub closed: bool,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct AddBootstrapArgs {
    pub bootstrap: [u8; 128],
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct RemoveBootstrapArgs {
    pub bootstrap: [u8; 128],
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct AddChannelArgs {
    pub channel: [u8; 128],
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct RemoveChannelArgs {
    pub channel: [u8; 128],
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct AddSeatArgs {
    pub channel_key: Pubkey,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub enum RoundNetInstruction {
    InitTable(InitTableArgs),
    DeleteTable,
    AddBootstrap(AddBootstrapArgs),
    RemoveBootstrap(RemoveBootstrapArgs),
    AddChannelArgs(AddChannelArgs),
    RemoveChannelArgs(RemoveChannelArgs),
    AddSeat(AddSeatArgs),
    RemoveSeat,
}

pub enum Errors {
    MissingBaseAccounts = 0,
    Account0MustBeSigner,
    Account1MustBeProgramID,
    FailedToDeserialiseInstruction,
    BadTableAccount,
    BadSeatAccount,
    FailedToDeserialiseTableData,
    EntryAlreadyExists,
    EntryDoesntExist,
    NotAllowed,
    Error,
}
