use {
    crate::{accounts, helpers, instruction, instruction::Errors},
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
        pubkey::Pubkey,
    },
    std::string::String,
};

fn error(error: Errors) -> Result<(), ProgramError> {
    return Err(ProgramError::Custom(error as u32));
}

struct Context<'a> {
    user: &'a AccountInfo<'a>,
    program: &'a AccountInfo<'a>,
    others: &'a [AccountInfo<'a>],
}

fn check_table_account<'a>(
    table_acc: &'a AccountInfo<'a>,
    owner: &'a Pubkey,
    program: &'a Pubkey,
) -> Result<(&'a AccountInfo<'a>, Vec<Vec<u8>>), ProgramError> {
    let (seed, pda) = accounts::derive_table_seed(owner, program);
    if &pda != table_acc.key {
        return Err(ProgramError::Custom(Errors::BadTableAccount as u32));
    }
    return Ok((table_acc, seed));
}

fn check_seat_account<'a>(
    seat_acc: &'a AccountInfo<'a>,
    table: &'a Pubkey,
    user: &'a Pubkey,
    program: &'a Pubkey,
) -> Result<(&'a AccountInfo<'a>, Vec<Vec<u8>>), ProgramError> {
    let (seed, pda) = accounts::derive_seat_seed(table, user, program);
    if &pda != seat_acc.key {
        return Err(ProgramError::Custom(Errors::BadSeatAccount as u32));
    }
    return Ok((seat_acc, seed));
}

fn str_buf_add(array: &mut [u8], s_raw: &[u8]) -> Result<(), ProgramError> {
    let mut d = String::from_utf8(array.to_vec()).unwrap().trim_matches(char::from(0)).to_string();
    let s = String::from_utf8(Vec::from(s_raw)).unwrap().trim_matches(char::from(0)).to_string();

    if d.contains(&s) {
        return error(Errors::EntryAlreadyExists);
    }

    d += ";";
    d += &s;
    let bytes = d.as_bytes();

    for i in 0..array.len() {
        if i < bytes.len() {
            array[i] = bytes[i];
        } else {
            array[i] = 0;
        }
    }

    Ok(())
}

fn str_buf_rm(array: &mut [u8], s_raw: &[u8]) -> Result<(), ProgramError> {
    let d = String::from_utf8(array.to_vec()).unwrap().trim_matches(char::from(0)).to_string();
    let s = String::from_utf8(Vec::from(s_raw)).unwrap().trim_matches(char::from(0)).to_string();

    if !d.contains(&s) {
        return error(Errors::EntryDoesntExist);
    }

    let n = d.replace(&(";".to_owned() + &s), "");
    let bytes = n.as_bytes();

    for i in 0..array.len() {
        if i < bytes.len() {
            array[i] = bytes[i];
        } else {
            array[i] = 0;
        }
    }

    Ok(())
}

/**
 * Account1 : Table
 */
fn init_table(context: Context, args: instruction::InitTableArgs) -> Result<(), ProgramError> {
    let (table_acc, table_seed) =
        check_table_account(&context.others[0], context.user.key, context.program.key)?;

    if table_acc.data.borrow().len() > 0 {
        return error(Errors::Error);
    }
    let _ = helpers::create_owned_funded_sized_pda(
        &table_acc,
        &context.program,
        &context.user,
        table_seed,
        accounts::TABLE_DATA_SIZE,
        false,
    );
    let new_data = accounts::TableData {
        servers: [0; 512],
        channels: [0; 512],
        closed: args.closed,
    };
    // Write data to game account
    new_data
        .serialize(&mut &mut table_acc.data.borrow_mut()[..])
        .unwrap();
    msg!("Created table!");
    Ok(())
}

/**
 * Account1 : Table
 */
fn delete_table(context: Context) -> Result<(), ProgramError> {
    let (table_acc, _) =
        check_table_account(&context.others[0], context.user.key, context.program.key)?;
    if table_acc.data.borrow().len() == 0 {
        return error(Errors::Error);
    }
    helpers::delete_pda(table_acc, context.user).unwrap();

    Ok(())
}

/**
 * Account1 : Table
 */
fn add_bootstrap(context: Context, args: instruction::AddBootstrapArgs) -> Result<(), ProgramError> {
    let (table_acc, _) =
        check_table_account(&context.others[0], context.user.key, context.program.key)?;

    str_buf_add(&mut table_acc.data.borrow_mut()[0..512], &args.bootstrap)?;

    Ok(())
}

/**
 * Account1 : Table
 */
fn remove_bootstrap(context: Context, args: instruction::RemoveBootstrapArgs) -> Result<(), ProgramError> {
    let (table_acc, _) =
        check_table_account(&context.others[0], context.user.key, context.program.key)?;

    str_buf_rm(&mut table_acc.data.borrow_mut()[0..512], &args.bootstrap)?;

    Ok(())
}

/**
 * Account1 : Table
 */
fn add_channel(context: Context, args: instruction::AddChannelArgs) -> Result<(), ProgramError> {
    let (table_acc, _) =
        check_table_account(&context.others[0], context.user.key, context.program.key)?;

    str_buf_add(&mut table_acc.data.borrow_mut()[512..1024], &args.channel)?;

    Ok(())
}

/**
 * Account1 : Table
 */
fn remove_channel(
    context: Context,
    args: instruction::RemoveChannelArgs,
) -> Result<(), ProgramError> {
    let (table_acc, _) =
        check_table_account(&context.others[0], context.user.key, context.program.key)?;

    str_buf_rm(&mut table_acc.data.borrow_mut()[512..1024], &args.channel)?;

    Ok(())
}

/**
 * Account1 : TableOwner
 * Account2 : Table
 * Account3 : Seat
 */
fn add_seat(context: Context, args: instruction::AddSeatArgs) -> Result<(), ProgramError> {
    let table_owner_acc = &context.others[0];
    let (table_acc, _) =
        check_table_account(&context.others[1], table_owner_acc.key, context.program.key)?;
    let (seat_acc, seat_seed) = check_seat_account(
        &context.others[2],
        table_acc.key,
        context.user.key,
        context.program.key,
    )?;

    let table_data = match accounts::TableData::deserialize(&mut &table_acc.data.borrow_mut()[..]) {
        Ok(o) => o,
        Err(_) => {
            return error(Errors::Error);
        }
    };
    if table_data.closed && !table_owner_acc.is_signer {
        return error(Errors::Error);
    }

    let _ = helpers::create_owned_funded_sized_pda(
        &seat_acc,
        &context.program,
        &context.user,
        seat_seed,
        accounts::SEAT_DATA_SIZE,
        false,
    );

    let new_seat = accounts::SeatData {
        channel_pubkey: args.channel_key,
    };

    // Write data to game account
    new_seat
        .serialize(&mut &mut seat_acc.data.borrow_mut()[..])
        .unwrap();
    msg!("Created Seat!");

    Ok(())
}

/**
 * Account1 : TableOwner
 * Account2 : Table
 * Account3 : Seat
 */
fn remove_seat(context: Context) -> Result<(), ProgramError> {
    let table_owner_acc = &context.others[0];
    let (table_acc, _) =
        check_table_account(&context.others[1], table_owner_acc.key, context.program.key)?;
    let (seat_acc, _) = check_seat_account(
        &context.others[2],
        table_acc.key,
        context.user.key,
        context.program.key,
    )?;

    let table_data = match accounts::TableData::deserialize(&mut &table_acc.data.borrow_mut()[..]) {
        Ok(o) => o,
        Err(_) => {
            return error(Errors::Error);
        }
    };
    if table_data.closed && !table_owner_acc.is_signer {
        return error(Errors::Error);
    }

    helpers::delete_pda(seat_acc, context.user).unwrap();

    Ok(())
}

pub fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    input: &[u8],
) -> ProgramResult {
    msg!("Raw data input: {:?}", input);
    /* For all calls first account MUST be signing user and second account MUST be program */
    if accounts.len() < 2 {
        msg!("Error: Require at least 2 accounts [USER] [PROGRAM]");
        return error(Errors::MissingBaseAccounts);
    }
    let user_acc = &accounts[0];
    if !user_acc.is_signer {
        msg!("First account must be signer");
        return error(Errors::Account0MustBeSigner);
    }
    let program_acc = &accounts[1];
    if program_acc.key != program_id {
        msg!("Second account must be program ID");
        return error(Errors::Account1MustBeProgramID);
    }
    let others = &accounts[2..];

    let context = Context {
        user: user_acc,
        program: program_acc,
        others: others,
    };

    let instruction = match instruction::RoundNetInstruction::try_from_slice(input) {
        Ok(o) => o,
        Err(_) => {
            return error(Errors::FailedToDeserialiseInstruction);
        }
    };
    match instruction {
        instruction::RoundNetInstruction::InitTable(args) => init_table(context, args),
        instruction::RoundNetInstruction::DeleteTable => delete_table(context),
        instruction::RoundNetInstruction::AddBootstrap(args) => add_bootstrap(context, args),
        instruction::RoundNetInstruction::RemoveBootstrap(args) => remove_bootstrap(context, args),
        instruction::RoundNetInstruction::AddChannelArgs(args) => add_channel(context, args),
        instruction::RoundNetInstruction::RemoveChannelArgs(args) => remove_channel(context, args),
        instruction::RoundNetInstruction::AddSeat(args) => add_seat(context, args),
        instruction::RoundNetInstruction::RemoveSeat => remove_seat(context),
    }
}
