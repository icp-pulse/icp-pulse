# Auto-Allocation Airdrop Guide

## Overview

The airdrop canister now supports **automatic allocation** based on user activity from the polls_surveys_backend canister. This eliminates manual work and ensures fair, transparent distribution based on actual platform engagement.

## Features

### ✅ Activity-Based Calculation
- **Votes**: 1 point per poll vote
- **Surveys**: 2 points per survey submission
- **Poll Creation**: 5 points per poll created
- **Survey Creation**: 5 points per survey created

### ✅ Engagement Tiers
Users are categorized into tiers based on their total score:

| Tier | Min Score | Weight | Qualification |
|------|-----------|--------|---------------|
| Bronze | 5 | 1x | Basic participation (5+ votes/surveys) |
| Silver | 20 | 2x | Regular engagement (20+ activities) |
| Gold | 50 | 5x | Active contributor (50+ activities) |
| Platinum | 100 | 10x | Power user (100+ activities or creator) |

### ✅ Distribution Methods

1. **Engagement-Based**: Weighted distribution based on activity tiers
2. **Early Adopters**: Fixed amount to users active before a cutoff date

## Usage Examples

### 1. Create Campaign

```bash
dfx canister call airdrop create_campaign '(
  "Active Users Reward Q1 2025",
  "Reward for platform engagement in Q1",
  100_000_000_000_000 : nat,  // 1M PULSE total pool
  30 : nat  // 30 days duration
)'
# Returns: (variant { ok = 1 : nat })  <- campaignId
```

### 2. Auto-Allocate by Engagement Tiers

```bash
dfx canister call airdrop auto_allocate_by_engagement '(
  1 : nat,  // campaignId
  vec { 1 : nat; 2 : nat; 3 : nat },  // Poll IDs to check
  vec { 1 : nat; 2 : nat },  // Survey IDs to check
  vec {
    principal "user1-principal";
    principal "user2-principal";
    principal "user3-principal";
  },
  vec {
    record { "Bronze"; 5 : nat; 1 : nat };
    record { "Silver"; 20 : nat; 2 : nat };
    record { "Gold"; 50 : nat; 5 : nat };
    record { "Platinum"; 100 : nat; 10 : nat };
  }
)'
# Returns: (variant { ok = "Auto-allocated to 15 users based on engagement tiers" })
```

### 3. Auto-Allocate Early Adopters

```bash
dfx canister call airdrop auto_allocate_early_adopters '(
  1 : nat,  // campaignId
  vec { 1 : nat; 2 : nat; 3 : nat },  // Poll IDs
  vec { 1 : nat; 2 : nat },  // Survey IDs
  vec {
    principal "user1-principal";
    principal "user2-principal";
  },
  1704067200000000000 : int,  // Cutoff timestamp (Jan 1, 2024)
  50_000_000_000 : nat  // 500 PULSE per early adopter
)'
# Returns: (variant { ok = "Allocated to 8 early adopters" })
```

### 4. Check User Activity (Preview)

```bash
dfx canister call airdrop get_user_activity '(
  principal "user-principal",
  vec { 1 : nat; 2 : nat; 3 : nat },  // Poll IDs
  vec { 1 : nat; 2 : nat }  // Survey IDs
)'
# Returns:
# (variant {
#   ok = record {
#     user = principal "user-principal";
#     voteCount = 15 : nat;
#     surveyCount = 8 : nat;
#     pollsCreated = 2 : nat;
#     surveysCreated = 1 : nat;
#     totalScore = 46 : nat;  // 15*1 + 8*2 + 2*5 + 1*5 = 46
#     firstActivity = opt (1698000000000000000 : int);
#   }
# })
```

### 5. Fund and Start Campaign

```bash
# Transfer PULSE tokens to airdrop canister
dfx canister call tokenmania icrc1_transfer '(
  record {
    to = record {
      owner = principal "$(dfx canister id airdrop)";
      subaccount = null;
    };
    amount = 100_000_000_000_000 : nat;
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
  }
)'

# Start the campaign
dfx canister call airdrop start_campaign '(1 : nat)'
```

### 6. Users Claim Their Airdrops

```bash
dfx canister call airdrop claim_airdrop '(1 : nat)'
# Returns: (variant { ok = 50_000_000_000 : nat })  <- amount claimed
```

## Calculation Examples

### Example 1: Engaged Voter
- **Activity**: 25 votes, 5 surveys
- **Score**: 25×1 + 5×2 = **35 points**
- **Tier**: Silver (20-49 points) → **2× weight**

### Example 2: Active Creator
- **Activity**: 10 votes, 3 surveys, 5 polls created, 2 surveys created
- **Score**: 10×1 + 3×2 + 5×5 + 2×5 = **61 points**
- **Tier**: Gold (50-99 points) → **5× weight**

### Example 3: Power User
- **Activity**: 50 votes, 30 surveys, 8 polls created, 5 surveys created
- **Score**: 50×1 + 30×2 + 8×5 + 5×5 = **175 points**
- **Tier**: Platinum (100+ points) → **10× weight**

### Distribution Calculation

Given a 1M PULSE pool and 3 users:
- User A: Silver (2 shares) = 2/17 × 1M = **117,647 PULSE**
- User B: Gold (5 shares) = 5/17 × 1M = **294,118 PULSE**
- User C: Platinum (10 shares) = 10/17 × 1M = **588,235 PULSE**

Total shares: 2 + 5 + 10 = 17

## Frontend Integration

### TypeScript Example

```typescript
import {
  createAirdropActor,
  ENGAGEMENT_TIERS,
  tiersToTuples,
  calculateActivityScore,
  getTierForScore,
  formatUserActivity
} from '@/lib/staking'

// Get user activity
const activity = await airdropActor.get_user_activity(
  userPrincipal,
  [1n, 2n, 3n],  // poll IDs
  [1n, 2n]       // survey IDs
)

if ('ok' in activity) {
  const userActivity = activity.ok
  const tier = getTierForScore(
    userActivity.totalScore,
    Object.values(ENGAGEMENT_TIERS)
  )

  console.log(`User activity: ${formatUserActivity(userActivity)}`)
  console.log(`Tier: ${tier?.name}, Score: ${userActivity.totalScore}`)
}

// Auto-allocate campaign
const tiers = Object.values(ENGAGEMENT_TIERS)
const result = await airdropActor.auto_allocate_by_engagement(
  1n,  // campaignId
  [1n, 2n, 3n],  // pollIds
  [1n, 2n],  // surveyIds
  userPrincipals,
  tiersToTuples(tiers)
)
```

## Architecture: Canister-to-Canister Calls

The airdrop canister makes **inter-canister calls** to polls_surveys_backend:

```motoko
type BackendActor = actor {
  get_poll : (Nat) -> async ?Poll;
  get_survey : (Nat) -> async ?Survey;
  get_survey_respondents : (Nat) -> async [Principal];
};
```

**Flow**:
1. Admin calls `auto_allocate_by_engagement(campaignId, pollIds, surveyIds, users, tiers)`
2. For each user, airdrop canister:
   - Calls `backend.get_poll(pollId)` for each poll → checks if user voted
   - Calls `backend.get_survey(surveyId)` for each survey → checks if user responded
   - Calculates total score with weights
   - Determines engagement tier
3. Distributes pool proportionally based on tier weights
4. Creates allocations for all eligible users

## Security & Access Control

- ✅ Only canister **owner** can call auto-allocation functions
- ✅ Only works on **Pending** campaigns (before activation)
- ✅ Skips users who already have allocations (no duplicates)
- ✅ Requires campaign to be funded before starting
- ✅ Campaign must have sufficient PULSE balance

## Testing Checklist

- [ ] Deploy updated airdrop canister
- [ ] Create test campaign
- [ ] Auto-allocate using engagement tiers
- [ ] Verify allocations are created correctly
- [ ] Check user activity scores match expectations
- [ ] Fund campaign with PULSE
- [ ] Start campaign
- [ ] Test claiming as different users
- [ ] Verify token distributions match calculated shares

## Next Steps

1. **Deploy to Mainnet**: Update airdrop canister with new code
2. **Create Campaigns**: Set up initial engagement-based campaigns
3. **Monitor Activity**: Track user participation in polls/surveys
4. **Run Allocations**: Execute auto-allocation before campaign starts
5. **Announce to Users**: Let users know about their eligible airdrops

---

**Benefits of Auto-Allocation**:
- 🎯 **Fair & Transparent**: Based on verifiable on-chain activity
- ⚡ **Efficient**: No manual CSV uploads or allocation lists
- 🔄 **Flexible**: Multiple criteria (engagement, early adoption, etc.)
- 📊 **Data-Driven**: Uses actual platform usage metrics
- 🛡️ **Sybil-Resistant**: Weighted by meaningful contributions, not just wallets
