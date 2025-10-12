# PULSE IDO Quest Campaign Guide

## Overview

The Quest System allows **all True Pulse users** to earn PULSE tokens by completing various activities on the platform. This guide explains how to set up and manage the IDO Quest Campaign.

## How Quests Work

### For Users:
1. **Complete Activities**: Vote in polls, create content, complete surveys
2. **Earn Points**: Each quest awards points automatically upon completion
3. **Claim Rewards**: When the campaign ends (or during), users can claim PULSE tokens proportional to their points

### For Admins:
1. **Create Campaign**: Set up a new airdrop campaign with total PULSE allocation
2. **Create Quests**: Define quests with requirements and point rewards
3. **Fund Campaign**: Deposit PULSE tokens to the airdrop canister
4. **Start Campaign**: Activate the campaign for users to participate
5. **Monitor**: Track progress and adjust as needed

## Quest System Architecture

```
Campaign (ID: X)
├── Total PULSE Pool: 50,000 tokens
├── Duration: 90 days
└── Quests
    ├── Quest 1: Cast Your First Vote (100 points)
    ├── Quest 2: Active Voter (300 points)
    ├── Quest 3: Super Voter (600 points)
    ├── Quest 4: Create First Poll (500 points)
    ├── Quest 5: Survey Respondent (150 points)
    ├── Quest 6: First Reward Claimer (200 points)
    ├── Quest 7: IDO Participant (1000 points)
    └── Quest 8: Community Ambassador (1500 points)

User Reward = (User Points / Total Points Earned) × Total PULSE Pool
```

## Proposed IDO Quest Campaign

### Campaign Details:
- **Name**: PULSE IDO Launch Campaign
- **Total Reward Pool**: 50,000 PULSE
- **Duration**: 90 days
- **Objective**: Incentivize platform engagement and IDO participation

### Quest Breakdown:

| Quest | Description | Points | Requirements |
|-------|-------------|--------|--------------|
| **Cast Your First Vote** | Vote in any poll | 100 | 1 vote |
| **Active Voter** | Vote in 5 different polls | 300 | 5 votes |
| **Super Voter** | Vote in 10 different polls | 600 | 10 votes |
| **Create Your First Poll** | Create your first poll | 500 | 1 poll created |
| **Survey Respondent** | Complete any survey | 150 | 1 survey completed |
| **First Reward Claimer** | Claim your first reward | 200 | 1 reward claimed |
| **IDO Participant** 🚀 | Participate in PULSE IDO | 1000 | Manual verification |
| **Community Ambassador** ⭐ | Create 3 polls + 10 votes | 1500 | 3 polls + 10 votes |

### Reward Distribution Example:

**Scenario**: 100 users participate, total points earned = 100,000

- User A: 1,000 points → (1,000 / 100,000) × 50,000 = **500 PULSE**
- User B: 500 points → (500 / 100,000) × 50,000 = **250 PULSE**
- User C: 2,000 points → (2,000 / 100,000) × 50,000 = **1,000 PULSE**

## Setup Instructions

### 1. Run the Setup Script

```bash
# For local testing
./scripts/setup-ido-quest-campaign.sh local

# For mainnet deployment
./scripts/setup-ido-quest-campaign.sh ic 27ftn-piaaa-aaaao-a4p6a-cai
```

### 2. Fund the Campaign

Transfer 50,000 PULSE tokens to the airdrop canister:

```bash
# Get the airdrop canister principal
AIRDROP_PRINCIPAL=$(dfx canister id airdrop)

# Transfer PULSE tokens
dfx canister call pulse_token icrc1_transfer "(
  record {
    to = record {
      owner = principal \"$AIRDROP_PRINCIPAL\";
      subaccount = null;
    };
    amount = 5_000_000_000_000 : nat;  // 50,000 PULSE with 8 decimals
    fee = null;
    memo = null;
    created_at_time = null;
  }
)"
```

### 3. Start the Campaign

```bash
# Replace CAMPAIGN_ID with the ID from setup script output
CAMPAIGN_ID=2  # Example

dfx canister call airdrop start_campaign "($CAMPAIGN_ID : nat)"
```

### 4. Update Frontend Banner

The campaign will automatically appear in the carousel banner for authenticated users!

## Managing the Campaign

### View Campaign Status

```bash
dfx canister call airdrop get_campaign "($CAMPAIGN_ID : nat)"
```

### View User's Quest Progress

```bash
dfx canister call airdrop get_user_quests "(
  principal \"$USER_PRINCIPAL\",
  $CAMPAIGN_ID : nat
)"
```

### View User's Points

```bash
dfx canister call airdrop get_user_points "(
  principal \"$USER_PRINCIPAL\",
  $CAMPAIGN_ID : nat
)"
```

### Update Quest Progress (Admin/Backend Only)

```bash
# Example: User completed a vote
dfx canister call airdrop update_quest_progress "(
  principal \"$USER_PRINCIPAL\",
  $QUEST_ID : nat,
  null : opt nat,           // pollsCreated
  opt (1 : nat),            // votescast
  null : opt nat,           // surveysCreated
  null : opt nat,           // surveysCompleted
  null : opt nat            // rewardsClaimed
)"
```

## IDO Participant Quest (Custom)

The "IDO Participant" quest requires manual verification since it's tracked on a different canister. Here's how to handle it:

### Option 1: Backend Integration

Integrate the IDO canister (`ej3ry-6qaaa-aaaai-atlza-cai`) with the polls backend to automatically update quest progress when users participate in the IDO.

```motoko
// In polls_surveys_backend
public shared({ caller }) func record_ido_participation(user: Principal) : async () {
  // Call airdrop canister to update the IDO quest
  let airdrop : AirdropActor = actor("27ftn-piaaa-aaaao-a4p6a-cai");

  // Find the IDO quest (you'll need to query for it or hard-code the ID)
  let questId = 7;  // IDO Participant quest

  await airdrop.update_quest_progress(
    user,
    questId,
    null,  // pollsCreated
    null,  // votescast
    null,  // surveysCreated
    null,  // surveysCompleted
    opt 1  // custom flag: set any requirement to 1 to complete
  );
};
```

### Option 2: Manual Admin Update

As admin, manually award points to IDO participants:

```bash
# For each IDO participant
dfx canister call airdrop update_quest_progress "(
  principal \"$USER_PRINCIPAL\",
  7 : nat,  // IDO Participant quest ID
  null : opt nat,
  opt (1 : nat),  // Set votescast to 1 to trigger completion
  null : opt nat,
  null : opt nat,
  null : opt nat
)"
```

### Option 3: Batch Update Script

Create a script to process all IDO participants:

```bash
#!/bin/bash
# Read IDO participants from CSV or API
# Format: principal_id per line

while IFS= read -r principal; do
  echo "Awarding IDO quest to $principal"
  dfx canister call airdrop update_quest_progress "(
    principal \"$principal\",
    7 : nat,
    null : opt nat,
    opt (1 : nat),
    null : opt nat,
    null : opt nat,
    null : opt nat
  )"
done < ido_participants.txt
```

## Best Practices

1. **Start Small**: Test with a smaller reward pool first
2. **Clear Communication**: Make sure users understand how points work
3. **Regular Updates**: Post progress updates to keep users engaged
4. **Fair Distribution**: Monitor for abuse and adjust point values if needed
5. **Time-Limited**: Set clear start and end dates to create urgency

## User Flow

1. **User visits site** → Sees campaign carousel banner
2. **Clicks "View Quests"** → Redirected to `/quests` page
3. **Views available quests** → Can see progress on each quest
4. **Completes activities** → Points automatically awarded
5. **Monitors progress** → Can track points and estimated PULSE
6. **Claims rewards** → When campaign is active, users can claim proportional rewards

## FAQ

**Q: Can users claim rewards before the campaign ends?**
A: Yes! As long as the campaign status is "Active", users can claim their proportional share at any time.

**Q: What happens to unclaimed rewards?**
A: Unclaimed rewards remain in the airdrop canister. You can either extend the campaign or withdraw excess tokens.

**Q: Can I add more quests later?**
A: Yes! You can create new quests for an existing campaign at any time.

**Q: How do I prevent quest abuse?**
A: The system automatically prevents duplicate progress. Users can't artificially inflate their points by repeating the same action.

**Q: Can I adjust point values after creating quests?**
A: Yes, you can update quests using the `update_quest` function, but it won't retroactively affect already-earned points.

## Next Steps

1. ✅ Run the setup script to create the campaign and quests
2. ⏳ Fund the campaign with 50,000 PULSE
3. ⏳ Start the campaign
4. ⏳ Announce the campaign to users via:
   - Carousel banner (already done!)
   - Twitter/social media
   - Discord/Telegram announcements
   - Email newsletter
5. ⏳ Monitor participation and adjust as needed

---

**Need Help?**
- Check the airdrop canister logs for errors
- Test with a small user group first
- Contact the dev team for custom integrations
