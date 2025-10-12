#!/bin/bash

# Script to initialize the quest system with starter quests
# Run this after deploying the airdrop canister

CANISTER_ID="27ftn-piaaa-aaaao-a4p6a-cai"
CAMPAIGN_ID=1

echo "Initializing quest system for campaign $CAMPAIGN_ID..."
echo ""

# Quest 1: Welcome to True Pulse
echo "Creating Quest 1: Welcome to True Pulse"
dfx canister --network ic call $CANISTER_ID create_quest '(
  1 : nat,
  "Welcome to True Pulse",
  "Get started by exploring the platform",
  variant { Custom = "welcome" },
  10 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  "star",
  0 : nat
)'

# Quest 2: Create Your First Poll
echo "Creating Quest 2: Create Your First Poll"
dfx canister --network ic call $CANISTER_ID create_quest '(
  1 : nat,
  "Create Your First Poll",
  "Share your first poll with the community",
  variant { CreateFirstPoll },
  50 : nat,
  record {
    minPolls = 1 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  "trophy",
  1 : nat
)'

# Quest 3: Cast Your First Vote
echo "Creating Quest 3: Cast Your First Vote"
dfx canister --network ic call $CANISTER_ID create_quest '(
  1 : nat,
  "Cast Your First Vote",
  "Participate in a poll by voting",
  variant { VoteInPoll },
  25 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 1 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  "zap",
  2 : nat
)'

# Quest 4: Survey Creator
echo "Creating Quest 4: Survey Creator"
dfx canister --network ic call $CANISTER_ID create_quest '(
  1 : nat,
  "Survey Creator",
  "Create your first survey to gather insights",
  variant { CreateFirstSurvey },
  75 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 0 : nat;
    minSurveys = 1 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  "gift",
  3 : nat
)'

# Quest 5: Survey Respondent
echo "Creating Quest 5: Survey Respondent"
dfx canister --network ic call $CANISTER_ID create_quest '(
  1 : nat,
  "Survey Respondent",
  "Complete a survey to help others",
  variant { CompleteSurvey },
  30 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 1 : nat;
    minRewards = 0 : nat;
  },
  "star",
  4 : nat
)'

# Quest 6: Community Member
echo "Creating Quest 6: Community Member"
dfx canister --network ic call $CANISTER_ID create_quest '(
  1 : nat,
  "Community Member",
  "Vote in 5 different polls",
  variant { VoteMultiple = 5 : nat },
  100 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 5 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 0 : nat;
  },
  "trending",
  5 : nat
)'

# Quest 7: Claim Your First Reward
echo "Creating Quest 7: Claim Your First Reward"
dfx canister --network ic call $CANISTER_ID create_quest '(
  1 : nat,
  "Claim Your First Reward",
  "Claim your first poll reward",
  variant { ClaimFirstReward },
  20 : nat,
  record {
    minPolls = 0 : nat;
    minVotes = 0 : nat;
    minSurveys = 0 : nat;
    minSubmissions = 0 : nat;
    minRewards = 1 : nat;
  },
  "gift",
  6 : nat
)'

echo ""
echo "✅ Quest initialization complete!"
echo ""
echo "Quest Summary (Points-Based Rewards):"
echo "1. Welcome to True Pulse - 10 points"
echo "2. Create Your First Poll - 50 points"
echo "3. Cast Your First Vote - 25 points"
echo "4. Survey Creator - 75 points"
echo "5. Survey Respondent - 30 points"
echo "6. Community Member - 100 points"
echo "7. Claim Your First Reward - 20 points"
echo ""
echo "Total points available: 310 points"
echo ""
echo "💡 Note: PULSE rewards are distributed proportionally based on points earned."
echo "   Users with more points get a larger share of the campaign's PULSE pool."
