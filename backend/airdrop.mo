// Airdrop Canister for ICP Pulse
// Distributes PULSE tokens to eligible users based on platform activity

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Map "mo:map/Map";
import { phash; thash } "mo:map/Map";
import Text "mo:base/Text";

persistent actor class Airdrop() = this {

  // Types
  type Principal = Principal.Principal;

  public type AirdropStatus = {
    #Pending;
    #Active;
    #Completed;
    #Cancelled;
  };

  public type ClaimStatus = {
    #Unclaimed;
    #Claimed;
    #Expired;
  };

  public type AirdropCampaign = {
    id : Nat;
    name : Text;
    description : Text;
    totalAmount : Nat;  // Total PULSE to distribute
    startTime : Int;
    endTime : Int;
    status : AirdropStatus;
    claimedAmount : Nat;
    claimCount : Nat;
  };

  public type AirdropAllocation = {
    campaignId : Nat;
    user : Principal;
    amount : Nat;
    reason : Text;  // "Early adopter", "Active voter", etc.
    claimStatus : ClaimStatus;
    claimedAt : ?Int;
  };

  public type UserAirdropInfo = {
    campaignId : Nat;
    campaignName : Text;
    amount : Nat;
    reason : Text;
    claimStatus : ClaimStatus;
    claimedAt : ?Int;
    expiresAt : Int;
  };

  public type EligibilityCriteria = {
    #EarlyAdopter;      // Users who joined before certain date
    #ActiveVoter;       // Users who voted in polls
    #SurveyCreator;     // Users who created surveys
    #HighEngagement;    // Users with high platform engagement
    #Custom : Text;     // Custom criteria
  };

  // ============================================================================
  // QUEST SYSTEM TYPES
  // ============================================================================

  public type QuestType = {
    #CreateFirstPoll;
    #VoteInPoll;
    #CreateFirstSurvey;
    #CompleteSurvey;
    #ClaimFirstReward;
    #VoteMultiple : Nat;  // Vote in N polls
    #Custom : Text;
  };

  public type QuestRequirements = {
    minPolls : Nat;         // min polls to create
    minVotes : Nat;         // min votes to cast
    minSurveys : Nat;       // min surveys to create
    minSubmissions : Nat;   // min survey submissions
    minRewards : Nat;       // min rewards claimed
  };

  public type Quest = {
    id : Nat;
    campaignId : Nat;       // Links to AirdropCampaign
    name : Text;
    description : Text;
    questType : QuestType;
    points : Nat;           // Points awarded for completing this quest
    requirements : QuestRequirements;
    icon : Text;            // icon name for frontend
    order : Nat;            // display order
    isActive : Bool;
  };

  public type QuestProgress = {
    pollsCreated : Nat;
    votescast : Nat;
    surveysCreated : Nat;
    surveysCompleted : Nat;
    rewardsClaimed : Nat;
  };

  public type UserQuestProgress = {
    questId : Nat;
    userId : Principal;
    completed : Bool;
    completedAt : ?Int;
    progress : QuestProgress;
    claimed : Bool;
  };

  public type UserQuestInfo = {
    questId : Nat;
    campaignId : Nat;
    name : Text;
    description : Text;
    questType : QuestType;
    points : Nat;           // Points awarded for this quest
    requirements : QuestRequirements;
    progress : QuestProgress;
    completed : Bool;
    completedAt : ?Int;
    claimed : Bool;
    icon : Text;
    order : Nat;
  };

  // Points summary for user in a campaign
  public type UserPointsSummary = {
    campaignId : Nat;
    userPoints : Nat;
    totalPoints : Nat;
    percentageShare : Nat;  // User's percentage of total points (0-10000 for 0.00% - 100.00%)
    estimatedPulse : Nat;   // Estimated PULSE based on current distribution
  };

  // ICRC-1 Token Interface
  type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  type TransferArg = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type TransferFromArgs = {
    spender_subaccount : ?Blob;
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #InsufficientAllowance : { allowance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type TransferResult = {
    #Ok : Nat;
    #Err : TransferError;
  };

  type ICRC1Actor = actor {
    icrc1_transfer : (TransferArg) -> async TransferResult;
    icrc1_balance_of : (Account) -> async Nat;
  };

  // Backend canister interface for user activity data
  type PollInfo = {
    id : Nat;
    voterPrincipals : [Principal];
    createdBy : Principal;
    createdAt : Int;
  };

  type SurveyInfo = {
    id : Nat;
    createdBy : Principal;
    createdAt : Int;
    submissionsCount : Nat;
  };

  type BackendActor = actor {
    get_poll : (Nat) -> async ?{
      id : Nat;
      voterPrincipals : [Principal];
      createdBy : Principal;
      createdAt : Int;
    };
    get_survey : (Nat) -> async ?{
      id : Nat;
      createdBy : Principal;
      createdAt : Int;
      submissionsCount : Nat;
    };
    get_survey_respondents : (Nat) -> async [Principal];
  };

  // User activity metrics
  type UserActivity = {
    user : Principal;
    voteCount : Nat;
    surveyCount : Nat;
    pollsCreated : Nat;
    surveysCreated : Nat;
    totalScore : Nat;
    firstActivity : ?Int;
  };

  // Engagement tier
  type EngagementTier = {
    name : Text;
    minScore : Nat;
    weight : Nat;
  };

  // State variables
  private var owner : Principal = Principal.fromText("aaaaa-aa");
  private var pulseTokenCanister : ?Principal = null;
  private var backendCanister : ?Principal = null;  // polls_surveys_backend for data
  private var initialized : Bool = false;

  // Counters
  private var nextCampaignId : Nat = 1;
  private var nextQuestId : Nat = 1;

  // Storage using Map
  private var campaigns = Map.new<Nat, AirdropCampaign>();
  private var allocations = Map.new<Text, AirdropAllocation>();  // "campaignId:principal" -> allocation
  private var userAllocations = Map.new<Principal, [Nat]>();  // user -> [campaignIds]

  // Quest Storage
  private var quests = Map.new<Nat, Quest>();  // questId -> Quest
  private var campaignQuests = Map.new<Nat, [Nat]>();  // campaignId -> [questIds]
  private var userQuestProgress = Map.new<Text, UserQuestProgress>();  // "questId:principal" -> progress

  // Points Storage
  private var userCampaignPoints = Map.new<Text, Nat>();  // "campaignId:principal" -> points
  private var campaignTotalPoints = Map.new<Nat, Nat>();  // campaignId -> total points earned
  private var questPointsClaimed = Map.new<Text, Bool>();  // "campaignId:principal" -> claimed

  // Stable storage for upgrades
  private var stableCampaigns : [(Nat, AirdropCampaign)] = [];
  private var stableAllocations : [(Text, AirdropAllocation)] = [];
  private var stableUserAllocations : [(Principal, [Nat])] = [];

  // Quest stable storage
  private var stableQuests : [(Nat, Quest)] = [];
  private var stableCampaignQuests : [(Nat, [Nat])] = [];
  private var stableUserQuestProgress : [(Text, UserQuestProgress)] = [];

  // Points stable storage
  private var stableUserCampaignPoints : [(Text, Nat)] = [];
  private var stableCampaignTotalPoints : [(Nat, Nat)] = [];
  private var stableQuestPointsClaimed : [(Text, Bool)] = [];

  // Pre-upgrade: save state
  system func preupgrade() {
    stableCampaigns := Iter.toArray(Map.entries(campaigns));
    stableAllocations := Iter.toArray(Map.entries(allocations));
    stableUserAllocations := Iter.toArray(Map.entries(userAllocations));
    stableQuests := Iter.toArray(Map.entries(quests));
    stableCampaignQuests := Iter.toArray(Map.entries(campaignQuests));
    stableUserQuestProgress := Iter.toArray(Map.entries(userQuestProgress));
    stableUserCampaignPoints := Iter.toArray(Map.entries(userCampaignPoints));
    stableCampaignTotalPoints := Iter.toArray(Map.entries(campaignTotalPoints));
    stableQuestPointsClaimed := Iter.toArray(Map.entries(questPointsClaimed));
  };

  // Post-upgrade: restore state
  system func postupgrade() {
    for ((id, campaign) in stableCampaigns.vals()) {
      Map.set(campaigns, Map.nhash, id, campaign);
    };
    for ((key, allocation) in stableAllocations.vals()) {
      Map.set(allocations, thash, key, allocation);
    };
    for ((user, campaignIds) in stableUserAllocations.vals()) {
      Map.set(userAllocations, phash, user, campaignIds);
    };
    for ((id, quest) in stableQuests.vals()) {
      Map.set(quests, Map.nhash, id, quest);
    };
    for ((campaignId, questIds) in stableCampaignQuests.vals()) {
      Map.set(campaignQuests, Map.nhash, campaignId, questIds);
    };
    for ((key, progress) in stableUserQuestProgress.vals()) {
      Map.set(userQuestProgress, thash, key, progress);
    };
    for ((key, points) in stableUserCampaignPoints.vals()) {
      Map.set(userCampaignPoints, thash, key, points);
    };
    for ((campaignId, totalPoints) in stableCampaignTotalPoints.vals()) {
      Map.set(campaignTotalPoints, Map.nhash, campaignId, totalPoints);
    };
    for ((key, claimed) in stableQuestPointsClaimed.vals()) {
      Map.set(questPointsClaimed, thash, key, claimed);
    };
  };

  // Initialize canister
  public shared ({ caller }) func initialize(
    _pulseCanister : Principal,
    _backendCanister : Principal
  ) : async Result.Result<Text, Text> {
    if (initialized) {
      return #err("Canister already initialized");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot initialize");
    };

    owner := caller;
    pulseTokenCanister := ?_pulseCanister;
    backendCanister := ?_backendCanister;
    initialized := true;

    #ok("Airdrop canister initialized successfully");
  };

  // Helper function to create allocation key
  private func makeAllocationKey(campaignId : Nat, user : Principal) : Text {
    Nat.toText(campaignId) # ":" # Principal.toText(user)
  };

  // Create airdrop campaign
  public shared ({ caller }) func create_campaign(
    name : Text,
    description : Text,
    totalAmount : Nat,
    durationDays : Nat
  ) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can create campaigns");
    };

    if (totalAmount == 0) {
      return #err("Total amount must be greater than 0");
    };

    let campaignId = nextCampaignId;
    nextCampaignId += 1;

    let now = Time.now();
    let durationNanos = durationDays * 24 * 60 * 60 * 1_000_000_000;
    let endTime = now + durationNanos;

    let campaign : AirdropCampaign = {
      id = campaignId;
      name = name;
      description = description;
      totalAmount = totalAmount;
      startTime = now;
      endTime = endTime;
      status = #Pending;
      claimedAmount = 0;
      claimCount = 0;
    };

    Map.set(campaigns, Map.nhash, campaignId, campaign);
    #ok(campaignId)
  };

  // Add allocation to campaign
  public shared ({ caller }) func add_allocation(
    campaignId : Nat,
    user : Principal,
    amount : Nat,
    reason : Text
  ) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can add allocations");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status == #Completed or campaign.status == #Cancelled) {
          return #err("Campaign is not active");
        };

        let key = makeAllocationKey(campaignId, user);

        // Check if allocation already exists
        switch (Map.get(allocations, thash, key)) {
          case (?_) { return #err("Allocation already exists for this user") };
          case null {};
        };

        let allocation : AirdropAllocation = {
          campaignId = campaignId;
          user = user;
          amount = amount;
          reason = reason;
          claimStatus = #Unclaimed;
          claimedAt = null;
        };

        Map.set(allocations, thash, key, allocation);

        // Update user allocations
        let currentCampaigns = switch (Map.get(userAllocations, phash, user)) {
          case (null) { [] };
          case (?campaigns) { campaigns };
        };
        Map.set(userAllocations, phash, user, Array.append(currentCampaigns, [campaignId]));

        #ok("Allocation added successfully")
      };
    };
  };

  // Batch add allocations
  public shared ({ caller }) func batch_add_allocations(
    campaignId : Nat,
    allocations_list : [(Principal, Nat, Text)]  // (user, amount, reason)
  ) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can add allocations");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status == #Completed or campaign.status == #Cancelled) {
          return #err("Campaign is not active");
        };

        var successCount = 0;
        for ((user, amount, reason) in allocations_list.vals()) {
          let key = makeAllocationKey(campaignId, user);

          // Skip if allocation already exists
          switch (Map.get(allocations, thash, key)) {
            case (?_) {};
            case null {
              let allocation : AirdropAllocation = {
                campaignId = campaignId;
                user = user;
                amount = amount;
                reason = reason;
                claimStatus = #Unclaimed;
                claimedAt = null;
              };

              Map.set(allocations, thash, key, allocation);

              // Update user allocations
              let currentCampaigns = switch (Map.get(userAllocations, phash, user)) {
                case (null) { [] };
                case (?campaigns) { campaigns };
              };
              Map.set(userAllocations, phash, user, Array.append(currentCampaigns, [campaignId]));

              successCount += 1;
            };
          };
        };

        #ok("Added " # Nat.toText(successCount) # " allocations successfully")
      };
    };
  };

  // Start campaign (requires PULSE tokens to be deposited first)
  public shared ({ caller }) func start_campaign(campaignId : Nat) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can start campaigns");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status != #Pending) {
          return #err("Campaign is not in pending status");
        };

        // Verify that canister has enough PULSE tokens
        let pulseCanister = switch (pulseTokenCanister) {
          case (null) { return #err("PULSE token canister not set") };
          case (?canister) { canister };
        };

        let pulseLedger : ICRC1Actor = actor (Principal.toText(pulseCanister));
        let balance = await pulseLedger.icrc1_balance_of({
          owner = Principal.fromActor(this);
          subaccount = null;
        });

        if (balance < campaign.totalAmount) {
          return #err("Insufficient PULSE balance. Please deposit " # Nat.toText(campaign.totalAmount) # " PULSE first");
        };

        // Update campaign status
        let updatedCampaign = {
          campaign with
          status = #Active;
        };

        Map.set(campaigns, Map.nhash, campaignId, updatedCampaign);
        #ok("Campaign started successfully")
      };
    };
  };

  // Claim airdrop
  public shared ({ caller }) func claim_airdrop(campaignId : Nat) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot claim airdrops");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status != #Active) {
          return #err("Campaign is not active");
        };

        let now = Time.now();
        if (now > campaign.endTime) {
          return #err("Campaign has expired");
        };

        let key = makeAllocationKey(campaignId, caller);
        let allocationOpt = Map.get(allocations, thash, key);

        switch (allocationOpt) {
          case (null) { return #err("You are not eligible for this airdrop") };
          case (?allocation) {
            if (allocation.claimStatus == #Claimed) {
              return #err("You have already claimed this airdrop");
            };

            if (allocation.claimStatus == #Expired) {
              return #err("This airdrop has expired");
            };

            // Transfer PULSE to user
            let pulseCanister = switch (pulseTokenCanister) {
              case (null) { return #err("PULSE token canister not set") };
              case (?canister) { canister };
            };

            let pulseLedger : ICRC1Actor = actor (Principal.toText(pulseCanister));

            let transferResult = await pulseLedger.icrc1_transfer({
              from_subaccount = null;
              to = {
                owner = caller;
                subaccount = null;
              };
              amount = allocation.amount;
              fee = null;
              memo = null;
              created_at_time = null;
            });

            switch (transferResult) {
              case (#Err(_)) {
                return #err("Failed to transfer PULSE tokens");
              };
              case (#Ok(_)) {
                // Update allocation status
                let updatedAllocation = {
                  allocation with
                  claimStatus = #Claimed;
                  claimedAt = ?now;
                };
                Map.set(allocations, thash, key, updatedAllocation);

                // Update campaign stats
                let updatedCampaign = {
                  campaign with
                  claimedAmount = campaign.claimedAmount + allocation.amount;
                  claimCount = campaign.claimCount + 1;
                };
                Map.set(campaigns, Map.nhash, campaignId, updatedCampaign);

                #ok(allocation.amount)
              };
            };
          };
        };
      };
    };
  };

  // Get user's airdrop allocations
  public query func get_user_airdrops(user : Principal) : async [UserAirdropInfo] {
    let campaignIds = switch (Map.get(userAllocations, phash, user)) {
      case (null) { return [] };
      case (?ids) { ids };
    };

    let buffer = Buffer.Buffer<UserAirdropInfo>(campaignIds.size());

    for (campaignId in campaignIds.vals()) {
      let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
      let key = makeAllocationKey(campaignId, user);
      let allocationOpt = Map.get(allocations, thash, key);

      switch (campaignOpt, allocationOpt) {
        case (?campaign, ?allocation) {
          let info : UserAirdropInfo = {
            campaignId = campaignId;
            campaignName = campaign.name;
            amount = allocation.amount;
            reason = allocation.reason;
            claimStatus = allocation.claimStatus;
            claimedAt = allocation.claimedAt;
            expiresAt = campaign.endTime;
          };
          buffer.add(info);
        };
        case _ {};
      };
    };

    Buffer.toArray(buffer)
  };

  // Get campaign details
  public query func get_campaign(campaignId : Nat) : async ?AirdropCampaign {
    Map.get(campaigns, Map.nhash, campaignId)
  };

  // Get all campaigns
  public query func get_all_campaigns() : async [AirdropCampaign] {
    let buffer = Buffer.Buffer<AirdropCampaign>(Map.size(campaigns));
    for ((_, campaign) in Map.entries(campaigns)) {
      buffer.add(campaign);
    };
    Buffer.toArray(buffer)
  };

  // Get active campaigns
  public query func get_active_campaigns() : async [AirdropCampaign] {
    let buffer = Buffer.Buffer<AirdropCampaign>(0);
    let now = Time.now();

    for ((_, campaign) in Map.entries(campaigns)) {
      if (campaign.status == #Active and now <= campaign.endTime) {
        buffer.add(campaign);
      };
    };
    Buffer.toArray(buffer)
  };

  // Check eligibility for a campaign
  public query func check_eligibility(
    user : Principal,
    campaignId : Nat
  ) : async Result.Result<Nat, Text> {
    let key = makeAllocationKey(campaignId, user);
    switch (Map.get(allocations, thash, key)) {
      case (null) { #err("Not eligible") };
      case (?allocation) {
        if (allocation.claimStatus == #Claimed) {
          #err("Already claimed")
        } else if (allocation.claimStatus == #Expired) {
          #err("Expired")
        } else {
          #ok(allocation.amount)
        }
      };
    };
  };

  // ============================================================================
  // AUTO-ALLOCATION FUNCTIONS (Activity-Based Distribution)
  // ============================================================================

  // Calculate user activity score from backend data
  private func calculateUserActivity(
    user : Principal,
    pollIds : [Nat],
    surveyIds : [Nat]
  ) : async UserActivity {
    let backend = switch (backendCanister) {
      case (null) {
        return {
          user = user;
          voteCount = 0;
          surveyCount = 0;
          pollsCreated = 0;
          surveysCreated = 0;
          totalScore = 0;
          firstActivity = null;
        };
      };
      case (?canister) { actor (Principal.toText(canister)) : BackendActor };
    };

    var voteCount = 0;
    var surveyCount = 0;
    var pollsCreated = 0;
    var surveysCreated = 0;
    var firstActivity : ?Int = null;

    // Check all polls for votes and creation
    for (pollId in pollIds.vals()) {
      try {
        let pollOpt = await backend.get_poll(pollId);
        switch (pollOpt) {
          case (?poll) {
            // Check if user voted
            let voted = Array.find<Principal>(poll.voterPrincipals, func(p) = Principal.equal(p, user));
            if (voted != null) {
              voteCount += 1;
              // Track first activity
              switch (firstActivity) {
                case (null) { firstActivity := ?poll.createdAt };
                case (?existing) {
                  if (poll.createdAt < existing) {
                    firstActivity := ?poll.createdAt;
                  };
                };
              };
            };

            // Check if user created this poll
            if (Principal.equal(poll.createdBy, user)) {
              pollsCreated += 1;
            };
          };
          case null {};
        };
      } catch (_) {
        // Skip on error
      };
    };

    // Check all surveys for submissions and creation
    for (surveyId in surveyIds.vals()) {
      try {
        let surveyOpt = await backend.get_survey(surveyId);
        switch (surveyOpt) {
          case (?survey) {
            // Check if user created this survey
            if (Principal.equal(survey.createdBy, user)) {
              surveysCreated += 1;
            };

            // Check if user submitted a response
            let respondents = await backend.get_survey_respondents(surveyId);
            let submitted = Array.find<Principal>(respondents, func(p) = Principal.equal(p, user));
            if (submitted != null) {
              surveyCount += 1;
              // Track first activity
              switch (firstActivity) {
                case (null) { firstActivity := ?survey.createdAt };
                case (?existing) {
                  if (survey.createdAt < existing) {
                    firstActivity := ?survey.createdAt;
                  };
                };
              };
            };
          };
          case null {};
        };
      } catch (_) {
        // Skip on error
      };
    };

    // Calculate total score with weights
    // Votes: 1 point, Surveys: 2 points, Created poll: 5 points, Created survey: 5 points
    let totalScore = (voteCount * 1) + (surveyCount * 2) + (pollsCreated * 5) + (surveysCreated * 5);

    {
      user = user;
      voteCount = voteCount;
      surveyCount = surveyCount;
      pollsCreated = pollsCreated;
      surveysCreated = surveysCreated;
      totalScore = totalScore;
      firstActivity = firstActivity;
    }
  };

  // Get engagement tier for a user based on score
  private func getUserTier(score : Nat, tiers : [EngagementTier]) : ?EngagementTier {
    var selectedTier : ?EngagementTier = null;

    for (tier in tiers.vals()) {
      if (score >= tier.minScore) {
        switch (selectedTier) {
          case (null) { selectedTier := ?tier };
          case (?current) {
            if (tier.minScore > current.minScore) {
              selectedTier := ?tier;
            };
          };
        };
      };
    };

    selectedTier
  };

  // Auto-allocate based on activity score with tiered weights
  public shared ({ caller }) func auto_allocate_by_engagement(
    campaignId : Nat,
    pollIds : [Nat],
    surveyIds : [Nat],
    users : [Principal],
    tiers : [(Text, Nat, Nat)]  // (name, minScore, weight)
  ) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can auto-allocate");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status != #Pending) {
          return #err("Can only auto-allocate for pending campaigns");
        };

        // Convert tuples to EngagementTier records
        let engagementTiers = Array.map<(Text, Nat, Nat), EngagementTier>(
          tiers,
          func((name, minScore, weight)) = {
            name = name;
            minScore = minScore;
            weight = weight;
          }
        );

        // Calculate activity for all users
        var activities : [UserActivity] = [];
        for (user in users.vals()) {
          let activity = await calculateUserActivity(user, pollIds, surveyIds);
          if (activity.totalScore > 0) {
            activities := Array.append(activities, [activity]);
          };
        };

        if (activities.size() == 0) {
          return #err("No eligible users found with activity");
        };

        // Calculate total weighted shares
        var totalShares : Nat = 0;
        var userShares : [(Principal, Nat)] = [];

        for (activity in activities.vals()) {
          let tierOpt = getUserTier(activity.totalScore, engagementTiers);
          let shares = switch (tierOpt) {
            case (?tier) { tier.weight };
            case null { 0 };
          };

          if (shares > 0) {
            userShares := Array.append(userShares, [(activity.user, shares)]);
            totalShares += shares;
          };
        };

        if (totalShares == 0) {
          return #err("No users qualified for any tier");
        };

        // Calculate and allocate tokens proportionally
        var allocatedCount = 0;
        for ((user, shares) in userShares.vals()) {
          let userAmount = (campaign.totalAmount * shares) / totalShares;

          if (userAmount > 0) {
            let key = makeAllocationKey(campaignId, user);

            // Skip if allocation already exists
            switch (Map.get(allocations, thash, key)) {
              case (?_) {};
              case null {
                let allocation : AirdropAllocation = {
                  campaignId = campaignId;
                  user = user;
                  amount = userAmount;
                  reason = "Engagement-based allocation (" # Nat.toText(shares) # " shares)";
                  claimStatus = #Unclaimed;
                  claimedAt = null;
                };

                Map.set(allocations, thash, key, allocation);

                // Update user allocations
                let currentCampaigns = switch (Map.get(userAllocations, phash, user)) {
                  case (null) { [] };
                  case (?campaigns) { campaigns };
                };
                Map.set(userAllocations, phash, user, Array.append(currentCampaigns, [campaignId]));

                allocatedCount += 1;
              };
            };
          };
        };

        #ok("Auto-allocated to " # Nat.toText(allocatedCount) # " users based on engagement tiers")
      };
    };
  };

  // Auto-allocate to early adopters (users active before cutoff date)
  public shared ({ caller }) func auto_allocate_early_adopters(
    campaignId : Nat,
    pollIds : [Nat],
    surveyIds : [Nat],
    users : [Principal],
    cutoffDate : Int,
    amountPerUser : Nat
  ) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can auto-allocate");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status != #Pending) {
          return #err("Can only auto-allocate for pending campaigns");
        };

        var allocatedCount = 0;

        for (user in users.vals()) {
          let activity = await calculateUserActivity(user, pollIds, surveyIds);

          // Check if user was active before cutoff
          let isEarlyAdopter = switch (activity.firstActivity) {
            case (?firstTime) { firstTime <= cutoffDate };
            case null { false };
          };

          if (isEarlyAdopter) {
            let key = makeAllocationKey(campaignId, user);

            switch (Map.get(allocations, thash, key)) {
              case (?_) {};
              case null {
                let allocation : AirdropAllocation = {
                  campaignId = campaignId;
                  user = user;
                  amount = amountPerUser;
                  reason = "Early adopter";
                  claimStatus = #Unclaimed;
                  claimedAt = null;
                };

                Map.set(allocations, thash, key, allocation);

                let currentCampaigns = switch (Map.get(userAllocations, phash, user)) {
                  case (null) { [] };
                  case (?campaigns) { campaigns };
                };
                Map.set(userAllocations, phash, user, Array.append(currentCampaigns, [campaignId]));

                allocatedCount += 1;
              };
            };
          };
        };

        #ok("Allocated to " # Nat.toText(allocatedCount) # " early adopters")
      };
    };
  };

  // Get user activity metrics (for frontend preview)
  public func get_user_activity(
    user : Principal,
    pollIds : [Nat],
    surveyIds : [Nat]
  ) : async Result.Result<UserActivity, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    let activity = await calculateUserActivity(user, pollIds, surveyIds);
    #ok(activity)
  };

  // Admin: Complete campaign
  public shared ({ caller }) func complete_campaign(campaignId : Nat) : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can complete campaigns");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        let updatedCampaign = {
          campaign with
          status = #Completed;
        };
        Map.set(campaigns, Map.nhash, campaignId, updatedCampaign);
        #ok("Campaign completed")
      };
    };
  };

  // Admin: Cancel campaign
  public shared ({ caller }) func cancel_campaign(campaignId : Nat) : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can cancel campaigns");
    };

    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status == #Completed) {
          return #err("Cannot cancel completed campaign");
        };

        let updatedCampaign = {
          campaign with
          status = #Cancelled;
        };
        Map.set(campaigns, Map.nhash, campaignId, updatedCampaign);
        #ok("Campaign cancelled")
      };
    };
  };

  // Query functions
  public query func is_initialized() : async Bool {
    initialized
  };

  public query func get_owner() : async Principal {
    owner
  };

  public query func get_pulse_canister() : async ?Principal {
    pulseTokenCanister
  };

  public query func get_canister_principal() : async Principal {
    Principal.fromActor(this)
  };

  // ============================================================================
  // QUEST SYSTEM FUNCTIONS
  // ============================================================================

  // Helper function to create quest progress key
  private func makeQuestProgressKey(questId : Nat, user : Principal) : Text {
    Nat.toText(questId) # ":" # Principal.toText(user)
  };

  // Helper function to check if quest requirements are met
  private func isQuestCompleted(requirements : QuestRequirements, progress : QuestProgress) : Bool {
    progress.pollsCreated >= requirements.minPolls and
    progress.votescast >= requirements.minVotes and
    progress.surveysCreated >= requirements.minSurveys and
    progress.surveysCompleted >= requirements.minSubmissions and
    progress.rewardsClaimed >= requirements.minRewards
  };

  // Create a quest (admin only)
  public shared ({ caller }) func create_quest(
    campaignId : Nat,
    name : Text,
    description : Text,
    questType : QuestType,
    points : Nat,
    requirements : QuestRequirements,
    icon : Text,
    order : Nat
  ) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can create quests");
    };

    // Verify campaign exists
    switch (Map.get(campaigns, Map.nhash, campaignId)) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status == #Completed or campaign.status == #Cancelled) {
          return #err("Cannot add quests to completed/cancelled campaign");
        };
      };
    };

    let questId = nextQuestId;
    nextQuestId += 1;

    let quest : Quest = {
      id = questId;
      campaignId = campaignId;
      name = name;
      description = description;
      questType = questType;
      points = points;
      requirements = requirements;
      icon = icon;
      order = order;
      isActive = true;
    };

    Map.set(quests, Map.nhash, questId, quest);

    // Add quest to campaign
    let currentQuests = switch (Map.get(campaignQuests, Map.nhash, campaignId)) {
      case (null) { [] };
      case (?quests) { quests };
    };
    Map.set(campaignQuests, Map.nhash, campaignId, Array.append(currentQuests, [questId]));

    #ok(questId)
  };

  // Update a quest (admin only)
  public shared ({ caller }) func update_quest(
    questId : Nat,
    name : Text,
    description : Text,
    questType : QuestType,
    points : Nat,
    requirements : QuestRequirements,
    icon : Text,
    order : Nat
  ) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can update quests");
    };

    // Verify quest exists
    switch (Map.get(quests, Map.nhash, questId)) {
      case (null) { return #err("Quest not found") };
      case (?quest) {
        // Create updated quest with same id, campaignId, and isActive status
        let updatedQuest : Quest = {
          id = quest.id;
          campaignId = quest.campaignId;
          name = name;
          description = description;
          questType = questType;
          points = points;
          requirements = requirements;
          icon = icon;
          order = order;
          isActive = quest.isActive;
        };

        Map.set(quests, Map.nhash, questId, updatedQuest);
        #ok("Quest updated successfully")
      };
    };
  };

  // Update user quest progress (called by backend or admin)
  public shared ({ caller }) func update_quest_progress(
    user : Principal,
    questId : Nat,
    pollsCreated : ?Nat,
    votescast : ?Nat,
    surveysCreated : ?Nat,
    surveysCompleted : ?Nat,
    rewardsClaimed : ?Nat
  ) : async Result.Result<Bool, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    // Only backend or owner can update progress
    let backendPrincipal = switch (backendCanister) {
      case (null) { owner };
      case (?p) { p };
    };

    if (not (Principal.equal(caller, owner) or Principal.equal(caller, backendPrincipal))) {
      return #err("Unauthorized");
    };

    // Verify quest exists
    let questOpt = Map.get(quests, Map.nhash, questId);
    switch (questOpt) {
      case (null) { return #err("Quest not found") };
      case (?quest) {
        if (not quest.isActive) {
          return #err("Quest is not active");
        };

        let key = makeQuestProgressKey(questId, user);
        let currentProgress = switch (Map.get(userQuestProgress, thash, key)) {
          case (null) {
            // Initialize progress
            {
              questId = questId;
              userId = user;
              completed = false;
              completedAt = null;
              progress = {
                pollsCreated = 0;
                votescast = 0;
                surveysCreated = 0;
                surveysCompleted = 0;
                rewardsClaimed = 0;
              };
              claimed = false;
            }
          };
          case (?progress) { progress };
        };

        // Update progress
        let newProgress : QuestProgress = {
          pollsCreated = switch (pollsCreated) {
            case (?n) { currentProgress.progress.pollsCreated + n };
            case null { currentProgress.progress.pollsCreated };
          };
          votescast = switch (votescast) {
            case (?n) { currentProgress.progress.votescast + n };
            case null { currentProgress.progress.votescast };
          };
          surveysCreated = switch (surveysCreated) {
            case (?n) { currentProgress.progress.surveysCreated + n };
            case null { currentProgress.progress.surveysCreated };
          };
          surveysCompleted = switch (surveysCompleted) {
            case (?n) { currentProgress.progress.surveysCompleted + n };
            case null { currentProgress.progress.surveysCompleted };
          };
          rewardsClaimed = switch (rewardsClaimed) {
            case (?n) { currentProgress.progress.rewardsClaimed + n };
            case null { currentProgress.progress.rewardsClaimed };
          };
        };

        // Check if quest is now completed
        let isCompleted = isQuestCompleted(quest.requirements, newProgress);
        let completedAt = if (isCompleted and not currentProgress.completed) {
          ?Time.now()
        } else {
          currentProgress.completedAt
        };

        let updatedProgress : UserQuestProgress = {
          questId = questId;
          userId = user;
          completed = isCompleted;
          completedAt = completedAt;
          progress = newProgress;
          claimed = currentProgress.claimed;
        };

        Map.set(userQuestProgress, thash, key, updatedProgress);

        // If newly completed, award points to user
        if (isCompleted and not currentProgress.completed) {
          let pointsKey = makeAllocationKey(quest.campaignId, user);

          // Get current user points for this campaign
          let currentPoints = switch (Map.get(userCampaignPoints, thash, pointsKey)) {
            case (null) { 0 };
            case (?points) { points };
          };

          // Add quest points
          let newPoints = currentPoints + quest.points;
          Map.set(userCampaignPoints, thash, pointsKey, newPoints);

          // Update campaign total points
          let currentTotalPoints = switch (Map.get(campaignTotalPoints, Map.nhash, quest.campaignId)) {
            case (null) { 0 };
            case (?total) { total };
          };
          Map.set(campaignTotalPoints, Map.nhash, quest.campaignId, currentTotalPoints + quest.points);
        };

        #ok(isCompleted)
      };
    };
  };

  // Get all quests for a campaign
  public query func get_campaign_quests(campaignId : Nat) : async [Quest] {
    let questIds = switch (Map.get(campaignQuests, Map.nhash, campaignId)) {
      case (null) { return [] };
      case (?ids) { ids };
    };

    let buffer = Buffer.Buffer<Quest>(questIds.size());
    for (questId in questIds.vals()) {
      switch (Map.get(quests, Map.nhash, questId)) {
        case (?quest) {
          if (quest.isActive) {
            buffer.add(quest);
          };
        };
        case null {};
      };
    };

    // Sort by order
    let result = Buffer.toArray(buffer);
    Array.sort(result, func(a : Quest, b : Quest) : { #less; #equal; #greater } {
      if (a.order < b.order) { #less }
      else if (a.order > b.order) { #greater }
      else { #equal }
    })
  };

  // Get user's quest progress for all quests in a campaign
  public query func get_user_quests(user : Principal, campaignId : Nat) : async [UserQuestInfo] {
    let questIds = switch (Map.get(campaignQuests, Map.nhash, campaignId)) {
      case (null) { return [] };
      case (?ids) { ids };
    };

    let buffer = Buffer.Buffer<UserQuestInfo>(questIds.size());
    for (questId in questIds.vals()) {
      let questOpt = Map.get(quests, Map.nhash, questId);
      switch (questOpt) {
        case (?quest) {
          if (not quest.isActive) {
            // Skip inactive quests
          } else {
            let key = makeQuestProgressKey(questId, user);
            let progressOpt = Map.get(userQuestProgress, thash, key);

            let (progress, completed, completedAt, claimed) = switch (progressOpt) {
              case (?p) {
                (p.progress, p.completed, p.completedAt, p.claimed)
              };
              case null {
                ({
                  pollsCreated = 0;
                  votescast = 0;
                  surveysCreated = 0;
                  surveysCompleted = 0;
                  rewardsClaimed = 0;
                }, false, null, false)
              };
            };

            let info : UserQuestInfo = {
              questId = questId;
              campaignId = campaignId;
              name = quest.name;
              description = quest.description;
              questType = quest.questType;
              points = quest.points;
              requirements = quest.requirements;
              progress = progress;
              completed = completed;
              completedAt = completedAt;
              claimed = claimed;
              icon = quest.icon;
              order = quest.order;
            };
            buffer.add(info);
          };
        };
        case null {};
      };
    };

    // Sort by order
    let result = Buffer.toArray(buffer);
    Array.sort(result, func(a : UserQuestInfo, b : UserQuestInfo) : { #less; #equal; #greater } {
      if (a.order < b.order) { #less }
      else if (a.order > b.order) { #greater }
      else { #equal }
    })
  };

  // Mark quest reward as claimed (happens automatically when user claims from airdrop page)
  public shared ({ caller }) func mark_quest_claimed(questId : Nat, user : Principal) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    // Can be called by user themselves or admin
    if (not (Principal.equal(caller, user) or Principal.equal(caller, owner))) {
      return #err("Unauthorized");
    };

    let key = makeQuestProgressKey(questId, user);
    switch (Map.get(userQuestProgress, thash, key)) {
      case (null) { return #err("Quest progress not found") };
      case (?progress) {
        if (not progress.completed) {
          return #err("Quest not completed yet");
        };

        if (progress.claimed) {
          return #err("Quest reward already claimed");
        };

        let updatedProgress = {
          progress with
          claimed = true;
        };
        Map.set(userQuestProgress, thash, key, updatedProgress);
        #ok("Quest reward marked as claimed")
      };
    };
  };

  // Get quest by ID
  public query func get_quest(questId : Nat) : async ?Quest {
    Map.get(quests, Map.nhash, questId)
  };

  // Get user's points summary for a campaign
  public query func get_user_points(user : Principal, campaignId : Nat) : async UserPointsSummary {
    let pointsKey = makeAllocationKey(campaignId, user);
    let userPoints = switch (Map.get(userCampaignPoints, thash, pointsKey)) {
      case (null) { 0 };
      case (?points) { points };
    };

    let totalPoints = switch (Map.get(campaignTotalPoints, Map.nhash, campaignId)) {
      case (null) { 1 }; // Avoid division by zero
      case (?total) { if (total == 0) { 1 } else { total } };
    };

    // Calculate percentage (0-10000 for 0.00% - 100.00%)
    let percentageShare = (userPoints * 10000) / totalPoints;

    // Get campaign to calculate estimated PULSE
    let estimatedPulse = switch (Map.get(campaigns, Map.nhash, campaignId)) {
      case (null) { 0 };
      case (?campaign) {
        if (totalPoints > 0) {
          (campaign.totalAmount * userPoints) / totalPoints
        } else { 0 }
      };
    };

    {
      campaignId = campaignId;
      userPoints = userPoints;
      totalPoints = totalPoints;
      percentageShare = percentageShare;
      estimatedPulse = estimatedPulse;
    }
  };

  // Claim quest rewards (proportional PULSE distribution based on points)
  public shared ({ caller }) func claim_quest_rewards(campaignId : Nat) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot claim rewards");
    };

    // Check if already claimed
    let claimKey = makeAllocationKey(campaignId, caller);
    switch (Map.get(questPointsClaimed, thash, claimKey)) {
      case (?true) { return #err("You have already claimed rewards for this campaign") };
      case _ {};
    };

    // Get user points
    let userPoints = switch (Map.get(userCampaignPoints, thash, claimKey)) {
      case (null) { return #err("You have no points in this campaign") };
      case (?points) {
        if (points == 0) {
          return #err("You have no points to claim");
        };
        points
      };
    };

    // Get campaign
    let campaignOpt = Map.get(campaigns, Map.nhash, campaignId);
    switch (campaignOpt) {
      case (null) { return #err("Campaign not found") };
      case (?campaign) {
        if (campaign.status != #Active) {
          return #err("Campaign is not active");
        };

        let now = Time.now();
        if (now > campaign.endTime) {
          return #err("Campaign has expired");
        };

        // Get total points
        let totalPoints = switch (Map.get(campaignTotalPoints, Map.nhash, campaignId)) {
          case (null) { return #err("No points earned in this campaign yet") };
          case (?total) {
            if (total == 0) {
              return #err("No points earned in this campaign yet");
            };
            total
          };
        };

        // Calculate user's share
        let userShare = (campaign.totalAmount * userPoints) / totalPoints;

        if (userShare == 0) {
          return #err("Your share is too small to claim");
        };

        // Transfer PULSE to user
        let pulseCanister = switch (pulseTokenCanister) {
          case (null) { return #err("PULSE token canister not set") };
          case (?canister) { canister };
        };

        let pulseLedger : ICRC1Actor = actor (Principal.toText(pulseCanister));

        let transferResult = await pulseLedger.icrc1_transfer({
          from_subaccount = null;
          to = {
            owner = caller;
            subaccount = null;
          };
          amount = userShare;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        switch (transferResult) {
          case (#Err(_)) {
            return #err("Failed to transfer PULSE tokens");
          };
          case (#Ok(_)) {
            // Mark as claimed
            Map.set(questPointsClaimed, thash, claimKey, true);

            // Update campaign stats
            let updatedCampaign = {
              campaign with
              claimedAmount = campaign.claimedAmount + userShare;
              claimCount = campaign.claimCount + 1;
            };
            Map.set(campaigns, Map.nhash, campaignId, updatedCampaign);

            #ok(userShare)
          };
        };
      };
    }
  };

  // Check if user has claimed quest rewards for a campaign
  public query func has_claimed_quest_rewards(user : Principal, campaignId : Nat) : async Bool {
    let claimKey = makeAllocationKey(campaignId, user);
    switch (Map.get(questPointsClaimed, thash, claimKey)) {
      case (?claimed) { claimed };
      case null { false };
    }
  };

  // Deactivate quest (admin only)
  public shared ({ caller }) func deactivate_quest(questId : Nat) : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can deactivate quests");
    };

    switch (Map.get(quests, Map.nhash, questId)) {
      case (null) { return #err("Quest not found") };
      case (?quest) {
        let updated = {
          quest with
          isActive = false;
        };
        Map.set(quests, Map.nhash, questId, updated);
        #ok("Quest deactivated")
      };
    };
  };
};
