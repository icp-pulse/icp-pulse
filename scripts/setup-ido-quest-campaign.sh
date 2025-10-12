#!/bin/bash

# Setup IDO Quest Campaign for True Pulse
# This script creates a new campaign and quests for the PULSE Token IDO

set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}True Pulse IDO Quest Campaign Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Configuration
NETWORK=${1:-local}  # default to local, can pass 'ic' for mainnet
AIRDROP_CANISTER_ID=${2:-27ftn-piaaa-aaaao-a4p6a-cai}

if [ "$NETWORK" = "ic" ]; then
    DFX_NETWORK="--network ic"
    echo -e "${YELLOW}Deploying to MAINNET${NC}\n"
else
    DFX_NETWORK=""
    echo -e "${GREEN}Deploying to LOCAL network${NC}\n"
fi

# Step 1: Create IDO Campaign
echo -e "${GREEN}Step 1: Creating IDO Quest Campaign...${NC}"

# Campaign details:
# - Name: "PULSE IDO Launch Campaign"
# - Description: "Complete quests to earn PULSE tokens! Participate in the IDO and earn rewards."
# - Total Amount: 50,000 PULSE (5,000,000,000,000 with 8 decimals)
# - Duration: 90 days

CAMPAIGN_NAME="PULSE IDO Launch Campaign"
CAMPAIGN_DESC="Complete quests to earn PULSE tokens! Participate in the IDO and earn rewards."
TOTAL_AMOUNT=5000000000000  # 50,000 PULSE with 8 decimals
DURATION_DAYS=90

CAMPAIGN_ID=$(dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_campaign "(
  \"$CAMPAIGN_NAME\",
  \"$CAMPAIGN_DESC\",
  $TOTAL_AMOUNT : nat,
  $DURATION_DAYS : nat
)" | grep -oP 'variant \{ Ok = \K\d+')

echo -e "${GREEN}✓ Campaign created with ID: $CAMPAIGN_ID${NC}\n"

# Step 2: Create Quests
echo -e "${GREEN}Step 2: Creating quests for the campaign...${NC}\n"

# Quest 1: First Vote
echo -e "  Creating Quest 1: Cast Your First Vote"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"Cast Your First Vote\",
  \"Vote in any poll to earn 100 points\",
  variant { VoteInPoll },
  100 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 1 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  \"vote\",
  1 : nat
)"

# Quest 2: Active Voter
echo -e "  Creating Quest 2: Active Voter"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"Active Voter\",
  \"Vote in 5 different polls to earn 300 points\",
  variant { VoteMultiple = 5 : nat },
  300 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 5 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  \"trophy\",
  2 : nat
)"

# Quest 3: Super Voter
echo -e "  Creating Quest 3: Super Voter"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"Super Voter\",
  \"Vote in 10 different polls to earn 600 points\",
  variant { VoteMultiple = 10 : nat },
  600 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 10 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  \"star\",
  3 : nat
)"

# Quest 4: Create Your First Poll
echo -e "  Creating Quest 4: Create Your First Poll"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"Create Your First Poll\",
  \"Create your first poll to earn 500 points\",
  variant { CreateFirstPoll },
  500 : nat,
  record {
    minPolls = 1 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  \"plus\",
  4 : nat
)"

# Quest 5: Complete a Survey
echo -e "  Creating Quest 5: Survey Respondent"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"Survey Respondent\",
  \"Complete any survey to earn 150 points\",
  variant { CompleteSurvey },
  150 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 1 : nat;
    minRewards = 0 : nat;
  },
  \"check\",
  5 : nat
)"

# Quest 6: Claim Your First Reward
echo -e "  Creating Quest 6: First Reward Claimer"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"First Reward Claimer\",
  \"Claim your first poll reward to earn 200 points\",
  variant { ClaimFirstReward },
  200 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 1 : nat;
  },
  \"gift\",
  6 : nat
)"

# Quest 7: IDO Participant (Custom)
echo -e "  Creating Quest 7: IDO Participant"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"IDO Participant\",
  \"Participate in the PULSE Token IDO to earn 1000 bonus points\",
  variant { Custom = \"IDO_PARTICIPATION\" },
  1000 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  \"rocket\",
  7 : nat
)"

# Quest 8: Community Ambassador
echo -e "  Creating Quest 8: Community Ambassador"
dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID create_quest "(
  $CAMPAIGN_ID : nat,
  \"Community Ambassador\",
  \"Create 3 polls and vote in 10 polls to earn 1500 points\",
  variant { Custom = \"AMBASSADOR\" },
  1500 : nat,
  record {
    minPolls = 3 : nat;
    minVotes = 10 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  \"sparkles\",
  8 : nat
)"

echo -e "\n${GREEN}✓ All quests created successfully!${NC}\n"

# Step 3: Display Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Campaign Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Campaign ID: ${YELLOW}$CAMPAIGN_ID${NC}"
echo -e "Campaign Name: $CAMPAIGN_NAME"
echo -e "Total Reward Pool: 50,000 PULSE"
echo -e "Duration: 90 days"
echo -e "\n${GREEN}Quests Created:${NC}"
echo -e "  1. Cast Your First Vote - 100 points"
echo -e "  2. Active Voter (5 votes) - 300 points"
echo -e "  3. Super Voter (10 votes) - 600 points"
echo -e "  4. Create Your First Poll - 500 points"
echo -e "  5. Survey Respondent - 150 points"
echo -e "  6. First Reward Claimer - 200 points"
echo -e "  7. IDO Participant - 1000 points"
echo -e "  8. Community Ambassador - 1500 points"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Fund the campaign with 50,000 PULSE tokens"
echo -e "  2. Start the campaign: dfx canister call $DFX_NETWORK $AIRDROP_CANISTER_ID start_campaign '($CAMPAIGN_ID : nat)'"
echo -e "  3. Users can now participate and earn points!"
echo -e "  4. Update the carousel banner to show the new campaign\n"

echo -e "${GREEN}Setup complete! 🎉${NC}"
