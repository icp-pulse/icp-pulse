#!/bin/bash

# Burn Excess PULSE Tokens Script
# This script burns tokens by sending them to the minting account (which acts as a burn address)

# Configuration
NETWORK="${1:-local}"  # Use 'ic' for mainnet
TOKENMANIA_CANISTER_ID="${2:-$(dfx canister id tokenmania --network $NETWORK)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== PULSE Token Burn Utility ===${NC}"
echo "Network: $NETWORK"
echo "Tokenmania Canister: $TOKENMANIA_CANISTER_ID"
echo ""

# Get current total supply
echo "Fetching current total supply..."
TOTAL_SUPPLY=$(dfx canister call tokenmania icrc1_total_supply --network $NETWORK | grep -o '[0-9]*')
echo "Current Total Supply: $TOTAL_SUPPLY e8s"

# Calculate in PULSE (divide by 100,000,000)
TOTAL_PULSE=$(echo "scale=8; $TOTAL_SUPPLY / 100000000" | bc)
echo "Current Total Supply: $TOTAL_PULSE PULSE"

# Max supply: 100,000,000,000,000,000 e8s = 1,000,000,000 PULSE
MAX_SUPPLY_E8S=100000000000000000
MAX_SUPPLY_PULSE=1000000000

# Calculate excess
EXCESS_E8S=$(echo "$TOTAL_SUPPLY - $MAX_SUPPLY_E8S" | bc)
EXCESS_PULSE=$(echo "scale=8; $EXCESS_E8S / 100000000" | bc)

if [ $(echo "$EXCESS_E8S <= 0" | bc) -eq 1 ]; then
    echo -e "${GREEN}✓ No excess tokens to burn. Current supply is within the cap.${NC}"
    exit 0
fi

echo -e "${RED}⚠ EXCESS TOKENS DETECTED${NC}"
echo "Excess: $EXCESS_E8S e8s ($EXCESS_PULSE PULSE)"
echo ""
echo -e "${YELLOW}This script will burn the excess tokens by sending them to the minting account.${NC}"
echo -e "${YELLOW}The minting account acts as a burn address - tokens sent there are effectively destroyed.${NC}"
echo ""

# Get minting account
echo "Fetching minting account..."
MINTING_ACCOUNT=$(dfx canister call tokenmania icrc1_minting_account --network $NETWORK)
echo "Minting Account: $MINTING_ACCOUNT"
echo ""

# Confirm burn
read -p "Do you want to proceed with burning $EXCESS_PULSE PULSE tokens? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Burn cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Burning $EXCESS_PULSE PULSE ($EXCESS_E8S e8s)...${NC}"

# Note: You need to be authenticated as the principal that holds these tokens
# The burn is done by transferring TO the minting account

# Extract the minting account principal (parsing Candid format)
# This is a simplified version - you may need to adjust based on actual output
MINTING_PRINCIPAL=$(echo $MINTING_ACCOUNT | grep -oP 'principal "\K[^"]+')

if [ -z "$MINTING_PRINCIPAL" ]; then
    echo -e "${RED}Error: Could not extract minting account principal${NC}"
    exit 1
fi

echo "Minting Principal: $MINTING_PRINCIPAL"
echo ""

# Perform the burn (transfer to minting account)
# Note: This assumes you're running as the identity that owns the tokens
dfx canister call tokenmania icrc1_transfer \
  "(record {
    to = record {
      owner = principal \"$MINTING_PRINCIPAL\";
      subaccount = null;
    };
    amount = $EXCESS_E8S : nat;
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
  })" \
  --network $NETWORK

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Burn successful!${NC}"
    echo ""
    echo "Verifying new total supply..."
    NEW_TOTAL_SUPPLY=$(dfx canister call tokenmania icrc1_total_supply --network $NETWORK | grep -o '[0-9]*')
    NEW_TOTAL_PULSE=$(echo "scale=8; $NEW_TOTAL_SUPPLY / 100000000" | bc)
    echo "New Total Supply: $NEW_TOTAL_PULSE PULSE"
else
    echo -e "${RED}✗ Burn failed. Check the error message above.${NC}"
    exit 1
fi
