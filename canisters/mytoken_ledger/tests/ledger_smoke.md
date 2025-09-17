# ICRC-1 Ledger Smoke Tests

Comprehensive manual testing checklist for the TruePulse Token (TPULSE) ledger.

## Prerequisites

- [ ] dfx is running (`dfx start --background`)
- [ ] Test principals are available (use `dfx identity list`)
- [ ] Updated `init.json` with real principals (not placeholders)

## Test Environment Setup

```bash
# Get your principal
export ADMIN_PRINCIPAL=$(dfx identity get-principal)

# Create test identity
dfx identity new test-user
export TEST_PRINCIPAL=$(dfx identity --identity test-user get-principal)

# Switch back to default identity
dfx identity use default
```

## 1. Deployment Tests

### 1.1 Deploy Ledger
- [ ] **Deploy with configuration:**
  ```bash
  npm run ic:deploy:token
  # OR
  dfx deploy mytoken_ledger --argument-file canisters/mytoken_ledger/init.json
  ```
- [ ] **Verify deployment successful** (no errors)
- [ ] **Note canister ID:** `_________________`

### 1.2 Verify Deployment
- [ ] **Check canister status:**
  ```bash
  dfx canister status mytoken_ledger
  ```
- [ ] **Verify canister is running**

## 2. Basic Query Tests

### 2.1 Token Metadata
- [ ] **Query token name:**
  ```bash
  dfx canister call mytoken_ledger icrc1_name
  ```
  Expected: `("TruePulse Token")`

- [ ] **Query token symbol:**
  ```bash
  dfx canister call mytoken_ledger icrc1_symbol
  ```
  Expected: `("TPULSE")`

- [ ] **Query decimals:**
  ```bash
  dfx canister call mytoken_ledger icrc1_decimals
  ```
  Expected: `(8 : nat8)`

- [ ] **Query transfer fee:**
  ```bash
  dfx canister call mytoken_ledger icrc1_fee
  ```
  Expected: `(1_000 : nat)`

### 2.2 Supply Information
- [ ] **Query total supply:**
  ```bash
  dfx canister call mytoken_ledger icrc1_total_supply
  ```
  Expected: `(100_000_000_000 : nat)` (1,000 TPULSE)

- [ ] **Query minting account:**
  ```bash
  dfx canister call mytoken_ledger icrc1_minting_account
  ```
  Expected: `(opt record { owner = principal "..."; subaccount = null })`

### 2.3 Balance Queries
- [ ] **Query admin balance:**
  ```bash
  dfx canister call mytoken_ledger icrc1_balance_of "(record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = null })"
  ```
  Expected: `(100_000_000_000 : nat)` (initial supply)

- [ ] **Query test user balance:**
  ```bash
  dfx canister call mytoken_ledger icrc1_balance_of "(record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null })"
  ```
  Expected: `(0 : nat)`

## 3. Transfer Tests

### 3.1 Basic Transfer
- [ ] **Transfer tokens from admin to test user:**
  ```bash
  dfx canister call mytoken_ledger icrc1_transfer "(record {
    to = record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null };
    amount = 50_000_000_000;
    fee = null;
    memo = null;
    created_at_time = null;
    from_subaccount = null;
  })"
  ```
  Expected: `(variant { Ok = 1 : nat })` (transaction index)

### 3.2 Verify Transfer
- [ ] **Check admin balance after transfer:**
  ```bash
  dfx canister call mytoken_ledger icrc1_balance_of "(record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = null })"
  ```
  Expected: `(49_999_999_000 : nat)` (500 TPULSE - 0.00001 fee)

- [ ] **Check test user balance after transfer:**
  ```bash
  dfx canister call mytoken_ledger icrc1_balance_of "(record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null })"
  ```
  Expected: `(50_000_000_000 : nat)` (500 TPULSE)

### 3.3 Transfer Back
- [ ] **Switch to test user identity:**
  ```bash
  dfx identity use test-user
  ```

- [ ] **Transfer from test user back to admin:**
  ```bash
  dfx canister call mytoken_ledger icrc1_transfer "(record {
    to = record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = null };
    amount = 10_000_000_000;
    fee = null;
    memo = null;
    created_at_time = null;
    from_subaccount = null;
  })"
  ```
  Expected: `(variant { Ok = 2 : nat })`

- [ ] **Switch back to default identity:**
  ```bash
  dfx identity use default
  ```

## 4. ICRC-2 Approval Tests

### 4.1 Check ICRC-2 Support
- [ ] **Query supported standards:**
  ```bash
  dfx canister call mytoken_ledger icrc1_supported_standards
  ```
  Expected: Should include ICRC-2 in the list

### 4.2 Approval Flow
- [ ] **Admin approves test user to spend tokens:**
  ```bash
  dfx canister call mytoken_ledger icrc2_approve "(record {
    spender = record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null };
    amount = 20_000_000_000;
    fee = null;
    memo = null;
    created_at_time = null;
    from_subaccount = null;
    expected_allowance = null;
    expires_at = null;
  })"
  ```
  Expected: `(variant { Ok = 3 : nat })`

### 4.3 Check Allowance
- [ ] **Query allowance:**
  ```bash
  dfx canister call mytoken_ledger icrc2_allowance "(record {
    account = record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = null };
    spender = record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null };
  })"
  ```
  Expected: `(record { allowance = 20_000_000_000 : nat; expires_at = null })`

### 4.4 Transfer From
- [ ] **Switch to test user identity:**
  ```bash
  dfx identity use test-user
  ```

- [ ] **Test user transfers from admin's account:**
  ```bash
  dfx canister call mytoken_ledger icrc2_transfer_from "(record {
    from = record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = null };
    to = record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null };
    amount = 15_000_000_000;
    fee = null;
    memo = null;
    created_at_time = null;
    spender_subaccount = null;
  })"
  ```
  Expected: `(variant { Ok = 4 : nat })`

### 4.5 Verify Transfer From
- [ ] **Check remaining allowance:**
  ```bash
  dfx canister call mytoken_ledger icrc2_allowance "(record {
    account = record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = null };
    spender = record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null };
  })"
  ```
  Expected: `(record { allowance = 4_999_999_000 : nat; expires_at = null })` (reduced by amount + fee)

- [ ] **Switch back to default identity:**
  ```bash
  dfx identity use default
  ```

## 5. Error Testing

### 5.1 Insufficient Funds
- [ ] **Attempt to transfer more than balance:**
  ```bash
  dfx canister call mytoken_ledger icrc1_transfer "(record {
    to = record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null };
    amount = 999_999_999_999;
    fee = null;
    memo = null;
    created_at_time = null;
    from_subaccount = null;
  })"
  ```
  Expected: `(variant { Err = variant { InsufficientFunds = record { balance = ... } } })`

### 5.2 Insufficient Allowance
- [ ] **Switch to test user and attempt transfer beyond allowance:**
  ```bash
  dfx identity use test-user
  dfx canister call mytoken_ledger icrc2_transfer_from "(record {
    from = record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = null };
    to = record { owner = principal \"$TEST_PRINCIPAL\"; subaccount = null };
    amount = 99_999_999_999;
    fee = null;
    memo = null;
    created_at_time = null;
    spender_subaccount = null;
  })"
  ```
  Expected: `(variant { Err = variant { InsufficientAllowance = record { allowance = ... } } })`

- [ ] **Switch back to default identity:**
  ```bash
  dfx identity use default
  ```

## 6. Final Verification

### 6.1 Final Balances
- [ ] **Verify all balances are as expected**
- [ ] **Verify total supply unchanged** (should still be 100_000_000_000)

### 6.2 Transaction History
- [ ] **Query transaction count:**
  ```bash
  dfx canister call mytoken_ledger get_transactions "(record { start = 0; length = 10 })"
  ```
- [ ] **Verify transaction history matches test operations**

## Test Results Summary

**Date:** _______________  
**Tester:** _______________  
**Ledger Canister ID:** _______________

**Results:**
- [ ] All basic queries passed
- [ ] Transfer functionality working
- [ ] ICRC-2 approvals working
- [ ] ICRC-2 transfer_from working
- [ ] Error handling correct
- [ ] No unexpected failures

**Notes:**
_________________________________
_________________________________
_________________________________

## Cleanup (Optional)

```bash
# Remove test identity
dfx identity remove test-user

# Stop local network
dfx stop
```