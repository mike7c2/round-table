use solana_program::{
    account_info::AccountInfo, msg, program::invoke_signed, rent, system_instruction,
};

pub fn delete_pda<'a>(account: &AccountInfo<'a>, refund: &AccountInfo<'a>) -> Result<(), ()> {
    let account_value = **account.lamports.borrow();

    **account.lamports.borrow_mut() -= account_value;
    **refund.lamports.borrow_mut() += account_value;

    Ok(())
}

pub fn create_owned_funded_sized_pda<'a>(
    new_account: &AccountInfo<'a>,
    program_account: &AccountInfo<'a>,
    payer: &AccountInfo<'a>,
    seed: Vec<Vec<u8>>,
    space: u64,
    overwrite: bool,
) -> Result<(), ()> {
    let accounts = [payer.clone(), new_account.clone()];
    let seed_refs: Vec<&[u8]> = seed.iter().map(|x| x.as_slice()).collect();

    if new_account.data_is_empty() || overwrite {
        // Invoke the system program to allocate account data
        match invoke_signed(
            &system_instruction::allocate(new_account.key, space),
            &accounts,
            &[&seed_refs],
        ) {
            Ok(_) => {
                msg!("Allocated account {:?}", new_account.key);
            }
            Err(e) => {
                msg!("Account already allocated {}", e);
            }
        }
    } else {
        return Err(());
    }

    let rent_free_amt = rent::Rent::default().due(0, space as usize, 2.001).0;
    let account_value = **new_account.lamports.borrow();
    if account_value < rent_free_amt {
        invoke_signed(
            &system_instruction::transfer(
                payer.key,
                new_account.key,
                rent_free_amt - account_value,
            ),
            &accounts,
            &[&seed_refs],
        )
        .unwrap();
    }

    invoke_signed(
        &system_instruction::assign(new_account.key, program_account.key),
        &accounts,
        &[&seed_refs],
    )
    .unwrap();

    Ok(())
}
