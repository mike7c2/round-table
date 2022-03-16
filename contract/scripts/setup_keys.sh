#! /bin/bash

#rm -rf keys
mkdir keys/
solana-keygen new -o keys/root.json --no-passphrase
solana-keygen new -o keys/round_table.json --no-passphrase
solana-keygen new -o keys/table1.json --no-passphrase
solana-keygen new -o keys/table2.json --no-passphrase
solana-keygen new -o keys/user1.json --no-passphrase
solana-keygen new -o keys/user2.json --no-passphrase
solana-keygen new -o keys/user3.json --no-passphrase
solana-keygen new -o keys/user4.json --no-passphrase

echo "Root key: `solana-keygen pubkey keys/root.json`"
echo "RoundTable key: `solana-keygen pubkey keys/round_table.json`"
echo "Table 1 key: `solana-keygen pubkey keys/table1.json`"
echo "Table 2 key: `solana-keygen pubkey keys/table2.json`"
echo "User 1 key: `solana-keygen pubkey keys/user1.json`"
echo "User 2 key: `solana-keygen pubkey keys/user2.json`"
echo "User 3 key: `solana-keygen pubkey keys/user3.json`"
echo "User 4 key: `solana-keygen pubkey keys/user4.json`"
