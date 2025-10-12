# PULSE Token Holders Report
**Date:** 2025-10-12
**Network:** ICP Mainnet
**Total Supply:** 1,351,501,000.997 PULSE

---

## Token Distribution Summary

| Holder | Canister ID | Balance (e8s) | Balance (PULSE) | % of Supply |
|--------|-------------|---------------|-----------------|-------------|
| **Minting Account** | amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe | 100,000,000,100,000,000 | **1,000,000,001.00** | **73.99%** |
| **Swap Canister** | 3ana2-mqaaa-aaaao-a4p2q-cai | 99,995,525,420,000 | **999,955.254** | **0.074%** |
| **Airdrop Canister** | 27ftn-piaaa-aaaao-a4p6a-cai | 50,000,000,000,000 | **500,000.00** | **0.037%** |
| **Backend Canister** | u2j5c-sqaaa-aaaao-a4o6q-cai | 300,000,000 | **3.00** | **0.0000022%** |
| **Staking Canister** | 2kcca-oaaaa-aaaao-a4p5q-cai | 0 | **0** | **0%** |
| **IDO Platform** | ej3ry-6qaaa-aaaai-atlza-cai | 0 | **0** | **0%** |
| **Other Holders** | (Multiple addresses) | ~35,100,000,000,000 | **~351,000,000** | **~25.97%** |

---

## Detailed Analysis

### 1. Minting Account (73.99%)
**Principal:** `amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe`
**Balance:** 1,000,000,001 PULSE

**Status:** ⚠️ High Concentration
- Holds majority of tokens
- Likely the original token creator/team account
- Needs distribution plan

**Recommendations:**
- Define clear allocation strategy
- Consider multi-sig governance
- Time-locked vesting for team allocations

---

### 2. Swap Canister (0.074%)
**Principal:** `3ana2-mqaaa-aaaao-a4p2q-cai`
**Balance:** 999,955.254 PULSE

**Status:** ✅ Active
- Holds tokens for ckUSDC ↔ PULSE swaps
- Nearly 1M PULSE in liquidity
- Operating correctly

**Purpose:** DEX functionality for token swaps

---

### 3. Airdrop Canister (0.037%)
**Principal:** `27ftn-piaaa-aaaao-a4p6a-cai`
**Balance:** 500,000 PULSE

**Status:** ✅ Allocated
- Holds tokens for airdrop campaigns
- Modest allocation for user rewards
- Can be topped up as needed

**Purpose:** User incentives and reward campaigns

---

### 4. Backend Canister (0.0000022%)
**Principal:** `u2j5c-sqaaa-aaaao-a4o6q-cai`
**Balance:** 3.00 PULSE

**Status:** ✅ Minimal
- Small testing/operational balance
- Not a primary holder

**Purpose:** Poll/survey backend operations

---

### 5. Staking Canister (0%)
**Principal:** `2kcca-oaaaa-aaaao-a4p5q-cai`
**Balance:** 0 PULSE

**Status:** ⚠️ Not Funded
- Staking functionality requires PULSE for rewards
- May need allocation if staking is active

**Recommendation:** Fund if staking program is launching

---

### 6. IDO Platform (0%)
**Principal:** `ej3ry-6qaaa-aaaai-atlza-cai`
**Balance:** 0 PULSE

**Status:** ❌ NOT FUNDED
- Expected 350M PULSE allocation
- Transfer never completed
- IDO cannot operate without tokens

**Critical Action Required:** Transfer 350M PULSE if IDO is active

---

### 7. Other Holders (~25.97%)
**Estimated:** ~351,000,000 PULSE

**Status:** 🔍 Unknown Distribution
- Likely distributed to:
  - Early users/participants
  - Poll/survey rewards
  - Team members
  - Other contracts

**Action Needed:**
- Scan transaction log to identify all holders
- Verify intended vs actual distribution
- Document allocation plan

---

## Key Observations

### ✅ Working Systems
1. **Swap functionality:** Has adequate liquidity (1M PULSE)
2. **Airdrop system:** Funded and operational (500K PULSE)
3. **Backend operations:** Minimal balance for testing

### ❌ Issues Found
1. **IDO Platform unfunded:** 0 PULSE vs expected 350M
2. **Excessive total supply:** 1.35B vs 1B cap
3. **High concentration:** 74% in minting account
4. **Staking unfunded:** 0 PULSE (may need allocation)

### 🔍 Unknown
1. **Identity of "Other Holders"** (~351M PULSE, 26%)
   - Are these legitimate distributions?
   - Part of excess that needs burning?
   - Team allocations?

---

## Recommended Actions

### Immediate (Priority 1)
1. **Investigate "Other Holders"** (~351M PULSE)
   - Query transaction log to identify all recipients
   - Verify if these are legitimate distributions
   - Determine if part of excess to burn

2. **Decision on IDO allocation**
   - Confirm if 350M PULSE still needed for IDO
   - If yes: Transfer after burning excess
   - If no: Update tokenomics documentation

### Short-term (Priority 2)
3. **Burn excess supply** (351M PULSE)
   - Get to 1 billion cap
   - Restore investor confidence
   - Align with smart contract enforcement

4. **Document token allocation**
   - Create transparency report
   - Publish holder breakdown (anonymized if needed)
   - Update tokenomics in README

### Medium-term (Priority 3)
5. **Distribute from minting account**
   - Reduce 74% concentration
   - Execute vesting schedules
   - Fund ecosystem growth initiatives

6. **Multi-sig governance**
   - Protect minting account
   - Require multiple approvals for large transfers
   - Increase decentralization

---

## How to Find All Token Holders

The tokenmania contract doesn't expose a `get_all_holders()` function. To find all holders:

### Method 1: Add Query Function (Recommended)
Add to `tokenmania.mo`:
```motoko
public query func get_all_holders() : async [(Principal, Nat)] {
  // Scan transaction log and build holder map
  // Return list of (principal, balance) tuples
}
```

### Method 2: Scan Transaction Log
```bash
# Query all transactions (if exposed)
dfx canister call tokenmania get_transactions --network ic

# Parse Mint and Transfer operations
# Build map of unique principals
# Query balance for each
```

### Method 3: External Indexer
- Use ICP blockchain explorers
- ICDex, ICPSwap analytics
- Build custom indexer scanning blocks

---

## Next Steps

1. ✅ **Run holder analysis:** Complete (this report)
2. 🔍 **Identify "Other Holders":** Add transaction scanning
3. ❌ **Burn excess tokens:** 351M PULSE → 1B cap
4. ⚠️ **Fund IDO platform:** 350M PULSE (if needed)
5. 📊 **Document allocation:** Transparent tokenomics

---

**Questions for Token Team:**

1. Who are the ~351M "Other Holders"?
2. Should 350M still go to IDO platform?
3. What's the vesting schedule for team tokens?
4. When will staking rewards begin (funding needed)?
5. Is there a public token allocation document?
