#!/bin/bash

# Script to burn excess PULSE tokens to reach 1 billion total supply
# This will burn 351,501,001 PULSE tokens

NETWORK="${1:-ic}"
MINTING_ACCOUNT="amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe"

echo "=== PULSE Token Burn Script ==="
echo "Network: $NETWORK"
echo ""

# Get current supply
echo "1. Checking current supply..."
CURRENT_SUPPLY=$(dfx canister call tokenmania icrc1_total_supply --network $NETWORK | grep -o '[0-9]*')
CURRENT_PULSE=$(echo "scale=8; $CURRENT_SUPPLY / 100000000" | bc)
echo "Current Supply: $CURRENT_SUPPLY e8s ($CURRENT_PULSE PULSE)"
echo ""

# Calculate burn amount
TARGET_SUPPLY=100_000_000_000_000_000  # 1 billion PULSE in e8s
BURN_AMOUNT=$((CURRENT_SUPPLY - TARGET_SUPPLY))
BURN_PULSE=$(echo "scale=8; $BURN_AMOUNT / 100000000" | bc)

echo "2. Calculating burn amount..."
echo "Target Supply: $TARGET_SUPPLY e8s (1,000,000,000 PULSE)"
echo "Burn Amount: $BURN_AMOUNT e8s ($BURN_PULSE PULSE)"
echo ""

if [ $BURN_AMOUNT -le 0 ]; then
    echo "❌ No tokens to burn! Current supply is already at or below target."
    exit 1
fi

echo "⚠️  WARNING: This will permanently destroy $BURN_PULSE PULSE tokens!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo ""
echo "3. Burning tokens..."
echo "Note: Transfer TO minting account = burn (tokens are destroyed)"
echo ""

# Execute burn (transfer to minting account)
dfx canister call tokenmania icrc1_transfer "(record {
  to = record {
    owner = principal \"$MINTING_ACCOUNT\";
    subaccount = null;
  };
  amount = $BURN_AMOUNT;
  fee = opt 10_000;
  memo = null;
  created_at_time = null;
})" --network $NETWORK

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Burn transaction submitted!"
    echo ""
    echo "4. Verifying new supply..."
    sleep 2

    NEW_SUPPLY=$(dfx canister call tokenmania icrc1_total_supply --network $NETWORK | grep -o '[0-9]*')
    NEW_PULSE=$(echo "scale=8; $NEW_SUPPLY / 100000000" | bc)

    echo "New Supply: $NEW_SUPPLY e8s ($NEW_PULSE PULSE)"
    echo ""

    if [ $NEW_SUPPLY -eq $TARGET_SUPPLY ]; then
        echo "🎉 SUCCESS! Supply is now exactly 1 billion PULSE!"
    else
        echo "⚠️  Supply is close but not exact. Difference: $((NEW_SUPPLY - TARGET_SUPPLY)) e8s"
    fi
else
    echo ""
    echo "❌ Burn transaction failed!"
    echo "Check the error message above for details."
    exit 1
fi

echo ""
echo "=== Burn Complete ==="
