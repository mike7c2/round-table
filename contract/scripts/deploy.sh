#! /bin/bash

set -e

#RPC="http://localhost:8899"
RPC="https://api.devnet.solana.com"

ROOT_KEY=keys/root.json
ROOT_ID=`solana-keygen pubkey $ROOT_KEY`
PROGRAM_KEY=keys/round_table.json
PROGRAM_ID=`solana-keygen pubkey $PROGRAM_KEY`
#VALIDATOR_PID=`solana-test-validator -r > /dev/null & echo   $!`

function cleanup {
  echo "Killing validator"
  kill $VALIDATOR_PID

}
trap cleanup EXIT

echo "Root: $ROOT_KEY"
echo "RootID: $ROOT_ID"
echo "Program: $PROGRAM_KEY"
echo "ProgramID: $PROGRAM_ID"

sleep 2

#solana airdrop -u $RPC 1 $ROOT_ID
#solana airdrop -u $RPC 1 $ROOT_ID

solana airdrop -u $RPC 1 `solana-keygen pubkey keys/table1.json`
solana airdrop -u $RPC 1 `solana-keygen pubkey keys/table2.json`
solana airdrop -u $RPC 1 `solana-keygen pubkey keys/user1.json`
solana airdrop -u $RPC 1 `solana-keygen pubkey keys/user2.json`
solana airdrop -u $RPC 1 `solana-keygen pubkey keys/user3.json`
solana airdrop -u $RPC 1 `solana-keygen pubkey keys/user4.json`

solana program deploy -u $RPC target/deploy/round_table_contract.so -k $ROOT_KEY --program-id $PROGRAM_KEY

#echo "Leaving validator running"
#read -p "Press enter to quit"