use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct TableData {
    pub table_id: Pubkey,
    pub authority: Pubkey,
    pub closed: bool
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct SeatData {
    pub table_id: Pubkey,
    pub owner: Pubkey,
    pub channel_pubkey: Pubkey,
}

pub fn derive_table_seed(owner: &Pubkey, program_id: &Pubkey) -> (Vec<Vec<u8>>, Pubkey) {
    let mut seed = Vec::new();
    seed.push(owner.to_bytes().to_vec());
    let seed_refs: Vec<&[u8]> = seed.iter().map(|x| x.as_slice()).collect();
    let (pda, pad) = Pubkey::find_program_address(&seed_refs, program_id);
    seed.push([pad].to_vec());
    return (seed, pda);
}

pub fn derive_table_channels_seed(owner: &Pubkey, program_id: &Pubkey) -> (Vec<Vec<u8>>, Pubkey) {
    let mut seed = Vec::new();
    seed.push(b"channels".to_vec());
    seed.push(owner.to_bytes().to_vec());
    let seed_refs: Vec<&[u8]> = seed.iter().map(|x| x.as_slice()).collect();
    let (pda, pad) = Pubkey::find_program_address(&seed_refs, program_id);
    seed.push([pad].to_vec());
    return (seed, pda);
}

pub fn derive_table_servers_seed(owner: &Pubkey, program_id: &Pubkey) -> (Vec<Vec<u8>>, Pubkey) {
    let mut seed = Vec::new();
    seed.push(b"servers".to_vec());
    seed.push(owner.to_bytes().to_vec());
    let seed_refs: Vec<&[u8]> = seed.iter().map(|x| x.as_slice()).collect();
    let (pda, pad) = Pubkey::find_program_address(&seed_refs, program_id);
    seed.push([pad].to_vec());
    return (seed, pda);
}

pub fn derive_seat_seed(
    table: &Pubkey,
    user: &Pubkey,
    program_id: &Pubkey,
) -> (Vec<Vec<u8>>, Pubkey) {
    let mut seed = Vec::new();
    seed.push(table.to_bytes().to_vec());
    seed.push(user.to_bytes().to_vec());
    let seed_refs: Vec<&[u8]> = seed.iter().map(|x| x.as_slice()).collect();
    let (pda, pad) = Pubkey::find_program_address(&seed_refs, program_id);
    seed.push([pad].to_vec());
    return (seed, pda);
}

pub const TABLE_DATA_SIZE: u64 = 1025;
pub const SEAT_DATA_SIZE: u64 = 32;
