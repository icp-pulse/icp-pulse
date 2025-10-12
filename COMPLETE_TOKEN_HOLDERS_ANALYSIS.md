# COMPLETE PULSE Token Holders Analysis
**Date:** 2025-10-12
**Network:** ICP Mainnet
**Total Transactions:** 36
**Total Supply:** 1,351,501,001.00 PULSE

---

## 🎯 MYSTERY SOLVED: The 351M "Other Holders" Found!

The 351 million PULSE tokens are held by **ONE single address**:

**Principal:** `eay2e-iyaaa-aaaai-atlyq-cai`
**Balance:** 350,000,000.00 PULSE (35,000,000,000,000,000 e8s)
**Percentage:** 25.90% of total supply

---

## Complete Token Holder Distribution

| # | Principal | Balance (PULSE) | Balance (e8s) | % of Supply | Identity |
|---|-----------|-----------------|---------------|-------------|----------|
| 1 | `amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe` | **1,000,000,001.00** | 100,000,000,100,000,000 | **73.99%** | 🏦 **Minting Account** |
| 2 | `eay2e-iyaaa-aaaai-atlyq-cai` | **350,000,000.00** | 35,000,000,000,000,000 | **25.90%** | 🔍 **UNKNOWN CANISTER** |
| 3 | `3ana2-mqaaa-aaaao-a4p2q-cai` | **999,955.254** | 99,995,525,420,000 | **0.074%** | 💱 **Swap Canister** |
| 4 | `27ftn-piaaa-aaaao-a4p6a-cai` | **500,000.00** | 50,000,000,000,000 | **0.037%** | 🎁 **Airdrop Canister** |
| 5 | `7aiiu-rkwon-btjqa-c5sel-564ua-q74km-yacm7-vtglq-hzgtb-wv5y5-rae` | **20.7436** | 2,074,360,000 | **0.0000015%** | 👤 **User/Wallet** |
| 6 | `hemhy-obvak-j3oz2-cuxer-bm7cq-5okei-kogb7-lcwt7-t4dur-frceb-6qe` | **21.00** | 2,100,000,000 | **0.0000016%** | 👤 **User/Wallet** |
| 7 | `ues2k-6iwxj-nbezb-owlhg-nsem4-abqjc-74ocv-lsxps-ytjv4-2tphv-yqe` | **998.9999** | 99,899,990,000 | **0.000074%** | 👤 **User/Wallet** |
| 8 | `2vxsx-fae` | **0.9993** | 99,930,000 | **0.000000074%** | 👤 **User/Wallet** |
| 9 | `u2j5c-sqaaa-aaaao-a4o6q-cai` | **3.00** | 300,000,000 | **0.00000022%** | 🖥️ **Backend Canister** |

**Total Holders:** 9 addresses

---

## 🚨 Critical Finding: Unknown Canister Holds 350M PULSE

### The Mystery Address: `eay2e-iyaaa-aaaai-atlyq-cai`

**Balance:** 350,000,000 PULSE (exactly!)
**Status:** ⚠️ **UNKNOWN IDENTITY**

### Possible Scenarios:

1. **Scenario A: This IS the IDO Platform**
   - You mentioned checking if 350M went to `ej3ry-6qaaa-aaaai-atlza-cai`
   - But this address is `eay2e-iyaaa-aaaai-atlyq-cai` (different!)
   - **Possibility:** Wrong canister ID in documentation?
   - **Action:** Check if `eay2e-iyaaa-aaaai-atlyq-cai` is your IDO platform

2. **Scenario B: Unintended Recipient**
   - 350M was supposed to go to `ej3ry-6qaaa-aaaai-atlza-cai` (still has 0)
   - Instead went to `eay2e-iyaaa-aaaai-atlyq-cai` (has 350M)
   - **Possibility:** Copy-paste error or wrong address used
   - **Risk:** Tokens sent to wrong canister

3. **Scenario C: Legitimate Allocation**
   - This is an intentional allocation (team, treasury, etc.)
   - Just not documented in your tokenomics
   - **Action:** Verify if this is a known project canister

---

## How to Identify the Unknown Canister

### Method 1: Check Your dfx.json
```bash
cat dfx.json | grep "eay2e-iyaaa-aaaai-atlyq-cai"
```

### Method 2: Query Canister Info
```bash
# Get canister status
dfx canister status eay2e-iyaaa-aaaai-atlyq-cai --network ic

# Check if it's one of your canisters
dfx canister id frontend --network ic
dfx canister id polls_surveys_backend --network ic
# ... etc for all your canisters
```

### Method 3: Check Transaction History
Since you have 36 transactions, let's see when this 350M transfer occurred:

```bash
dfx canister call tokenmania get_transactions '(0 : nat, 36 : nat)' --network ic | grep -A 10 "eay2e-iyaaa-aaaai-atlyq-cai"
```

---

## Token Distribution Pie Chart

```
┌─────────────────────────────────────────────────────┐
│ PULSE Token Distribution (1.35B Total)             │
├─────────────────────────────────────────────────────┤
│ █████████████████████████████████ 73.99% Minting   │
│ ████████ 25.90% Unknown Canister (350M)            │
│ ▌ 0.11% All Others (Swap, Airdrop, Users)          │
└─────────────────────────────────────────────────────┘
```

---

## Breakdown of "All Others" (0.11% = 1.5M PULSE)

| Category | Balance (PULSE) | % of Supply | Count |
|----------|-----------------|-------------|-------|
| Swap Canister | 999,955.25 | 0.074% | 1 |
| Airdrop Canister | 500,000.00 | 0.037% | 1 |
| Individual Users | 1,040.74 | 0.000077% | 4 |
| Backend Canister | 3.00 | 0.00000022% | 1 |
| **Total** | **1,500,998.99** | **0.111%** | **7 addresses** |

---

## User Holder Details

These appear to be early users/testers who received small amounts:

1. **7aiiu-rkwon...** - 20.74 PULSE (likely test airdrop recipient)
2. **hemhy-obvak...** - 21.00 PULSE (likely test airdrop recipient)
3. **ues2k-6iwxj...** - 998.99 PULSE (early user/tester)
4. **2vxsx-fae** - 0.99 PULSE (dust/test amount)

**Total circulating to users:** ~1,041 PULSE (0.000077% of supply)

---

## Corrected Token Allocation Report

### As Documented vs. Actual

| Category | Expected | Actual | Status |
|----------|----------|--------|--------|
| Minting Account | Unknown | 1,000,000,001 PULSE | ✅ |
| IDO Platform (`ej3ry-6qaaa-aaaai-atlza-cai`) | 350M | **0 PULSE** | ❌ **NOT FUNDED** |
| Unknown Canister (`eay2e-iyaaa-aaaai-atlyq-cai`) | 0 | **350M PULSE** | ⚠️ **UNEXPECTED** |
| Swap Canister | Unknown | 999,955 PULSE | ✅ |
| Airdrop Canister | Unknown | 500,000 PULSE | ✅ |
| Backend Canister | Unknown | 3 PULSE | ✅ |
| User Wallets | Unknown | 1,041 PULSE | ✅ |

---

## Critical Questions to Answer

### 1. Is `eay2e-iyaaa-aaaai-atlyq-cai` your IDO platform?
   - **If YES:** Documentation has wrong canister ID
   - **If NO:** 350M PULSE is in unknown hands!

### 2. Is this canister controlled by your team?
   - Check dfx.json and deployment records
   - Verify canister controller

### 3. Was this transfer intentional?
   - Review transaction #X (when 350M was sent)
   - Check who authorized the transfer
   - Verify destination was correct

---

## Immediate Action Items

### Priority 1: IDENTIFY THE UNKNOWN CANISTER ⚠️

```bash
# Check if it's one of your canisters
dfx canister id --all --network ic | grep "eay2e-iyaaa-aaaai-atlyq-cai"

# Get canister info
dfx canister status eay2e-iyaaa-aaaai-atlyq-cai --network ic

# See when the transfer occurred
dfx canister call tokenmania get_transactions '(0 : nat, 36 : nat)' --network ic > all_transactions.txt
grep -A 20 "eay2e-iyaaa-aaaai-atlyq-cai" all_transactions.txt
```

### Priority 2: Verify Controllers

```bash
# Check who controls the unknown canister
dfx canister info eay2e-iyaaa-aaaai-atlyq-cai --network ic

# Compare with your expected IDO platform
dfx canister info ej3ry-6qaaa-aaaai-atlza-cai --network ic
```

### Priority 3: Decision Matrix

**IF the unknown canister is yours:**
- ✅ Update documentation with correct canister ID
- ✅ Verify it's the intended IDO platform
- ✅ Continue with burn plan (351M excess)

**IF the unknown canister is NOT yours:**
- 🚨 CRITICAL: 350M PULSE sent to wrong address!
- ❌ Cannot retrieve (transfers are irreversible)
- ⚠️ Need to decide: burn minting account tokens OR mint 350M to correct IDO

---

## Next Steps

1. **Identify `eay2e-iyaaa-aaaai-atlyq-cai` immediately**
2. **Review transaction log** to see when/how 350M was sent
3. **Verify canister ownership** and controllers
4. **Update documentation** with findings
5. **Execute burn plan** (if allocation is correct)

---

## Transaction Investigation Commands

```bash
# Get all 36 transactions
dfx canister call tokenmania get_transactions '(0 : nat, 36 : nat)' --network ic > full_transaction_log.txt

# Search for the 350M transfer
grep -B 5 -A 10 "35_000_000_000_000_000" full_transaction_log.txt

# Find all transfers to unknown canister
grep -B 5 -A 10 "eay2e-iyaaa-aaaai-atlyq-cai" full_transaction_log.txt

# Check minting operations
grep -B 5 -A 10 "Mint" full_transaction_log.txt
```

---

## Summary

✅ **Solved:** Identified all 9 token holders
⚠️ **Critical Finding:** 350M PULSE in unknown canister `eay2e-iyaaa-aaaai-atlyq-cai`
❌ **Concern:** Expected IDO platform `ej3ry-6qaaa-aaaai-atlza-cai` has 0 PULSE
🔍 **Next:** Identify ownership of `eay2e-iyaaa-aaaai-atlyq-cai`

---

**The 351M "Other Holders" mystery is now a 350M "Unknown Canister" investigation!**
