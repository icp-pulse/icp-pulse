# Token Supply Recovery Plan

## Current Crisis

**Current Supply:** 2,406,004,003.988 PULSE
**Target Supply:** 1,000,000,000 PULSE
**Excess:** 1,406,004,003.988 PULSE

We've been accidentally **minting** instead of **burning** because:
- Transfers FROM minting account = MINT (increases supply)
- Transfers TO minting account = BURN (decreases supply)

## Why This Keeps Happening

Your dfx identity IS the minting account principal. When you call `icrc1_transfer`, it uses YOUR identity as the `from` account, which triggers the mint logic.

## The ONLY Way to Burn

**Transfer TO the minting account FROM a non-minting account.**

## Solution: Use IDO Platform to Burn

The IDO platform (`eay2e-iyaaa-aaaai-atlyq-cai`) has 350M PULSE. We can burn from there.

### Step 1: Burn 350M from IDO Platform

Go to your IDO project directory and run:

```bash
cd /Users/east/workspace/icp/motoko-icp-ido

# Call the IDO backend to transfer tokens to minting account (= burn)
dfx canister call backend burn_tokens_to_minting_account '(35_000_000_000_000_000 : nat)' --network ic
```

**If the IDO canister doesn't have a burn function**, you'll need to add one or use a transfer function that sends TO the tokenmania minting account.

### Step 2: Burn Remaining 1,056,004,003.988 PULSE

We still need to burn 1.056 billion more PULSE. Options:

#### Option A: Transfer to Temp Account, Then Burn

1. Create a new dfx identity (temporary holder):
   ```bash
   dfx identity new temp_burner
   dfx identity use temp_burner
   TEMP_PRINCIPAL=$(dfx identity get-principal)
   echo $TEMP_PRINCIPAL
   ```

2. Switch back to minting account and transfer 1.056B to temp:
   ```bash
   dfx identity use default  # Your minting account

   dfx canister call tokenmania icrc1_transfer "(record {
     to = record {
       owner = principal \"$TEMP_PRINCIPAL\";
       subaccount = null;
     };
     amount = 105_600_400_099_700_000;
     fee = opt 10_000;
     memo = null;
     created_at_time = null;
   })" --network ic
   ```

3. Switch to temp identity and burn by sending back to minting:
   ```bash
   dfx identity use temp_burner

   dfx canister call tokenmania icrc1_transfer "(record {
     to = record {
       owner = principal \"amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe\";
       subaccount = null;
     };
     amount = 105_600_400_099_690_000;  # Minus fee
     fee = opt 10_000;
     memo = null;
     created_at_time = null;
   })" --network ic
   ```

#### Option B: Fix the Code (Better Long-term)

The real issue is that the ICRC-1 reference implementation has this logic backwards for our use case. We should fix it:

In `classifyTransfer`, change:
```motoko
let result = if (accountsEqual(transfer.from, minter)) {
  // This should ONLY trigger for INITIAL mints or explicit mint functions
  // Regular transfers from minting account should NOT be mints!
```

But this would break ICRC-1 standard compliance.

## Recommended Immediate Action

1. **Stop trying to burn from minting account** - it will only make things worse
2. **Use IDO platform** to burn its 350M PULSE first
3. **Use temp identity method** (Option A above) to burn the remaining ~1.056B PULSE
4. **Re-enable validation** once supply reaches 1B
5. **Deploy final contract**

## Math Check

```
Current: 2,406,004,003.988 PULSE
- Burn from IDO: 350,000,000.000 PULSE
= After IDO burn: 2,056,004,003.988 PULSE

- Burn via temp: 1,056,004,003.988 PULSE
= Final: 1,000,000,000.000 PULSE ✅
```

## Prevention for Future

Once this is fixed:
1. ✅ Re-enable MAX_SUPPLY validation
2. ✅ Add a dedicated `burn()` function that only works FROM non-minting accounts
3. ✅ Add admin `emergency_burn()` function for situations like this
4. ✅ Test on local/testnet first!

---

**Next Step:** Which option do you want to use?
- Option A: Use IDO + temp identity (requires IDO canister access)
- Option B: Just use temp identity for all 1.4B burn
