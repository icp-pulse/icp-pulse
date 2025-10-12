#!/bin/bash

# PULSE Token Holder Analysis Script
# This script checks balances of known addresses

NETWORK="${1:-ic}"
TOKENMANIA_CANISTER="tokenmania"

echo "=== PULSE Token Holder Analysis ==="
echo "Network: $NETWORK"
echo ""

# Function to check balance
check_balance() {
    local principal=$1
    local label=$2

    balance=$(dfx canister call $TOKENMANIA_CANISTER icrc1_balance_of "(record {
        owner = principal \"$principal\";
        subaccount = null;
    })" --network $NETWORK 2>/dev/null | grep -o '[0-9]*')

    if [ -n "$balance" ]; then
        # Convert to PULSE (divide by 100,000,000)
        pulse_balance=$(echo "scale=8; $balance / 100000000" | bc)
        percentage=$(echo "scale=4; $balance * 100 / 135150100099700000" | bc)

        if [ $(echo "$balance > 0" | bc) -eq 1 ]; then
            printf "%-40s | %20s e8s | %20s PULSE | %8s%%\n" "$label" "$balance" "$pulse_balance" "$percentage"
        fi
    fi
}

# Get total supply
echo "Fetching total supply..."
TOTAL_SUPPLY=$(dfx canister call $TOKENMANIA_CANISTER icrc1_total_supply --network $NETWORK | grep -o '[0-9]*')
TOTAL_PULSE=$(echo "scale=8; $TOTAL_SUPPLY / 100000000" | bc)
echo "Total Supply: $TOTAL_SUPPLY e8s ($TOTAL_PULSE PULSE)"
echo ""

# Get minting account
echo "Getting minting account..."
MINTING_ACCOUNT=$(dfx canister call $TOKENMANIA_CANISTER icrc1_minting_account --network $NETWORK | grep -oP 'principal "\K[^"]+')
echo "Minting Account: $MINTING_ACCOUNT"
echo ""

echo "=== Token Holder Balances ==="
echo "-----------------------------------------------------------------------------------------"
printf "%-40s | %-20s | %-20s | %-8s\n" "Account" "Balance (e8s)" "Balance (PULSE)" "% of Supply"
echo "-----------------------------------------------------------------------------------------"

# Check known accounts
check_balance "$MINTING_ACCOUNT" "Minting Account"
check_balance "ej3ry-6qaaa-aaaai-atlza-cai" "IDO Platform"

# Check other known project canisters
echo ""
echo "Checking other project canisters..."
check_balance "$(dfx canister id polls_surveys_backend --network $NETWORK 2>/dev/null)" "Backend Canister"
check_balance "$(dfx canister id staking --network $NETWORK 2>/dev/null)" "Staking Canister"
check_balance "$(dfx canister id airdrop --network $NETWORK 2>/dev/null)" "Airdrop Canister"
check_balance "$(dfx canister id swap --network $NETWORK 2>/dev/null)" "Swap Canister"
check_balance "$(dfx canister id pulseg --network $NETWORK 2>/dev/null)" "PULSEG Canister"

echo ""
echo "=== Summary ==="
echo "To find all token holders, you would need to:"
echo "1. Query the transaction log from the tokenmania canister"
echo "2. Parse all Mint and Transfer operations"
echo "3. Build a map of all unique principals"
echo "4. Query balance for each principal"
echo ""
echo "Note: This requires accessing internal canister state or scanning all transactions."
