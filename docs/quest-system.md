# Quest System Documentation

## Overview

The Quest System is a gamified onboarding feature that guides new users to explore the True Pulse platform by completing tasks. Unlike the retroactive airdrop system that rewards past activity, quests provide progressive rewards for future actions.

## Architecture

### Backend Components

#### 1. Quest Storage (airdrop.mo)

The quest system is integrated into the airdrop canister with the following data structures:

- **Quest Types**: Define different types of quests
  - `CreateFirstPoll` - Create a poll
  - `VoteInPoll` - Vote in a poll
  - `CreateFirstSurvey` - Create a survey
  - `CompleteSurvey` - Complete a survey
  - `ClaimFirstReward` - Claim a poll reward
  - `VoteMultiple` - Vote in multiple polls
  - `Custom` - Custom quest types

- **Quest Progress**: Tracks user activity
  - `pollsCreated` - Number of polls created
  - `votescast` - Number of votes cast
  - `surveysCreated` - Number of surveys created
  - `surveysCompleted` - Number of surveys completed
  - `rewardsClaimed` - Number of rewards claimed

- **Quest Requirements**: Defines completion criteria
  - `minPolls` - Minimum polls required
  - `minVotes` - Minimum votes required
  - `minSurveys` - Minimum surveys required
  - `minSubmissions` - Minimum submissions required
  - `minRewards` - Minimum rewards required

#### 2. Activity Hooks (polls_surveys_backend.mo)

The polls/surveys backend automatically tracks user activity:

- **Poll Creation**: Increments `pollsCreated` counter
- **Vote Submission**: Increments `votescast` counter
- **Survey Creation**: Increments `surveysCreated` counter
- **Survey Submission**: Increments `surveysCompleted` counter
- **Reward Claim**: Increments `rewardsClaimed` counter

All hooks are non-blocking to prevent quest tracking failures from affecting core functionality.

#### 3. Automatic Allocation

When a user completes a quest:
1. The `update_quest_progress()` function checks if requirements are met
2. If complete, an allocation is automatically created in the user's account
3. The quest is marked as completed with a timestamp
4. Users can claim their rewards through the standard allocation claim process

### Frontend Components

#### 1. Quests Page (/app/quests/page.tsx)

Features:
- **Stats Dashboard**: Shows completed quests, total rewards, and progress percentage
- **Quest Cards**: Display individual quests with:
  - Quest name and description
  - Progress bars (for incomplete quests)
  - Reward amount
  - Completion status
  - Claim status
- **Visual Indicators**: Icons, colors, and animations for engagement
- **Real-time Updates**: Fetches latest progress from canister

#### 2. Navigation Integration

Quests are accessible via the main navigation bar between "Crowdfunding" and "Rewards".

## Setup & Deployment

### 1. Deploy Backend Canisters

```bash
# Build and deploy airdrop canister
dfx deploy airdrop

# Deploy polls_surveys_backend (if not already deployed)
dfx deploy polls_surveys_backend
```

### 2. Create Initial Campaign

First, create a campaign for quests (if not already created):

```bash
dfx canister call airdrop create_campaign '(
  record {
    name = "Onboarding Quests";
    description = "Complete quests to earn PULSE tokens";
    startDate = 0 : int;
    endDate = 9999999999999999999 : int;
    totalAllocation = 1000_000_000_000 : nat;
    allocationPerUser = 310_000_000 : nat;
  }
)'
```

### 3. Initialize Quests

Run the initialization script:

```bash
./scripts/init-quests.sh
```

This creates 7 starter quests:
1. **Welcome to True Pulse** (0.10 PULSE) - Onboarding quest
2. **Create Your First Poll** (0.50 PULSE) - Create 1 poll
3. **Cast Your First Vote** (0.25 PULSE) - Vote in 1 poll
4. **Survey Creator** (0.75 PULSE) - Create 1 survey
5. **Survey Respondent** (0.30 PULSE) - Complete 1 survey
6. **Community Member** (1.00 PULSE) - Vote in 5 polls
7. **Claim Your First Reward** (0.20 PULSE) - Claim 1 reward

### 4. Fund the Campaign

Transfer PULSE tokens to the airdrop canister to fund quest rewards:

```bash
# Transfer tokens to airdrop canister
dfx canister call pulseg icrc1_transfer '(
  record {
    to = record {
      owner = principal "zdjlt-6iaaa-aaaao-a4pww-cai";
      subaccount = null;
    };
    amount = 1000_000_000_000 : nat;
    fee = null;
    memo = null;
    created_at_time = null;
  }
)'
```

## Usage

### For Users

1. **Connect Wallet**: Users must connect their ICP wallet
2. **View Quests**: Navigate to /quests to see available quests
3. **Complete Activities**: Perform actions on the platform
4. **Track Progress**: Progress is automatically tracked and displayed
5. **Claim Rewards**: Once complete, rewards are auto-allocated and can be claimed via the wallet page

### For Admins

#### Create a New Quest

```bash
dfx canister call airdrop create_quest '(
  record {
    campaignId = 1 : nat;
    name = "Quest Name";
    description = "Quest description";
    questType = variant { Custom = "custom_type" };
    rewardAmount = 50_000_000 : nat;
    requirements = record {
      minPolls = 0 : nat;
      minVotes = 0 : nat;
      minSurveys = 0 : nat;
      minSubmissions = 0 : nat;
      minRewards = 0 : nat;
    };
    icon = "trophy";
    order = 10 : nat;
  }
)'
```

#### Deactivate a Quest

```bash
dfx canister call airdrop deactivate_quest '(1 : nat)'
```

#### View User Progress

```bash
dfx canister call airdrop get_user_quests '(
  principal "user-principal-id",
  1 : nat
)'
```

#### View Campaign Quests

```bash
dfx canister call airdrop get_campaign_quests '(1 : nat)'
```

## API Reference

### Airdrop Canister Functions

#### `create_quest`
Creates a new quest in a campaign.

**Parameters:**
- `campaignId`: Campaign ID
- `name`: Quest name
- `description`: Quest description
- `questType`: Type of quest (enum)
- `rewardAmount`: Reward in smallest unit (e8s)
- `requirements`: Completion requirements
- `icon`: Icon identifier
- `order`: Display order

**Returns:** `Result<Nat, Text>` - Quest ID or error

#### `update_quest_progress`
Updates user progress for quests (called automatically by activity hooks).

**Parameters:**
- `user`: User principal
- `questId`: Quest ID (0 for all quests)
- `pollsCreated`: Optional increment
- `votescast`: Optional increment
- `surveysCreated`: Optional increment
- `surveysCompleted`: Optional increment
- `rewardsClaimed`: Optional increment

**Returns:** `Result<Bool, Text>` - Success status

#### `get_user_quests`
Retrieves all quests for a user in a campaign with their progress.

**Parameters:**
- `user`: User principal
- `campaignId`: Campaign ID

**Returns:** `[UserQuestInfo]` - Array of quest info with progress

#### `get_campaign_quests`
Retrieves all quests in a campaign.

**Parameters:**
- `campaignId`: Campaign ID

**Returns:** `[Quest]` - Array of quests

#### `mark_quest_claimed`
Marks a quest reward as claimed by the user.

**Parameters:**
- `questId`: Quest ID
- `user`: User principal

**Returns:** `Result<Text, Text>` - Success message or error

#### `deactivate_quest`
Deactivates a quest (admin only).

**Parameters:**
- `questId`: Quest ID

**Returns:** `Result<Text, Text>` - Success message or error

## Reward Flow

1. **User completes activity** (e.g., creates a poll)
2. **Backend hook fires** → `update_quest_progress()`
3. **Progress is checked** → Requirements met?
4. **Auto-allocation created** → Reward added to user's account
5. **Quest marked complete** → Timestamp recorded
6. **User views quest page** → Sees completed quest
7. **User goes to wallet** → Claims allocation (if not auto-claimed)

## Best Practices

### For Quest Design

1. **Progressive Difficulty**: Start with easy quests, increase complexity
2. **Clear Requirements**: Make completion criteria obvious
3. **Fair Rewards**: Balance effort with reward amount
4. **Engagement Focus**: Design quests that introduce core features
5. **Order Matters**: Use the `order` field to guide user journey

### For Development

1. **Non-blocking Hooks**: Always use `ignore async` for quest tracking
2. **Error Handling**: Quest failures shouldn't break core functionality
3. **Testing**: Test quest completion in both local and mainnet environments
4. **Monitoring**: Track quest completion rates to identify issues
5. **Documentation**: Keep this doc updated when adding new quest types

## Troubleshooting

### Quests Not Showing

- Check if user is authenticated
- Verify campaign exists (ID: 1)
- Check canister logs for errors
- Ensure frontend declarations are up to date

### Progress Not Updating

- Verify backend hooks are firing
- Check if airdrop canister is accessible
- Look for errors in browser console
- Confirm activity is being tracked (check with `get_user_quests`)

### Rewards Not Auto-Allocating

- Ensure campaign has sufficient funds
- Check quest requirements match expected values
- Verify `update_quest_progress` returns success
- Review canister upgrade persistence

## Future Enhancements

Potential improvements:
- Quest categories/tags
- Daily/weekly quest rotation
- Streak bonuses
- Social quests (referrals)
- Achievement badges
- Leaderboards
- Quest expiration dates
- Multi-step quest chains
- Conditional quest unlocks
- Custom quest icons/images

## Related Documentation

- [Airdrop System](./airdrop-system.md)
- [Backend API](./backend-api.md)
- [Frontend Integration](./frontend-integration.md)
