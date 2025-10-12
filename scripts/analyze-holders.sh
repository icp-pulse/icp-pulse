#!/bin/bash

# Comprehensive Token Holder Analysis Script
# Queries transaction history and identifies all token holders

NETWORK="${1:-ic}"

echo "=== PULSE Token Holder & Transaction Analysis ==="
echo "Network: $NETWORK"
echo ""

# Get transaction count
echo "1. Fetching transaction count..."
TX_COUNT=$(dfx canister call tokenmania get_transaction_count --network $NETWORK 2>/dev/null | grep -o '[0-9]*')
echo "Total Transactions: $TX_COUNT"
echo ""

# Get all token holders
echo "2. Fetching all token holders (this may take a moment)..."
echo "Note: This scans the entire transaction log"
echo ""

HOLDERS_OUTPUT=$(dfx canister call tokenmania get_all_holders --network $NETWORK 2>/dev/null)

echo "=== TOKEN HOLDERS REPORT ==="
echo "-----------------------------------------------------------------------------------------"
printf "%-70s | %-20s | %-20s\n" "Principal" "Balance (e8s)" "Balance (PULSE)"
echo "-----------------------------------------------------------------------------------------"

# Parse and display holders (this is a simplified parser)
echo "$HOLDERS_OUTPUT" | grep -o 'principal "[^"]*"' | while read -r line; do
    # Extract principal
    principal=$(echo "$line" | grep -o '"[^"]*"' | tr -d '"')

    # Get balance for this principal
    balance=$(dfx canister call tokenmania icrc1_balance_of "(record {
        owner = principal \"$principal\";
        subaccount = null;
    })" --network $NETWORK 2>/dev/null | grep -o '[0-9]*')

    if [ -n "$balance" ] && [ "$balance" != "0" ]; then
        pulse_balance=$(echo "scale=8; $balance / 100000000" | bc)
        printf "%-70s | %20s | %20s\n" "$principal" "$balance" "$pulse_balance"
    fi
done

echo "-----------------------------------------------------------------------------------------"
echo ""

# Get sample of recent transactions
echo "3. Recent Transactions (last 10)..."
echo ""

if [ "$TX_COUNT" -gt 0 ]; then
    START_INDEX=$((TX_COUNT > 10 ? TX_COUNT - 10 : 0))

    echo "Fetching transactions $START_INDEX to $TX_COUNT..."
    dfx canister call tokenmania get_transactions "($START_INDEX : nat, 10 : nat)" --network $NETWORK
fi

echo ""
echo "=== Analysis Complete ==="
echo ""
echo "For detailed transaction analysis, you can:"
echo "  1. Query specific transaction: dfx canister call tokenmania get_transaction '(INDEX : nat)' --network $NETWORK"
echo "  2. Query transaction range: dfx canister call tokenmania get_transactions '(START : nat, LENGTH : nat)' --network $NETWORK"
echo "  3. Get all holders: dfx canister call tokenmania get_all_holders --network $NETWORK"
