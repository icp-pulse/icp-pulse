# Burning Excess PULSE Tokens

## Problem
The tokenmania contract now has a max supply cap of 1 billion PULSE, but **1,351,501,001 PULSE** were already minted before the cap was enforced. We need to burn **351,501,001 PULSE** to comply with the cap.

## Understanding Token Burning in ICRC-1

In ICRC-1 tokens (like PULSE), burning is done by transferring tokens **TO the minting account**. When tokens are sent to the minting account, they are effectively destroyed and removed from circulation.

## IMPORTANT: Units and Decimals

PULSE uses **8 decimals**:
- **1 PULSE** (display) = **100,000,000 e8s** (smallest units)
- **351,501,001 PULSE** = **35,150,100,100,000,000 e8s**

## Method 1: Using the Automated Script

```bash
# For local network
./scripts/burn-excess-tokens.sh local

# For mainnet (use this if tokens are on mainnet)
./scripts/burn-excess-tokens.sh ic
```

The script will:
1. Calculate excess tokens automatically
2. Show you the amount to burn
3. Ask for confirmation
4. Burn the excess by transferring to minting account
5. Verify the new total supply

## Method 2: Manual Burn (Using DFX)

### Step 1: Get the Minting Account Principal

```bash
# Local
dfx canister call tokenmania icrc1_minting_account

# Mainnet
dfx canister call tokenmania icrc1_minting_account --network ic
```

This will return something like:
```
(opt record { owner = principal "xxxxx-xxxxx-xxxxx-xxxxx-cai"; subaccount = null })
```

### Step 2: Calculate Burn Amount

**Excess to burn: 351,501,001 PULSE**

In smallest units (e8s):
```
351,501,001 PULSE × 100,000,000 = 35,150,100,100,000,000 e8s
```

### Step 3: Execute the Burn

Replace `MINTING_PRINCIPAL` with the principal from Step 1:

```bash
# Local network
dfx canister call tokenmania icrc1_transfer '(record {
  to = record {
    owner = principal "MINTING_PRINCIPAL_HERE";
    subaccount = null;
  };
  amount = 35_150_100_100_000_000 : nat;
  fee = null;
  memo = null;
  from_subaccount = null;
  created_at_time = null;
})'

# For mainnet
dfx canister call tokenmania icrc1_transfer '(record {
  to = record {
    owner = principal "MINTING_PRINCIPAL_HERE";
    subaccount = null;
  };
  amount = 35_150_100_100_000_000 : nat;
  fee = null;
  memo = null;
  from_subaccount = null;
  created_at_time = null;
})' --network ic
```

### Step 4: Verify the Burn

Check the new total supply:

```bash
# Local
dfx canister call tokenmania icrc1_total_supply

# Mainnet
dfx canister call tokenmania icrc1_total_supply --network ic
```

Expected result: **100,000,000,000,000,000 e8s** (1 billion PULSE)

## Method 3: Using Candid UI

1. Open Candid UI for tokenmania canister
2. Call `icrc1_minting_account()` - copy the principal
3. Call `icrc1_transfer` with:
   - `to.owner`: The minting principal from step 2
   - `to.subaccount`: null
   - `amount`: `35_150_100_100_000_000` (nat)
   - `fee`: null
   - `memo`: null
   - `from_subaccount`: null
   - `created_at_time`: null

## Important Notes

⚠️ **Authentication Required**: You must be authenticated as the identity that currently holds the excess tokens (likely the minting account owner).

⚠️ **Irreversible**: Once burned, tokens cannot be recovered.

⚠️ **Mainnet vs Local**: Make sure you're using the correct network flag (`--network ic` for mainnet).

## Verification

After burning, verify:

1. **Total Supply Check**:
   ```bash
   dfx canister call tokenmania icrc1_total_supply --network ic
   ```
   Should return: `(100_000_000_000_000_000 : nat)`

2. **Visit Token Stats Page**:
   Navigate to `/token-stats` and verify:
   - Minted Supply: 1,000,000,000.00 PULSE
   - Percentage: 100%
   - Remaining: 0 PULSE

## Alternative: Reset and Redeploy (ONLY for local testing)

If this is still local development and you want a clean slate:

```bash
# Stop dfx
dfx stop

# Clean everything
dfx start --clean --background

# Redeploy with correct initial supply
dfx deploy tokenmania

# Create token with 1 billion max supply
dfx canister call tokenmania create_token '(record {
  token_name = "PULSE";
  token_symbol = "PULSE";
  initial_supply = 100_000_000_000_000_000 : nat;  // 1 billion PULSE in e8s
  token_logo = "YOUR_LOGO_URL";
})'
```

⚠️ **WARNING**: This will wipe all existing data. Only use for local development!

## For Mainnet Deployment

If you haven't deployed to mainnet yet, deploy the updated tokenmania.mo with the max supply cap BEFORE creating the token, and ensure initial_supply ≤ 1 billion PULSE.
