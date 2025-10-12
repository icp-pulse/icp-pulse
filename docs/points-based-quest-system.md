# Points-Based Quest System

## Overview

The quest system has been updated from a fixed PULSE reward model to a **points-based proportional distribution system**. This means:

- **Before**: Each quest gave a fixed amount of PULSE tokens
- **After**: Each quest gives points, and PULSE tokens are distributed proportionally based on total points earned

## How It Works

### 1. Quest Completion → Points
When a user completes a quest, they earn **points** instead of receiving PULSE immediately.

```
User completes "Create First Poll" → Earns 50 points
User completes "Cast First Vote" → Earns 25 points
User's total: 75 points
```

### 2. Proportional PULSE Distribution
The total PULSE pool for a campaign is split among all users based on their points share.

**Formula:**
```
User's PULSE share = (Total Campaign PULSE × User Points) / Total Campaign Points
```

**Example:**
- Campaign Pool: 1000 PULSE
- Total Points Earned (all users): 500 points
- User A: 75 points
- User A's Share: (1000 × 75) / 500 = **150 PULSE**

### 3. Claiming Rewards
Users must call `claim_quest_rewards(campaignId)` to receive their proportional PULSE share. The system:
1. Calculates their share based on current point distribution
2. Transfers PULSE tokens
3. Marks the campaign as claimed for that user

## Backend Changes

### New Types

```motoko
// Points awarded for completing a quest
type Quest = {
  ...
  points : Nat;  // Changed from rewardAmount
  ...
};

// Points summary for a user
type UserPointsSummary = {
  campaignId : Nat;
  userPoints : Nat;
  totalPoints : Nat;
  percentageShare : Nat;  // 0-10000 (0.00% - 100.00%)
  estimatedPulse : Nat;
};
```

### New Storage

```motoko
// Points per user per campaign
userCampaignPoints: Map<Text, Nat>  // "campaignId:principal" -> points

// Total points earned in campaign
campaignTotalPoints: Map<Nat, Nat>  // campaignId -> total points

// Whether user claimed rewards
questPointsClaimed: Map<Text, Bool>  // "campaignId:principal" -> claimed
```

### New Functions

#### `get_user_points(user, campaignId) : UserPointsSummary`
Returns user's point statistics:
- Total points earned
- Campaign total points
- Percentage share
- Estimated PULSE (live calculation)

#### `claim_quest_rewards(campaignId) : Result<Nat, Text>`
Claims proportional PULSE rewards:
- Calculates user's share
- Transfers PULSE tokens
- Marks as claimed
- Returns amount transferred

#### `has_claimed_quest_rewards(user, campaignId) : Bool`
Check if user has already claimed rewards for a campaign.

### Modified Functions

#### `create_quest()`
Now takes `points` parameter instead of `rewardAmount`.

#### `update_quest_progress()`
On quest completion:
- Awards points to user
- Updates campaign total points
- **Does NOT create allocation** (unlike before)

## Frontend Changes Needed

### 1. Update Quest Cards
Show points instead of PULSE amounts:

```tsx
// Before:
<div>+{(Number(quest.rewardAmount) / 1e8).toFixed(2)} PULSE</div>

// After:
<div>{quest.points} points</div>
```

### 2. Add Points Summary Section
Display at the top of the quests page:

```tsx
<div className="points-summary">
  <h3>Your Points: {userPoints}</h3>
  <p>Total Campaign Points: {totalPoints}</p>
  <p>Your Share: {(percentageShare / 100).toFixed(2)}%</p>
  <p>Estimated PULSE: {(estimatedPulse / 1e8).toFixed(2)} PULSE</p>

  {!hasClaimed && userPoints > 0 && (
    <button onClick={claimRewards}>
      Claim {(estimatedPulse / 1e8).toFixed(2)} PULSE
    </button>
  )}
</div>
```

### 3. Update TypeScript Interface
```typescript
interface UserQuestInfo {
  ...
  points: bigint  // Changed from rewardAmount
  ...
}

interface UserPointsSummary {
  campaignId: bigint
  userPoints: bigint
  totalPoints: bigint
  percentageShare: bigint
  estimatedPulse: bigint
}
```

## Quest Initialization Script

Update `/scripts/init-quests.sh` to use points:

```bash
# Before:
rewardAmount = 50_000_000 : nat;  # 0.50 PULSE

# After:
points = 50 : nat;  # 50 points
```

Example quest point values:
- Welcome: 10 points
- Create First Poll: 50 points
- Cast First Vote: 25 points
- Survey Creator: 75 points
- Survey Respondent: 30 points
- Community Member (5 votes): 100 points
- Claim First Reward: 20 points

**Total: 310 points available**

## Migration Guide

### For Existing Campaigns

If you already have quests with `rewardAmount`, you need to:

1. Deploy the updated canister code
2. Deactivate old quests: `dfx canister call airdrop deactivate_quest '(1)'`
3. Create new quests with points
4. Fund the campaign with PULSE tokens

### Creating a New Points-Based Campaign

```bash
# 1. Create campaign with total PULSE pool
dfx canister call airdrop create_campaign '(
  "Quest Campaign",
  "Complete quests to earn PULSE",
  100_000_000_000 : nat,  # 1000 PULSE total pool
  90 : nat  # 90 days duration
)'

# 2. Create quests with points
./scripts/init-quests.sh

# 3. Fund the campaign
dfx canister call pulseg icrc1_transfer '(
  record {
    to = record {
      owner = principal "27ftn-piaaa-aaaao-a4p6a-cai";
      subaccount = null;
    };
    amount = 100_000_000_000 : nat;
    fee = null;
    memo = null;
    created_at_time = null;
  }
)'

# 4. Start the campaign
dfx canister call airdrop start_campaign '(1 : nat)'
```

## Benefits of Points-Based System

### 1. Flexible Reward Distribution
The total PULSE pool can be adjusted without changing quest definitions.

### 2. Dynamic Shares
Early participants get larger shares when fewer users have completed quests. As more users join, shares adjust proportionally.

### 3. Fair Competition
Users compete for a share of the pool based on their activity level (points earned).

### 4. Budget Control
Admin sets a fixed PULSE budget, and it's distributed fairly among participants.

### 5. Gamification
Points create a clear progression system and leaderboard potential.

## Example Scenarios

### Scenario 1: Early Adopter Advantage
**Time: Day 1**
- Campaign Pool: 1000 PULSE
- User A completes all quests: 310 points
- Total points: 310
- User A's share: (1000 × 310) / 310 = **1000 PULSE** 🎉

**Time: Day 30**
- Campaign Pool: 1000 PULSE
- User A: 310 points
- 9 other users: 310 points each
- Total points: 3100
- User A's share: (1000 × 310) / 3100 = **100 PULSE**
- Each user gets: **100 PULSE**

### Scenario 2: Partial Completion
- Campaign Pool: 1000 PULSE
- User A: 310 points (all quests)
- User B: 155 points (half the quests)
- User C: 75 points (couple quests)
- Total: 540 points

Shares:
- User A: (1000 × 310) / 540 = **574 PULSE**
- User B: (1000 × 155) / 540 = **287 PULSE**
- User C: (1000 × 75) / 540 = **139 PULSE**

## Testing

### Test Quest Completion
```bash
# Complete a quest (as backend canister)
dfx canister call airdrop update_quest_progress '(
  principal "USER_PRINCIPAL",
  1 : nat,
  opt 1 : opt nat,
  null,
  null,
  null,
  null
)'
```

### Check User Points
```bash
dfx canister call airdrop get_user_points '(
  principal "USER_PRINCIPAL",
  1 : nat
)'
```

### Claim Rewards
```bash
dfx canister call airdrop claim_quest_rewards '(1 : nat)'
```

## FAQ

**Q: When should users claim rewards?**
A: Users can claim anytime during the campaign. However, claiming later (when more users have participated) means a smaller share. There's a trade-off between waiting for more activity and claiming early for a larger share.

**Q: Can users claim multiple times?**
A: No, each user can only claim once per campaign.

**Q: What happens to unclaimed rewards?**
A: Unclaimed rewards remain in the campaign pool. Admin can retrieve them after campaign ends.

**Q: How accurate is the estimated PULSE?**
A: The estimated PULSE is calculated in real-time based on current point distribution. It changes as more users complete quests.

**Q: Can quest points be adjusted after creation?**
A: No, quest points are immutable once created. Create new quests if you need different point values.

## Summary

The points-based system transforms quests from a fixed-reward model to a competitive, proportional distribution system where:
- ✅ Users earn points for completing quests
- ✅ PULSE is distributed based on point share
- ✅ Early adopters get larger rewards
- ✅ Budget is fixed and controlled
- ✅ System is fair and gamified
