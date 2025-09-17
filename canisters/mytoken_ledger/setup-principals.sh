#!/bin/bash

# Script to setup principals in init.json
# Usage: ./setup-principals.sh <controller_principal> <initial_owner_principal>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <controller_principal> <initial_owner_principal>"
    echo "Example: $0 rdmx6-jaaaa-aaaah-qcaiq-cai rrkah-fqaaa-aaaah-qcuaq-cai"
    exit 1
fi

CONTROLLER_PRINCIPAL=$1
INITIAL_OWNER_PRINCIPAL=$2

# Backup the original file
cp init.json init.json.backup

# Replace placeholders with actual principals
sed -i.tmp "s/<CONTROLLER_PRINCIPAL>/$CONTROLLER_PRINCIPAL/g" init.json
sed -i.tmp "s/<YOUR_PRINCIPAL>/$INITIAL_OWNER_PRINCIPAL/g" init.json

# Clean up temporary file
rm init.json.tmp

echo "Updated init.json with:"
echo "  Controller Principal: $CONTROLLER_PRINCIPAL"
echo "  Initial Owner Principal: $INITIAL_OWNER_PRINCIPAL"
echo "  Backup saved as init.json.backup"