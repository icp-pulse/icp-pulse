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
import Hash "mo:base/Hash";
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

  // Storage using Map
  private var campaigns = Map.new<Nat, AirdropCampaign>();
  private var allocations = Map.new<Text, AirdropAllocation>();  // "campaignId:principal" -> allocation
  private var userAllocations = Map.new<Principal, [Nat]>();  // user -> [campaignIds]

  // Stable storage for upgrades
  private var stableCampaigns : [(Nat, AirdropCampaign)] = [];
  private var stableAllocations : [(Text, AirdropAllocation)] = [];
  private var stableUserAllocations : [(Principal, [Nat])] = [];

  // Pre-upgrade: save state
  system func preupgrade() {
    stableCampaigns := Iter.toArray(Map.entries(campaigns));
    stableAllocations := Iter.toArray(Map.entries(allocations));
    stableUserAllocations := Iter.toArray(Map.entries(userAllocations));
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
      } catch (e) {
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
      } catch (e) {
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
};
