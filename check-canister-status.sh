#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Network (default to ic/mainnet)
NETWORK="${1:-ic}"

echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                        ICP Canister Status Report                             ║${NC}"
echo -e "${BOLD}${CYAN}║                         Network: ${NETWORK}${NC}${BOLD}${CYAN}                                        ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Read canister IDs from canister_ids.json
if [ ! -f "canister_ids.json" ]; then
    echo -e "${RED}Error: canister_ids.json not found!${NC}"
    exit 1
fi

# Function to convert cycles to human-readable format
format_cycles() {
    local cycles=$1
    local tc=$(echo "scale=2; $cycles / 1000000000000" | bc)
    echo "${tc} TC"
}

# Function to convert bytes to human-readable format
format_memory() {
    local bytes=$1
    local mb=$(echo "scale=2; $bytes / 1048576" | bc)
    echo "${mb} MB"
}

# Function to extract canister status info
get_canister_status() {
    local canister_id=$1
    local status_output=$(dfx canister status "$canister_id" --network "$NETWORK" 2>&1)

    if [[ $status_output == *"error"* ]] || [[ $status_output == *"Error"* ]]; then
        echo "ERROR|||ERROR|||ERROR"
        return
    fi

    # Extract cycles - remove underscores and commas, then get just the number
    local cycles=$(echo "$status_output" | grep "^Balance:" | sed 's/Balance: //; s/_//g; s/,//g; s/ Cycles//')

    # Extract memory size - remove underscores and commas
    local memory=$(echo "$status_output" | grep "^Memory Size:" | sed 's/Memory Size: //; s/_//g; s/,//g; s/ Bytes//')

    # If memory size not found or is 0, try memory allocation
    if [ -z "$memory" ] || [ "$memory" == "0" ]; then
        memory=$(echo "$status_output" | grep "^Memory allocation:" | sed 's/Memory allocation: //; s/_//g; s/,//g; s/ Bytes//')
    fi

    # Default to 0 if still empty
    if [ -z "$memory" ]; then
        memory="0"
    fi

    # Extract status directly from Status line
    local canister_status=$(echo "$status_output" | grep "^Status:" | sed 's/Status: //')

    # If status is empty, default to Unknown
    if [ -z "$canister_status" ]; then
        canister_status="Unknown"
    fi

    echo "$cycles|$memory|$canister_status"
}

# Print table header
echo -e "${BOLD}┌─────────────────────────────┬────────────────────────────────┬──────────────┬────────────┬───────────┐${NC}"
printf "${BOLD}│ %-27s │ %-30s │ %-12s │ %-10s │ %-9s │${NC}\n" "Canister Name" "Canister ID" "Cycles" "Memory" "Status"
echo -e "${BOLD}├─────────────────────────────┼────────────────────────────────┼──────────────┼────────────┼───────────┤${NC}"

# Track totals
total_cycles=0
canister_count=0
error_count=0

# Get list of canisters from canister_ids.json
canisters=$(jq -r --arg network "$NETWORK" 'to_entries[] | select(.value[$network] != null) | .key' canister_ids.json 2>/dev/null)

if [ -z "$canisters" ]; then
    echo -e "${RED}No canisters found for network: $NETWORK${NC}"
    exit 1
fi

# Loop through each canister
while IFS= read -r canister_name; do
    canister_id=$(jq -r --arg network "$NETWORK" --arg name "$canister_name" '.[$name][$network]' canister_ids.json 2>/dev/null)

    if [ -z "$canister_id" ] || [ "$canister_id" == "null" ]; then
        continue
    fi

    canister_count=$((canister_count + 1))

    # Get status
    echo -ne "${CYAN}Fetching status for ${canister_name}...${NC}\r"
    status_info=$(get_canister_status "$canister_id")

    IFS='|' read -r cycles memory canister_status <<< "$status_info"

    if [ "$cycles" == "ERROR" ]; then
        printf "│ ${RED}%-27s${NC} │ %-30s │ ${RED}%-12s${NC} │ ${RED}%-10s${NC} │ ${RED}%-9s${NC} │\n" \
            "$canister_name" "$canister_id" "ERROR" "ERROR" "ERROR"
        error_count=$((error_count + 1))
    else
        # Format cycles and memory
        cycles_formatted=$(format_cycles "$cycles")
        memory_formatted=$(format_memory "$memory")

        # Add to total
        total_cycles=$(echo "$total_cycles + $cycles" | bc)

        # Color code based on cycles (warning if < 1 TC, error if < 0.5 TC)
        cycles_color=$GREEN
        if (( $(echo "$cycles < 500000000000" | bc -l) )); then
            cycles_color=$RED
        elif (( $(echo "$cycles < 1000000000000" | bc -l) )); then
            cycles_color=$YELLOW
        fi

        # Color code status
        status_color=$GREEN
        if [ "$canister_status" == "Stopped" ]; then
            status_color=$RED
        fi

        printf "│ ${BOLD}%-27s${NC} │ ${CYAN}%-30s${NC} │ ${cycles_color}%-12s${NC} │ %-10s │ ${status_color}%-9s${NC} │\n" \
            "$canister_name" "$canister_id" "$cycles_formatted" "$memory_formatted" "$canister_status"
    fi

done <<< "$canisters"

# Print table footer
echo -e "${BOLD}└─────────────────────────────┴────────────────────────────────┴──────────────┴────────────┴───────────┘${NC}"

# Print summary
echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                                  Summary                                      ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BOLD}Total Canisters:${NC} $canister_count"
if [ $error_count -gt 0 ]; then
    echo -e "${BOLD}${RED}Errors:${NC} $error_count"
fi
echo -e "${BOLD}Total Cycles:${NC} $(format_cycles $total_cycles)"

# Calculate cost (1 TC = ~$1.30 USD as of 2024)
total_usd=$(echo "scale=2; $total_cycles / 1000000000000 * 1.30" | bc)
echo -e "${BOLD}Estimated Value:${NC} ~\$${total_usd} USD"

echo ""
echo -e "${YELLOW}${BOLD}Legend:${NC}"
echo -e "  ${GREEN}Green cycles${NC} = Healthy (> 1 TC)"
echo -e "  ${YELLOW}Yellow cycles${NC} = Low (0.5 - 1 TC)"
echo -e "  ${RED}Red cycles${NC} = Critical (< 0.5 TC) - Top up soon!"
echo ""
