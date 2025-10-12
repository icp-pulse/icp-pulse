# PULSE Token Burn Strategy

## Current Situation

- **Current Supply:** 1,351,501,001 PULSE
- **Target Supply:** 1,000,000,000 PULSE
- **Excess to Burn:** 351,501,001 PULSE

## The Problem

The tokenmania contract has a MAX_SUPPLY validation check that prevents ANY transaction when the current supply exceeds the limit. This affects:

1. ❌ **Can't mint** - Would exceed cap
2. ❌ **Can't transfer from minting account** - Triggers mint validation
3. ❌ **Can't burn from minting account** - Same validation applies

The issue is that the persistent actor retained the old MAX_SUPPLY value (100_000_000_000_000_000 from initial deployment), and `let` constants cannot be updated on upgrade.

## Solution Options

### Option 1: Burn from IDO Platform ✅ RECOMMENDED

**Strategy:** Transfer 350M PULSE from IDO platform to minting account (= burn)

**Steps:**
1. Access IDO platform canister (`eay2e-iyaaa-aaaai-atlyq-cai`)
2. Transfer 350,000,000 PULSE to minting account
3. This reduces supply to 1,001,501,001 PULSE
4. Then burn remaining 1,501,001 PULSE from another holder or accept 1.0015B as "close enough"

**Pros:**
- ✅ Doesn't trigger MAX_SUPPLY validation (not from minting account)
- ✅ Can execute immediately
- ✅ Gets very close to 1B target

**Cons:**
- ⚠️ IDO platform will have 0 PULSE (can't operate)
- ⚠️ Defeats purpose of IDO allocation

### Option 2: Fix Contract Code & Redeploy

**Strategy:** Change MAX_SUPPLY from `let` to `var` so it can be updated

**Steps:**
1. Modify `backend/tokenmania.mo`:
   ```motoko
   // Change from:
   private let MAX_SUPPLY : Nat = 135_000_000_000_000_000;

   // To:
   private var maxSupply : Nat = 200_000_000_000_000_000;  // Start high

   // Add update function:
   public shared ({ caller }) func update_max_supply(newMax : Nat) : async Result<Text, Text> {
     if (not Principal.equal(caller, init.minting_account.owner)) {
       return #Err("Only minting account can update max supply");
     };
     maxSupply := newMax;
     #Ok("Max supply updated");
   };
   ```

2. Deploy updated contract
3. Burn 351,501,001 PULSE
4. Set maxSupply to 100_000_000_000_000_000 (1B)

**Pros:**
- ✅ Allows precise control over supply
- ✅ Can burn from minting account
- ✅ Maintains IDO allocation if desired

**Cons:**
- ⚠️ Requires code changes and deployment
- ⚠️ More complex

### Option 3: Accept Current Supply

**Strategy:** Keep 1.35B as the official max supply

**Steps:**
1. Update documentation to reflect 1.35B cap
2. Burn only 1,501,001 PULSE to reach exactly 1.35B
3. Keep IDO allocation (350M PULSE)
4. Update marketing: "1.35 billion fixed supply"

**Pros:**
- ✅ Simplest solution
- ✅ IDO platform remains funded
- ✅ Still a hard cap (no inflation)

**Cons:**
- ⚠️ Changes from "1 billion" promise
- ⚠️ Requires community communication

## Recommended Path Forward

Given your request to reach 1 billion PULSE, I recommend **Option 2** (Fix & Redeploy):

### Implementation Plan

1. **Update tokenmania.mo** to use `var maxSupply` instead of `let MAX_SUPPLY`
2. **Add admin function** to update max supply
3. **Deploy** updated contract
4. **Set maxSupply high** (200B temporarily)
5. **Burn tokens** from minting account:
   - First: Burn 350M PULSE (eliminates IDO allocation)
   - Second: Burn 1,501,001 PULSE (reaches exactly 1B)
6. **Set maxSupply to 1B** (locks in final cap)
7. **Update documentation** and frontend

### Alternative: Two-Step Approach

If you want to keep SOME IDO allocation:

1. Burn 250M from IDO (keep 100M for IDO)
2. Burn 101,501,001 from minting account
3. Final: 1,000,000,000 PULSE (1B) with 100M reserved for future IDO

## Commands to Execute (After Fix)

### Step 1: Deploy Fixed Contract
```bash
dfx deploy tokenmania --network ic
```

### Step 2: Temporarily Increase Max Supply
```bash
dfx canister call tokenmania update_max_supply '(200_000_000_000_000_000 : nat)' --network ic
```

### Step 3: Burn 350M PULSE
```bash
# From IDO platform canister
dfx canister call eay2e-iyaaa-aaaai-atlyq-cai icrc1_transfer "(record {
  to = record {
    owner = principal \"amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe\";
    subaccount = null;
  };
  amount = 35_000_000_000_000_000;
  fee = opt 10_000;
  memo = null;
  created_at_time = null;
})" --network ic
```

### Step 4: Burn Remaining 1,501,001 PULSE
```bash
dfx canister call tokenmania icrc1_transfer "(record {
  to = record {
    owner = principal \"amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe\";
    subaccount = null;
  };
  amount = 150_100_100_000_000;
  fee = opt 10_000;
  memo = null;
  created_at_time = null;
})" --network ic
```

### Step 5: Lock in 1B Max Supply
```bash
dfx canister call tokenmania update_max_supply '(100_000_000_000_000_000 : nat)' --network ic
```

### Step 6: Verify
```bash
dfx canister call tokenmania icrc1_total_supply --network ic
# Should return: (100_000_000_000_000_000 : nat)

dfx canister call tokenmania icrc1_max_supply --network ic
# Should return: (100_000_000_000_000_000 : nat)
```

## Impact Analysis

### If We Burn All 351M (Reach 1B)

| Account | Before | After | Change |
|---------|--------|-------|--------|
| Minting Account | 1,000,000,001 | 1,000,000,000 | -1 |
| IDO Platform | 350,000,000 | 0 | -350M |
| Swap | 999,955 | 999,955 | 0 |
| Airdrop | 500,000 | 500,000 | 0 |
| Users | 1,041 | 1,041 | 0 |
| **TOTAL** | **1,351,501,001** | **1,000,000,000** | **-351,501,001** |

**Implications:**
- ✅ Reaches 1 billion cap promise
- ❌ IDO platform unfunded (can't operate)
- ⚠️ Need alternative plan for public token sale

### If We Keep 100M for IDO (Modified Plan)

| Account | Before | After | Change |
|---------|--------|-------|--------|
| Minting Account | 1,000,000,001 | 898,498,999 | -101,501,002 |
| IDO Platform | 350,000,000 | 100,000,000 | -250M |
| Others | 1,500,996 | 1,500,996 | 0 |
| **TOTAL** | **1,351,501,001** | **1,000,000,000** | **-351,501,001** |

**Implications:**
- ✅ Reaches 1 billion cap
- ✅ IDO has 100M PULSE (10% of supply)
- ✅ Can still run public sale

## Decision Required

**Please confirm:**
1. Do you want to reach exactly 1 billion PULSE? (Yes/No)
2. Should we eliminate the IDO allocation entirely? (Yes/No)
3. Or keep some tokens for IDO? (If yes, how much?)

Based on your answer, I'll implement Option 2 with the appropriate burn amounts.

## Next Steps

Waiting for your decision on:
- [ ] Target final supply (1B or 1.35B)
- [ ] IDO allocation (0, 100M, or keep 350M)
- [ ] Approval to modify contract code

Once confirmed, I'll:
1. Update tokenmania.mo with `var maxSupply`
2. Add admin function to update max supply
3. Deploy and execute burn sequence
4. Update frontend and documentation
