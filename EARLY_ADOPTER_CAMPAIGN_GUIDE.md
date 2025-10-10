# Early Adopter Campaign Setup Guide

## Overview

Create an airdrop campaign to reward early adopters of ICP Pulse with PULSE tokens based on their activity before a specific cutoff date.

## Campaign Duration

### ⚠️ Important: Duration Cannot Be Changed

Once a campaign is created, the **duration (endTime) is fixed** and cannot be modified. Choose your duration carefully:

- **30 days**: Good for quick campaigns, monthly rewards
- **90 days**: Better for quarterly campaigns, gives users more time to claim
- **Custom**: You can set any duration in days

**Recommendation**: Use **90 days** for early adopter campaigns to give everyone enough time to claim, especially if they're not active daily.

## Step-by-Step: Create Early Adopter Campaign

### 1. Deploy Airdrop Canister (Already Done ✅)

Your airdrop canister is already deployed:
- **Mainnet**: `27ftn-piaaa-aaaao-a4p6a-cai`
- **Local**: Run `dfx deploy airdrop`

### 2. Create the Campaign

```bash
# Create a 90-day early adopter campaign
dfx canister call airdrop create_campaign '(
  "Early Adopter Rewards Q1 2025",
  "Thank you for being an early supporter of ICP Pulse! Claim your PULSE tokens.",
  50_000_000_000_000 : nat,  // 500,000 PULSE total pool (50M * 10^8)
  90 : nat  // 90 days duration
)' --network ic

# Returns: (variant { ok = 1 : nat })  <- This is your campaignId
```

**Alternative: 30-day campaign**
```bash
dfx canister call airdrop create_campaign '(
  "Early Adopter Rewards Q1 2025",
  "Thank you for being an early supporter of ICP Pulse!",
  50_000_000_000_000 : nat,
  30 : nat  // 30 days instead
)' --network ic
```

### 3. Define Early Adopter Criteria

Set the cutoff date (users active before this date are eligible):

```bash
# Example: January 1, 2025 as cutoff
# Convert to nanoseconds: 1704067200000000000

# Or use current date as cutoff (all current users are early adopters)
# Get current timestamp in nanoseconds
date +%s%N
```

### 4. Prepare User List

You need the list of user principals. Options:

#### Option A: Get All Active Users

```bash
# Get users who voted in specific polls
dfx canister call polls_surveys_backend get_poll '(1 : nat)' --network ic --query

# Extract voterPrincipals from the response
```

#### Option B: Manual List

Create a file `early-adopters.txt`:
```
principal1-xxxx-xxxx
principal2-yyyy-yyyy
principal3-zzzz-zzzz
```

### 5. Allocate Using Auto-Allocation

#### Option A: Fixed Amount Per User

```bash
dfx canister call airdrop auto_allocate_early_adopters '(
  1 : nat,  // campaignId
  vec { 1 : nat; 2 : nat; 3 : nat },  // Poll IDs to check for activity
  vec { 1 : nat; 2 : nat },  // Survey IDs to check for activity
  vec {
    principal "user1-principal";
    principal "user2-principal";
    principal "user3-principal";
  },
  1704067200000000000 : int,  // Cutoff date (Jan 1, 2025)
  10_000_000_000 : nat  // 100 PULSE per early adopter
)' --network ic
```

#### Option B: Engagement-Based Tiers

```bash
dfx canister call airdrop auto_allocate_by_engagement '(
  1 : nat,  // campaignId
  vec { 1 : nat; 2 : nat; 3 : nat },  // Poll IDs
  vec { 1 : nat; 2 : nat },  // Survey IDs
  vec {
    principal "user1-principal";
    principal "user2-principal";
  },
  vec {
    record { "Bronze"; 5 : nat; 1 : nat };    // Min score 5, weight 1x
    record { "Silver"; 20 : nat; 2 : nat };   // Min score 20, weight 2x
    record { "Gold"; 50 : nat; 5 : nat };     // Min score 50, weight 5x
    record { "Platinum"; 100 : nat; 10 : nat }; // Min score 100, weight 10x
  }
)' --network ic
```

### 6. Fund the Campaign

Transfer PULSE tokens to the airdrop canister:

```bash
# From your wallet or token holder
dfx canister call tokenmania icrc1_transfer '(
  record {
    to = record {
      owner = principal "27ftn-piaaa-aaaao-a4p6a-cai";  // Airdrop canister
      subaccount = null;
    };
    amount = 50_000_000_000_000 : nat;  // Match campaign total
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
  }
)' --network ic
```

### 7. Start the Campaign

```bash
dfx canister call airdrop start_campaign '(1 : nat)' --network ic

# Returns: (variant { ok = "Campaign started successfully" })
```

### 8. Users Can Now Claim

Users visit your app and claim their airdrop:
- Frontend: `/airdrop` page (to be built)
- CLI: `dfx canister call airdrop claim_airdrop '(1 : nat)' --network ic`

## Campaign Configuration Examples

### Conservative (30 days)
```bash
create_campaign(
  "Early Adopter - January 2025",
  "Limited time offer for early supporters",
  25_000_000_000_000,  // 250k PULSE
  30  // Claims close in 30 days
)
```

### Recommended (90 days)
```bash
create_campaign(
  "Early Adopter Rewards Q1 2025",
  "Quarterly rewards for platform pioneers",
  50_000_000_000_000,  // 500k PULSE
  90  // 3 months to claim
)
```

### Extended (180 days)
```bash
create_campaign(
  "Early Adopter - 2025 H1",
  "Half-year rewards program",
  100_000_000_000_000,  // 1M PULSE
  180  // 6 months to claim
)
```

## What Happens After Duration Ends?

When the campaign duration expires:

1. **No new claims**: Users can no longer claim their allocations
2. **Status changes**: Campaign status becomes `#Completed` (manually set by admin)
3. **Unclaimed tokens**: Remain in the airdrop canister (can be withdrawn by admin in future versions)

### Extending an Expired Campaign

❌ **Cannot extend**: You cannot extend a campaign's duration once created.

✅ **Workaround**: Create a new campaign for users who missed the first one:

```bash
# Create "Round 2" campaign
dfx canister call airdrop create_campaign '(
  "Early Adopter Rewards - Round 2",
  "Second chance for users who missed Round 1",
  25_000_000_000_000 : nat,
  60 : nat  // 60 days for round 2
)' --network ic
```

## Full Example: 90-Day Early Adopter Campaign

```bash
# Step 1: Create campaign (90 days)
dfx canister call airdrop create_campaign '(
  "Early Adopter Rewards Q1 2025",
  "Thank you for being among the first users of ICP Pulse! Claim your PULSE tokens as a reward for early adoption and platform engagement.",
  50_000_000_000_000 : nat,
  90 : nat
)' --network ic
# Returns: (variant { ok = 1 : nat })

# Step 2: Auto-allocate to early adopters (cutoff: Dec 31, 2024)
dfx canister call airdrop auto_allocate_early_adopters '(
  1 : nat,
  vec { 1 : nat; 2 : nat; 3 : nat },
  vec { 1 : nat; 2 : nat },
  vec {
    principal "7aiiu-rkwon-btjqa-c5sel-564ua-q74km-yacm7-vtglq-hzgtb-wv5y5-rae";
    principal "other-user-principal";
  },
  1735689600000000000 : int,  // Dec 31, 2024 23:59:59 UTC
  5_000_000_000 : nat  // 50 PULSE per early adopter
)' --network ic

# Step 3: Fund campaign
dfx canister call tokenmania icrc1_transfer '(
  record {
    to = record {
      owner = principal "27ftn-piaaa-aaaao-a4p6a-cai";
      subaccount = null;
    };
    amount = 50_000_000_000_000 : nat;
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
  }
)' --network ic

# Step 4: Start campaign
dfx canister call airdrop start_campaign '(1 : nat)' --network ic

# Step 5: Verify campaign
dfx canister call airdrop get_campaign '(1 : nat)' --network ic --query
```

## Monitoring Campaign Progress

### Check Campaign Status
```bash
dfx canister call airdrop get_campaign '(1 : nat)' --network ic --query
```

### View User Allocations
```bash
dfx canister call airdrop get_user_airdrops '(
  principal "user-principal"
)' --network ic --query
```

### Get Active Campaigns
```bash
dfx canister call airdrop get_active_campaigns --network ic --query
```

## Timestamp Helper

Convert dates to nanoseconds for cutoff dates:

```bash
# Online converter or use this:
# For Dec 31, 2024 23:59:59 UTC:
date -u -d "2024-12-31 23:59:59" +%s%N

# For Jan 1, 2025 00:00:00 UTC:
date -u -d "2025-01-01 00:00:00" +%s%N

# Current timestamp:
date +%s%N
```

## Best Practices

1. **Duration Choice**:
   - 🟢 **90 days**: Recommended for early adopter campaigns
   - 🟡 **30 days**: Only if urgency is needed
   - 🔵 **180+ days**: For long-term programs

2. **Amount Calculation**:
   - Count expected early adopters
   - Divide total pool evenly or by tier
   - Keep some buffer (5-10%) for unexpected eligible users

3. **Communication**:
   - Announce campaign start date
   - Remind users before expiry (e.g., at 60 days, 80 days, 85 days)
   - Clear instructions on how to claim

4. **Testing**:
   - Test on local dfx first
   - Use small amounts for initial mainnet test
   - Verify one user can claim before announcing publicly

## Troubleshooting

### Campaign Won't Start
**Error**: "Insufficient PULSE balance"
**Solution**: Ensure airdrop canister has at least `totalAmount` PULSE tokens

### User Can't Claim
**Error**: "You are not eligible for this airdrop"
**Solution**: User was not in the allocation list. Add them manually:
```bash
dfx canister call airdrop add_allocation '(
  1 : nat,
  principal "user-principal",
  5_000_000_000 : nat,
  "Early adopter - manual addition"
)' --network ic
```

### Campaign Expired Too Soon
**Solution**: Create a new "Round 2" campaign with longer duration

## Summary

- ✅ **30 days**: Quick campaigns, monthly rewards
- ✅ **90 days** (Recommended): Quarterly campaigns, sufficient time
- ✅ **180+ days**: Long-term programs
- ❌ **Cannot change duration** after creation - choose wisely!
- ✅ **Can create multiple campaigns** if needed

Choose 90 days for your early adopter campaign to give everyone ample time to claim! 🎁
