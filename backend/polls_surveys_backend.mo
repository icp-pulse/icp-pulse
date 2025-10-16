import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Map "mo:map/Map";
import { phash } "mo:map/Map";
import Cycles "mo:base/ExperimentalCycles";

persistent actor class polls_surveys_backend() = this {
  // Airdrop canister actor for quest tracking
  let airdrop = actor "27ftn-piaaa-aaaao-a4p6a-cai" : actor {
    update_quest_progress : (
      user : Principal,
      questId : Nat,
      pollsCreated : ?Nat,
      votescast : ?Nat,
      surveysCreated : ?Nat,
      surveysCompleted : ?Nat,
      rewardsClaimed : ?Nat
    ) -> async { #ok : Bool; #err : Text };
  };

  // Types
  type ProjectId = Nat;
  type ProductId = Nat;
  type PollId = Nat;
  type SurveyId = Nat;

  type Status = {
    #active;        // Poll is accepting responses
    #paused;        // Poll is visible but not accepting responses
    #claimsOpen;    // Users can claim their rewards
    #claimsEnded;   // Reward claiming period has ended
    #closed;        // Poll permanently closed
  };

  // Custom token types
  type TokenType = {
    #ICP;
    #ICRC1: Principal; // Token canister ID
  };

  // Well-known ICRC-1 token canisters (mainnet)
  private let KNOWN_TOKENS = {
    // Start with our deployed PULSE token only
    PULSE = Principal.fromText("zix77-6qaaa-aaaao-a4pwq-cai");
    // Other mainnet tokens can be added after deployment verification
    // ckBTC = Principal.fromText("mxzaz-hqaaa-aaaar-qaada-cai");
    // ckETH = Principal.fromText("ss2fx-dyaaa-aaaar-qacoq-cai");
    // ckUSDC = Principal.fromText("xkbqi-6yaaa-aaaah-qbpqq-cai");
    // CHAT = Principal.fromText("2ouva-viaaa-aaaaq-aaamq-cai");
    // SNS1 = Principal.fromText("zfcdd-tqaaa-aaaaq-aaaga-cai");
  };

  // Helper function to check if a token is in our known tokens list
  private func isKnownToken(canister: Principal) : Bool {
    Principal.equal(canister, KNOWN_TOKENS.PULSE)
    // When adding more tokens, expand this check:
    // or Principal.equal(canister, KNOWN_TOKENS.ckBTC)
    // or Principal.equal(canister, KNOWN_TOKENS.ckETH)
    // etc.
  };

  // ICRC-1 Types
  type Account = { owner : Principal; subaccount : ?[Nat8] };
  type Tokens = Nat;
  type Timestamp = Nat64;
  type TransferArgs = {
    from_subaccount: ?[Nat8];
    to: Account;
    amount: Tokens;
    fee: ?Tokens;
    memo: ?[Nat8];
    created_at_time: ?Timestamp;
  };
  type TransferResult = {
    #Ok: Nat;  // block index
    #Err: TransferError;
  };
  type TransferError = {
    #BadFee: { expected_fee: Tokens };
    #BadBurn: { min_burn_amount: Tokens };
    #InsufficientFunds: { balance: Tokens };
    #TooOld;
    #CreatedInFuture: { ledger_time: Timestamp };
    #Duplicate: { duplicate_of: Nat };
    #TemporarilyUnavailable;
    #GenericError: { error_code: Nat; message: Text };
  };

  type FundingType = { #SelfFunded; #Crowdfunded; #TreasuryFunded };

  type RewardDistributionType = { #Fixed; #EqualSplit };

  type PollConfig = {
    maxResponses: ?Nat;              // Target number of respondents
    allowAnonymous: Bool;            // Allow anonymous voting
    allowMultiple: Bool;             // Allow multiple choice selection
    visibility: Text;                // "public" | "private" | "invite-only"
    rewardDistributionType: RewardDistributionType; // How rewards are distributed
  };

  type FundingInfo = {
    tokenType: TokenType;         // Type of token used for funding
    tokenCanister: ?Principal;    // Token canister for custom tokens (null for ICP)
    tokenSymbol: Text;           // Token symbol for display
    tokenDecimals: Nat8;         // Token decimals
    totalFund: Nat64;           // Total tokens in smallest unit (e8s for ICP)
    rewardPerResponse: Nat64;    // Tokens per valid response in smallest unit
    maxResponses: ?Nat;          // Maximum funded responses (optional - if null, budget-based only)
    currentResponses: Nat;       // Current response count
    remainingFund: Nat64;       // Remaining token balance in smallest unit
    fundingType: FundingType;    // Self-funded, crowdfunded, or treasury-funded
    contributors: [(Principal, Nat64)]; // List of contributors and their amounts
    pendingClaims: [(Principal, Nat64)]; // Unclaimed rewards: (user, amount)
  };

  type ClaimableReward = {
    pollId: PollId;
    pollTitle: Text;
    amount: Nat64;
    tokenSymbol: Text;
    tokenDecimals: Nat8;
    tokenCanister: ?Principal;
    pollClosed: Bool;
  };

  type ScopeType = { #project; #product };

  type Project = {
    id : ProjectId;
    slug : Text;
    name : Text;
    description : Text;
    createdBy : Principal;
    createdAt : Int;
    status : Text;
  };

  type ProjectSummary = { id : ProjectId; slug : Text; name : Text; status : Text };

  type Product = {
    id : ProductId;
    projectId : ProjectId;
    slug : Text;
    name : Text;
    description : Text;
    createdBy : Principal;
    createdAt : Int;
    status : Text;
  };

  type ProductSummary = { id : ProductId; projectId : ProjectId; slug : Text; name : Text; status : Text };

  type OptionT = { id : Nat; text : Text; votes : Nat };

  type Poll = {
    id : PollId;
    scopeType : ScopeType;
    scopeId : Nat;
    title : Text;
    description : Text;
    options : [OptionT];
    createdBy : Principal;
    createdAt : Int;
    closesAt : Int;
    status : Status;
    totalVotes : Nat;
    rewardFund : Nat;  // Keep for backward compatibility
    fundingInfo : ?FundingInfo;
    voterPrincipals : [Principal];
    config : ?PollConfig; // Poll configuration
  };

  type PollSummary = { id : PollId; scopeType : ScopeType; scopeId : Nat; title : Text; status : Status; totalVotes : Nat };

  type QuestionType = { #single; #multi; #likert; #short; #long; #number; #rating };

  type Question = {
    id : Nat;
    qType : QuestionType;
    text : Text;
    required : Bool;
    choices : ?[Text];
    min : ?Nat;
    max : ?Nat;
    helpText : ?Text;
  };

  type Survey = {
    id : SurveyId;
    scopeType : ScopeType;
    scopeId : Nat;
    title : Text;
    description : Text;
    createdBy : Principal;
    createdAt : Int;
    closesAt : Int;
    status : Status;
    rewardFund : Nat;  // Keep for backward compatibility
    fundingInfo : ?FundingInfo;
    allowAnonymous : Bool;
    questions : [Question];
    submissionsCount : Nat;
  };

  type SurveySummary = { id : SurveyId; scopeType : ScopeType; scopeId : Nat; title : Text; status : Status; submissionsCount : Nat };

  type AnswerValue = { #nat : Nat; #nats : [Nat]; #text : Text };
  type Answer = { questionId : Nat; value : AnswerValue };

  type Submission = { id : Nat; surveyId : SurveyId; respondent : ?Principal; submittedAt : Int; answers : [Answer] };

  type QuestionInput = { qType : Text; text : Text; required : Bool; choices : ?[Text]; min : ?Nat; max : ?Nat; helpText : ?Text };
  type AnswerInput = { questionId : Nat; nat : ?Nat; nats : ?[Nat]; text : ?Text };

  // Stable counters and storage (use arrays to avoid HashMap requirements)
  var nextProjectId : Nat = 1;
  var nextProductId : Nat = 1;
  var nextPollId : Nat = 1;
  var nextSurveyId : Nat = 1;
  var nextSubmissionId : Nat = 1;

  var projects : [Project] = [];
  var products : [Product] = [];
  var polls : [Poll] = [];
  var surveys : [Survey] = [];
  var submissions : [Submission] = [];

  // Token validation cache
  private var validatedTokens = Map.new<Principal, Bool>();
  private var tokenInfo = Map.new<Principal, (Text, Nat8)>(); // (symbol, decimals)

  // Helpers
  private func now() : Int { Time.now() };

  // Token helper functions
  private func validateTokenCanister(canister: Principal) : async Bool {
    // Check cache first
    switch (Map.get(validatedTokens, phash, canister)) {
      case (?isValid) { return isValid };
      case null {};
    };

    try {
      // Try to call ICRC-1 standard functions to validate the token
      let tokenActor = actor(Principal.toText(canister)) : actor {
        icrc1_name : () -> async Text;
        icrc1_symbol : () -> async Text;
        icrc1_decimals : () -> async Nat8;
        icrc1_supported_standards : () -> async [{ name: Text; url: Text }];
      };

      // Test basic ICRC-1 functions
      let symbol = await tokenActor.icrc1_symbol();
      let decimals = await tokenActor.icrc1_decimals();
      let standards = await tokenActor.icrc1_supported_standards();

      // Check if ICRC-1 is supported
      let isICRC1 = Array.find<{ name: Text; url: Text }>(standards, func(std) = std.name == "ICRC-1");

      switch (isICRC1) {
        case (?_) {
          // Cache the token info
          Map.set(tokenInfo, phash, canister, (symbol, decimals));
          Map.set(validatedTokens, phash, canister, true);
          true
        };
        case null {
          Map.set(validatedTokens, phash, canister, false);
          false
        };
      }
    } catch (e) {
      Map.set(validatedTokens, phash, canister, false);
      false
    }
  };

  private func getTokenInfo(canister: ?Principal) : async (Text, Nat8) {
    switch (canister) {
      case null { ("ICP", 8) }; // Default ICP info
      case (?c) {
        // Check for well-known mainnet tokens first
        if (Principal.equal(c, KNOWN_TOKENS.PULSE)) { return ("PULSE", 8); };
        // Other tokens commented out for initial deployment
        // if (Principal.equal(c, KNOWN_TOKENS.ckBTC)) { return ("ckBTC", 8); };
        // if (Principal.equal(c, KNOWN_TOKENS.ckETH)) { return ("ckETH", 18); };
        // if (Principal.equal(c, KNOWN_TOKENS.ckUSDC)) { return ("ckUSDC", 6); };
        // if (Principal.equal(c, KNOWN_TOKENS.CHAT)) { return ("CHAT", 8); };
        // if (Principal.equal(c, KNOWN_TOKENS.SNS1)) { return ("SNS1", 8); };

        // Check cache
        switch (Map.get(tokenInfo, phash, c)) {
          case (?info) { info };
          case null {
            if (await validateTokenCanister(c)) {
              switch (Map.get(tokenInfo, phash, c)) {
                case (?info) { info };
                case null { ("UNKNOWN", 8) };
              }
            } else {
              ("INVALID", 0)
            }
          };
        };
      };
    };
  };

  private func toScopeType(txt : Text) : ScopeType { if (txt == "project") { #project } else { #product } };
  private func toQuestionType(txt : Text) : QuestionType {
    if (txt == "single") return #single;
    if (txt == "multi") return #multi;
    if (txt == "likert") return #likert;
    if (txt == "short") return #short;
    if (txt == "long") return #long;
    if (txt == "number") return #number;
    return #rating;
  };

  private func isAnonymous(p : Principal) : Bool { Principal.toText(p) == "2vxsx-fae" };

  private func findProject(id : Nat) : ?Project {
    for (p in projects.vals()) { if (p.id == id) return ?p };
    null
  };
  private func findProduct(id : Nat) : ?Product {
    for (p in products.vals()) { if (p.id == id) return ?p };
    null
  };
  private func findPoll(id : Nat) : ?Poll {
    for (p in polls.vals()) { if (p.id == id) return ?p };
    null
  };
  private func findSurvey(id : Nat) : ?Survey {
    for (s in surveys.vals()) { if (s.id == id) return ?s };
    null
  };

  // Slicing helper
  private func sliceProjectSummaries(arr : [Project], offset : Nat, limit : Nat) : [ProjectSummary] {
    let size = arr.size();
    let start = if (offset > size) size else offset;
    let endVal = start + limit;
    let end_ = if (endVal > size) size else endVal;
    Array.tabulate<ProjectSummary>(end_ - start, func i {
      let p = arr[start + i];
      { id = p.id; slug = p.slug; name = p.name; status = p.status }
    })
  };

  // Projects
  public shared (msg) func create_project(name : Text, description : Text) : async ProjectId {
    let id = nextProjectId; nextProjectId += 1;
    let slug = Text.map(name, func c = if (c == ' ') { '-' } else { c });
    let proj : Project = { id = id; slug = slug; name = name; description = description; createdBy = msg.caller; createdAt = now(); status = "active" };
    projects := Array.append(projects, [proj]);
    id
  };

  public query func list_projects(offset : Nat, limit : Nat) : async [ProjectSummary] {
    sliceProjectSummaries(projects, offset, limit)
  };

  public query func get_project(id : ProjectId) : async ?Project { findProject(id) };

  public shared func update_project(id : ProjectId, name : Text, description : Text, status : Text) : async Bool {
    var updatedAny = false;
    let slug = Text.map(name, func c = if (c == ' ') { '-' } else { c });
    projects := Array.tabulate<Project>(projects.size(), func i {
      let p = projects[i];
      if (p.id == id) { updatedAny := true; { p with name = name; description = description; status = status; slug = slug } } else { p }
    });
    updatedAny
  };

  // Products
  public shared (msg) func create_product(projectId : ProjectId, name : Text, description : Text) : async ProductId {
    let id = nextProductId; nextProductId += 1;
    let slug = Text.map(name, func c = if (c == ' ') { '-' } else { c });
    let prod : Product = { id = id; projectId = projectId; slug = slug; name = name; description = description; createdBy = msg.caller; createdAt = now(); status = "active" };
    products := Array.append(products, [prod]);
    id
  };

  public query func list_products(projectId : ProjectId, offset : Nat, limit : Nat) : async [ProductSummary] {
    let filtered = Array.filter<Product>(products, func x = x.projectId == projectId);
    let size = filtered.size();
    let start = if (offset > size) size else offset;
    let endVal = start + limit;
    let end_ = if (endVal > size) size else endVal;
    Array.tabulate<ProductSummary>(end_ - start, func i {
      let p = filtered[start + i];
      { id = p.id; projectId = p.projectId; slug = p.slug; name = p.name; status = p.status }
    })
  };

  public query func get_product(id : ProductId) : async ?Product { findProduct(id) };

  public shared func update_product(id : ProductId, name : Text, description : Text, status : Text) : async Bool {
    var updatedAny = false;
    let slug = Text.map(name, func c = if (c == ' ') { '-' } else { c });
    products := Array.tabulate<Product>(products.size(), func i {
      let p = products[i];
      if (p.id == id) { updatedAny := true; { p with name = name; description = description; status = status; slug = slug } } else { p }
    });
    updatedAny
  };

  // Polls
  public shared (msg) func create_poll(
    scopeType : Text,
    scopeId : Nat,
    title : Text,
    description : Text,
    options : [Text],
    closesAt : Int,
    rewardFund : Nat,
    fundingEnabled : Bool,
    rewardPerVote : ?Nat64,
    fundingType : ?Text,
    // New configuration parameters
    maxResponses : ?Nat,
    allowAnonymous : ?Bool,
    allowMultiple : ?Bool,
    visibility : ?Text,
    rewardDistributionType : ?Text
  ) : async PollId {
    assert(options.size() >= 2);
    assert(closesAt > now());
    let id = nextPollId; nextPollId += 1;
    let opts = Array.tabulate<OptionT>(options.size(), func i { { id = i; text = options[i]; votes = 0 } });

    let funding_type = switch (fundingType) {
      case (?ft) {
        if (ft == "crowdfunded") { #Crowdfunded }
        else if (ft == "treasury-funded") { #TreasuryFunded }
        else { #SelfFunded }
      };
      case null { #SelfFunded };
    };

    let distribution_type = switch (rewardDistributionType) {
      case (?dt) { if (dt == "equal-split") { #EqualSplit } else { #Fixed } };
      case null { #Fixed };
    };

    // Create poll config
    let pollConfig : PollConfig = {
      maxResponses = maxResponses;
      allowAnonymous = switch (allowAnonymous) { case (?val) val; case null false };
      allowMultiple = switch (allowMultiple) { case (?val) val; case null false };
      visibility = switch (visibility) { case (?val) val; case null "public" };
      rewardDistributionType = distribution_type;
    };

    let fundingInfo = if (fundingEnabled) {
      switch (rewardPerVote) {
        case (?reward) {
          let totalFund = Nat64.fromNat(rewardFund) * 1_000_000; // Convert cents to e8s (rewardFund is in cents, so multiply by 1M instead of 100M)

          // Calculate maxResponses and rewardPerResponse based on distribution type
          let (calculatedMaxResponses, calculatedRewardPerResponse) : (?Nat, Nat64) = switch (distribution_type) {
            case (#EqualSplit) {
              // For equal split, use the maxResponses from config
              let rewardPerResp : Nat64 = switch (maxResponses) {
                case (?target) {
                  if (target > 0) { totalFund / Nat64.fromNat(target) } else { 0 : Nat64 }
                };
                case null { 0 : Nat64 }; // No max responses specified
              };
              (maxResponses, rewardPerResp)
            };
            case (#Fixed) {
              // For fixed reward, optionally calculate max responses if user wants it
              let maxResp : ?Nat = if (maxResponses != null) {
                // User specified maxResponses, use it
                maxResponses
              } else {
                // User didn't specify, leave as null (budget-based only)
                null
              };
              (maxResp, reward)
            };
          };

          ?{
            tokenType = #ICP;
            tokenCanister = null;
            tokenSymbol = "ICP";
            tokenDecimals = 8 : Nat8;
            totalFund = totalFund;
            rewardPerResponse = calculatedRewardPerResponse;
            maxResponses = calculatedMaxResponses;
            currentResponses = 0;
            remainingFund = totalFund;
            fundingType = funding_type;
            contributors = [];
            pendingClaims = [];
          }
        };
        case null { null }
      }
    } else { null };

    let poll : Poll = {
      id = id;
      scopeType = toScopeType(scopeType);
      scopeId = scopeId;
      title = title;
      description = description;
      options = opts;
      createdBy = msg.caller;
      createdAt = now();
      closesAt = closesAt;
      status = #active;
      totalVotes = 0;
      rewardFund = rewardFund;
      fundingInfo = fundingInfo;
      voterPrincipals = [];
      config = ?pollConfig;
    };
    polls := Array.append(polls, [poll]);

    // Track poll creation for quest system (non-blocking)
    ignore async {
      ignore await airdrop.update_quest_progress(msg.caller, 0, ?1, null, null, null, null);
    };

    id
  };

  // Create poll with custom token funding
  public shared (msg) func create_custom_token_poll(
    scopeType : Text,
    scopeId : Nat,
    title : Text,
    description : Text,
    options : [Text],
    closesAt : Int,
    tokenCanister : ?Principal,
    totalFunding : Nat64,
    rewardPerVote : Nat64,
    fundingType : Text,
    // New configuration parameters
    maxResponses : ?Nat,
    allowAnonymous : ?Bool,
    allowMultiple : ?Bool,
    visibility : ?Text,
    rewardDistributionType : ?Text
  ) : async Result.Result<PollId, Text> {
    assert(options.size() >= 2);
    assert(closesAt > now());

    // Validate custom token if provided (skip validation for known tokens)
    switch (tokenCanister) {
      case (?canister) {
        // Skip validation for known tokens to avoid unnecessary inter-canister calls
        if (not isKnownToken(canister)) {
          if (not (await validateTokenCanister(canister))) {
            return #err("Invalid or unsupported token canister");
          };
        };
      };
      case null { /* Using ICP */ };
    };

    let id = nextPollId; nextPollId += 1;
    let opts = Array.tabulate<OptionT>(options.size(), func i { { id = i; text = options[i]; votes = 0 } });

    // Get token info
    let (tokenSymbol, tokenDecimals) = await getTokenInfo(tokenCanister);

    let funding_type = if (fundingType == "crowdfunded") { #Crowdfunded }
                      else if (fundingType == "treasury-funded") { #TreasuryFunded }
                      else { #SelfFunded };

    let distribution_type = switch (rewardDistributionType) {
      case (?dt) { if (dt == "equal-split") { #EqualSplit } else { #Fixed } };
      case null { #Fixed };
    };

    // Create poll config
    let pollConfig : PollConfig = {
      maxResponses = maxResponses;
      allowAnonymous = switch (allowAnonymous) { case (?val) val; case null false };
      allowMultiple = switch (allowMultiple) { case (?val) val; case null false };
      visibility = switch (visibility) { case (?val) val; case null "public" };
      rewardDistributionType = distribution_type;
    };

    // Calculate platform fee (10%) and net funding amount
    let platformFee = (totalFunding * Nat64.fromNat(PLATFORM_FEE_PERCENTAGE)) / 100;
    let netFunding = totalFunding - platformFee; // Amount that goes to poll rewards

    // For self-funded polls, pull the total funding (including fee) from creator
    if (funding_type == #SelfFunded and totalFunding > 0) {
      switch (tokenCanister) {
        case (?canister) {
          try {
            let tokenActor = actor(Principal.toText(canister)) : actor {
              icrc2_transfer_from : ({
                from : { owner : Principal; subaccount : ?Blob };
                to : { owner : Principal; subaccount : ?Blob };
                amount : Nat;
                fee : ?Nat;
                memo : ?Blob;
                created_at_time : ?Nat64;
              }) -> async { #Ok : Nat; #Err : { #BadFee : { expected_fee : Nat }; #BadBurn : { min_burn_amount : Nat }; #InsufficientFunds : { balance : Nat }; #InsufficientAllowance : { allowance : Nat }; #TooOld; #CreatedInFuture : { ledger_time : Nat64 }; #Duplicate : { duplicate_of : Nat }; #TemporarilyUnavailable; #GenericError : { error_code : Nat; message : Text } } };
            };

            // Pull total funding from creator (net + fee)
            let transferArgs = {
              from = { owner = msg.caller; subaccount = null };
              to = { owner = Principal.fromActor(this); subaccount = null };
              amount = Nat64.toNat(totalFunding);
              fee = null;
              memo = null;
              created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
            };

            switch (await tokenActor.icrc2_transfer_from(transferArgs)) {
              case (#Ok(_)) {
                // Track platform fee collected
                switch (Map.get(treasuryFees, phash, canister)) {
                  case (?existingFees) {
                    Map.set(treasuryFees, phash, canister, existingFees + platformFee);
                  };
                  case null {
                    Map.set(treasuryFees, phash, canister, platformFee);
                  };
                };
                // Transfer successful, continue with net funding for poll
              };
              case (#Err(error)) {
                let errorMsg = switch (error) {
                  case (#InsufficientFunds { balance }) { "Insufficient funds. Balance: " # Nat.toText(balance) };
                  case (#InsufficientAllowance { allowance }) { "Insufficient allowance. Please approve this canister first. Current allowance: " # Nat.toText(allowance) };
                  case (#BadFee { expected_fee }) { "Bad fee. Expected: " # Nat.toText(expected_fee) };
                  case (#GenericError { message; error_code }) { "Error " # Nat.toText(error_code) # ": " # message };
                  case _ { "Token transfer failed" };
                };
                return #err("Failed to fund poll: " # errorMsg);
              };
            };
          } catch (e) {
            return #err("Failed to communicate with token canister: " # Error.message(e));
          };
        };
        case null { /* No token canister, skip funding */ };
      };
    };

    // Calculate maxResponses and rewardPerResponse based on distribution type
    // Use netFunding (after 10% fee deduction) for reward calculations
    let (calculatedMaxResponses, calculatedRewardPerResponse) : (?Nat, Nat64) = switch (distribution_type) {
      case (#EqualSplit) {
        // For equal split, use the maxResponses from config
        let rewardPerResp : Nat64 = switch (maxResponses) {
          case (?target) {
            if (target > 0) { netFunding / Nat64.fromNat(target) } else { 0 : Nat64 }
          };
          case null { 0 : Nat64 }; // No max responses specified
        };
        (maxResponses, rewardPerResp)
      };
      case (#Fixed) {
        // For fixed reward, optionally calculate max responses if user wants it
        let maxResp : ?Nat = if (maxResponses != null) {
          // User specified maxResponses, use it
          maxResponses
        } else {
          // User didn't specify, leave as null (budget-based only)
          null
        };
        (maxResp, rewardPerVote)
      };
    };

    let fundingInfo = {
      tokenType = switch (tokenCanister) {
        case null { #ICP };
        case (?canister) { #ICRC1(canister) };
      };
      tokenCanister = tokenCanister;
      tokenSymbol = tokenSymbol;
      tokenDecimals = tokenDecimals;
      totalFund = netFunding; // Store net funding (after fee deduction)
      rewardPerResponse = calculatedRewardPerResponse;
      maxResponses = calculatedMaxResponses;
      currentResponses = 0;
      remainingFund = netFunding; // Remaining fund is also net amount
      fundingType = funding_type;
      contributors = [];
      pendingClaims = [];
    };

    let poll : Poll = {
      id = id;
      scopeType = toScopeType(scopeType);
      scopeId = scopeId;
      title = title;
      description = description;
      options = opts;
      createdBy = msg.caller;
      createdAt = now();
      closesAt = closesAt;
      status = #active;
      totalVotes = 0;
      rewardFund = Nat64.toNat(totalFunding / 1_000_000); // Convert back to legacy format for backward compatibility
      fundingInfo = ?fundingInfo;
      voterPrincipals = [];
      config = ?pollConfig;
    };

    polls := Array.append(polls, [poll]);

    // Track poll creation for quest system (non-blocking)
    ignore async {
      ignore await airdrop.update_quest_progress(msg.caller, 0, ?1, null, null, null, null);
    };

    #ok(id)
  };

  // Fund a crowdfunded poll with PULSE tokens
  public shared (msg) func fund_poll(pollId : PollId, amount : Nat64) : async Result.Result<Text, Text> {
    // Find the poll
    let pollOpt = findPoll(pollId);
    switch (pollOpt) {
      case null { return #err("Poll not found") };
      case (?poll) {
        // Check if poll has funding info
        switch (poll.fundingInfo) {
          case null { return #err("Poll does not accept funding") };
          case (?info) {
            // Check if poll is crowdfunded
            switch (info.fundingType) {
              case (#SelfFunded) { return #err("Poll is self-funded and does not accept contributions") };
              case (#TreasuryFunded) { return #err("Poll is treasury-funded and does not accept public contributions") };
              case (#Crowdfunded) {
                // Check if poll is still active
                if (poll.status != #active) {
                  return #err("Poll is closed and cannot accept funding");
                };

                // Transfer tokens from contributor to this canister
                let tokenCanister = switch (info.tokenCanister) {
                  case (?canister) { canister };
                  case null { return #err("Invalid token configuration") };
                };

                // Use ICRC-2 transfer_from to pull tokens from the user's wallet
                // Note: User must approve this canister first via icrc2_approve
                try {
                  let tokenActor = actor(Principal.toText(tokenCanister)) : actor {
                    icrc2_transfer_from : ({
                      from : { owner : Principal; subaccount : ?Blob };
                      to : { owner : Principal; subaccount : ?Blob };
                      amount : Nat;
                      fee : ?Nat;
                      memo : ?Blob;
                      created_at_time : ?Nat64;
                    }) -> async { #Ok : Nat; #Err : { #BadFee : { expected_fee : Nat }; #BadBurn : { min_burn_amount : Nat }; #InsufficientFunds : { balance : Nat }; #InsufficientAllowance : { allowance : Nat }; #TooOld; #CreatedInFuture : { ledger_time : Nat64 }; #Duplicate : { duplicate_of : Nat }; #TemporarilyUnavailable; #GenericError : { error_code : Nat; message : Text } } };
                  };

                  let transferArgs = {
                    from = { owner = msg.caller; subaccount = null };
                    to = { owner = Principal.fromActor(this); subaccount = null };
                    amount = Nat64.toNat(amount);
                    fee = null;
                    memo = null;
                    created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
                  };

                  switch (await tokenActor.icrc2_transfer_from(transferArgs)) {
                    case (#Ok(_)) {
                      // Transfer successful, now update the poll's funding info
                      polls := Array.tabulate<Poll>(polls.size(), func i {
                        let p = polls[i];
                        if (p.id == pollId) {
                          switch (p.fundingInfo) {
                            case (?fi) {
                              let newContributors = Array.append(fi.contributors, [(msg.caller, amount)]);
                              let newTotalFund = fi.totalFund + amount;
                              let newRemainingFund = fi.remainingFund + amount;
                              // Only recalculate maxResponses if it was originally set
                              let newMaxResponses = switch (fi.maxResponses) {
                                case null { null };  // Keep as unlimited
                                case (?_) {  // Was set, so recalculate
                                  if (fi.rewardPerResponse > 0) {
                                    ?Nat64.toNat(newTotalFund / fi.rewardPerResponse)
                                  } else { fi.maxResponses }
                                };
                              };

                              let newFundingInfo = {
                                fi with
                                totalFund = newTotalFund;
                                remainingFund = newRemainingFund;
                                maxResponses = newMaxResponses;
                                contributors = newContributors;
                              };

                              { p with fundingInfo = ?newFundingInfo }
                            };
                            case null { p }
                          }
                        } else { p }
                      });

                      #ok("Successfully contributed " # Nat64.toText(amount) # " " # info.tokenSymbol # " to poll")
                    };
                    case (#Err(error)) {
                      let errorMsg = switch (error) {
                        case (#InsufficientFunds { balance }) { "Insufficient funds. Balance: " # Nat.toText(balance) };
                        case (#InsufficientAllowance { allowance }) { "Insufficient allowance. Please approve this canister first. Current allowance: " # Nat.toText(allowance) };
                        case (#BadFee { expected_fee }) { "Bad fee. Expected: " # Nat.toText(expected_fee) };
                        case (#GenericError { message; error_code }) { "Error " # Nat.toText(error_code) # ": " # message };
                        case _ { "Token transfer failed" };
                      };
                      #err(errorMsg)
                    };
                  };
                } catch (e) {
                  #err("Failed to communicate with token canister: " # Error.message(e))
                };
              };
            };
          };
        };
      };
    }
  };

  // Claim escrowed rewards for a poll
  public shared (msg) func claim_poll_reward(pollId : PollId) : async Result.Result<Text, Text> {
    let pollOpt = findPoll(pollId);
    switch (pollOpt) {
      case null { return #err("Poll not found") };
      case (?poll) {
        // Check if poll status allows claiming - must be in claimsOpen status
        if (poll.status != #claimsOpen) {
          return #err("Rewards can only be claimed when poll is in 'Claims Open' status");
        };

        switch (poll.fundingInfo) {
          case null { return #err("Poll has no rewards") };
          case (?info) {
            // Find user's pending claims
            var userReward : Nat64 = 0;
            var newPendingClaims : [(Principal, Nat64)] = [];

            for ((principal, amount) in info.pendingClaims.vals()) {
              if (Principal.equal(principal, msg.caller)) {
                userReward := userReward + amount;
              } else {
                newPendingClaims := Array.append(newPendingClaims, [(principal, amount)]);
              };
            };

            if (userReward == 0) {
              return #err("No pending rewards to claim");
            };

            // Transfer tokens to user
            try {
              let tokenCanister = switch (info.tokenCanister) {
                case (?canister) { canister };
                case null { return #err("Invalid token configuration") };
              };

              let tokenActor = actor(Principal.toText(tokenCanister)) : actor {
                icrc1_transfer : (TransferArgs) -> async TransferResult;
              };

              let transferArgs : TransferArgs = {
                from_subaccount = null;
                to = { owner = msg.caller; subaccount = null };
                amount = Nat64.toNat(userReward);
                fee = null;
                memo = null;
                created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
              };

              switch (await tokenActor.icrc1_transfer(transferArgs)) {
                case (#Ok(_)) {
                  // Update poll to remove claimed rewards
                  polls := Array.tabulate<Poll>(polls.size(), func i {
                    let p = polls[i];
                    if (p.id == pollId) {
                      switch (p.fundingInfo) {
                        case (?fi) {
                          let newFundingInfo = {
                            fi with
                            pendingClaims = newPendingClaims;
                          };
                          { p with fundingInfo = ?newFundingInfo }
                        };
                        case null { p }
                      }
                    } else { p }
                  });

                  // Track reward claim for quest system (non-blocking)
                  ignore async {
                    ignore await airdrop.update_quest_progress(msg.caller, 0, null, null, null, null, ?1);
                  };

                  #ok("Successfully claimed " # Nat64.toText(userReward) # " " # info.tokenSymbol)
                };
                case (#Err(error)) {
                  let errorMsg = switch (error) {
                    case (#InsufficientFunds { balance }) { "Insufficient funds in poll escrow. Balance: " # Nat.toText(balance) };
                    case (#GenericError { message; error_code }) { "Error " # Nat.toText(error_code) # ": " # message };
                    case _ { "Token transfer failed" };
                  };
                  #err(errorMsg)
                };
              };
            } catch (e) {
              #err("Failed to communicate with token canister: " # Error.message(e))
            };
          };
        };
      };
    }
  };

  // Get all claimable rewards for a user
  public query func get_claimable_rewards(user : Principal) : async [ClaimableReward] {
    var claimableRewards : [ClaimableReward] = [];

    for (poll in polls.vals()) {
      switch (poll.fundingInfo) {
        case (?info) {
          // Check if poll is claimable - must be in claimsOpen status
          let pollClosed = (poll.status == #claimsOpen);

          // Find user's pending claims in this poll
          var userAmount : Nat64 = 0;
          for ((principal, amount) in info.pendingClaims.vals()) {
            if (Principal.equal(principal, user)) {
              userAmount := userAmount + amount;
            };
          };

          if (userAmount > 0) {
            let reward : ClaimableReward = {
              pollId = poll.id;
              pollTitle = poll.title;
              amount = userAmount;
              tokenSymbol = info.tokenSymbol;
              tokenDecimals = info.tokenDecimals;
              tokenCanister = info.tokenCanister;
              pollClosed = pollClosed;
            };
            claimableRewards := Array.append(claimableRewards, [reward]);
          };
        };
        case null { };
      };
    };

    claimableRewards
  };

  public query func list_polls_by_project(projectId : ProjectId, offset : Nat, limit : Nat) : async [PollSummary] {
    let filtered = Array.filter<Poll>(polls, func p = (p.scopeType == #project) and (p.scopeId == projectId));
    let size = filtered.size();
    let start = if (offset > size) size else offset;
    let endVal = start + limit;
    let end_ = if (endVal > size) size else endVal;
    Array.tabulate<PollSummary>(end_ - start, func i {
      let p = filtered[start + i];
      { id = p.id; scopeType = p.scopeType; scopeId = p.scopeId; title = p.title; status = p.status; totalVotes = p.totalVotes }
    })
  };

  public query func list_polls_by_product(productId : ProductId, offset : Nat, limit : Nat) : async [PollSummary] {
    let filtered = Array.filter<Poll>(polls, func p = (p.scopeType == #product) and (p.scopeId == productId));
    let size = filtered.size();
    let start = if (offset > size) size else offset;
    let endVal = start + limit;
    let end_ = if (endVal > size) size else endVal;
    Array.tabulate<PollSummary>(end_ - start, func i {
      let p = filtered[start + i];
      { id = p.id; scopeType = p.scopeType; scopeId = p.scopeId; title = p.title; status = p.status; totalVotes = p.totalVotes }
    })
  };

  public query func get_poll(id : PollId) : async ?Poll { findPoll(id) };

  public shared (msg) func vote(pollId : PollId, optionId : Nat) : async Bool {
    // First, find the poll and validate the vote
    switch (findPoll(pollId)) {
      case (?poll) {
        // Only active polls accept votes
        if (poll.status != #active) { return false };
        // Also check if time has expired
        if (poll.closesAt <= now()) { return false };

        // Check one vote per principal
        var already = false;
        for (vp in poll.voterPrincipals.vals()) { if (vp == msg.caller) { already := true } };
        if (already or (optionId >= poll.options.size())) { return false };

        // Now update the poll data and add reward to escrow if funding is enabled
        var ok = false;
        polls := Array.tabulate<Poll>(polls.size(), func i {
          let p = polls[i];
          if (p.id == pollId) {
            let updatedOptions = Array.tabulate<OptionT>(p.options.size(), func j {
              let o = p.options[j];
              if (j == optionId) { { id = o.id; text = o.text; votes = o.votes + 1 } } else { o }
            });
            ok := true;
            // Update funding info if enabled - add reward to pendingClaims instead of distributing
            let updatedFunding = switch (p.fundingInfo) {
              case (?funding) {
                // Check budget availability AND optional maxResponses limit
                let canAcceptVote = (funding.remainingFund >= funding.rewardPerResponse) and
                                   (switch (funding.maxResponses) {
                                     case null { true };  // No limit set, budget-based only
                                     case (?max) { funding.currentResponses < max };
                                   });
                if (canAcceptVote) {
                  // Add reward to pending claims (escrow)
                  let newPendingClaims = Array.append(funding.pendingClaims, [(msg.caller, funding.rewardPerResponse)]);
                  ?{
                    funding with
                    currentResponses = funding.currentResponses + 1;
                    remainingFund = funding.remainingFund - funding.rewardPerResponse;
                    pendingClaims = newPendingClaims;
                  }
                } else { ?funding }
              };
              case null { null }
            };
            { p with options = updatedOptions; totalVotes = p.totalVotes + 1; voterPrincipals = Array.append(p.voterPrincipals, [msg.caller]); fundingInfo = updatedFunding }
          } else { p }
        });

        // Track vote for quest system (non-blocking)
        if (ok) {
          ignore async {
            ignore await airdrop.update_quest_progress(msg.caller, 0, null, ?1, null, null, null);
          };
        };

        ok
      };
      case null { false }
    }
  };

  // Poll status transition functions with authorization

  // Pause an active poll (only creator can pause)
  public shared (msg) func pause_poll(pollId : PollId) : async Result.Result<Text, Text> {
    let pollOpt = findPoll(pollId);
    switch (pollOpt) {
      case null { return #err("Poll not found") };
      case (?poll) {
        // Check authorization
        if (poll.createdBy != msg.caller) {
          return #err("Only poll creator can pause the poll");
        };

        // Check current status
        if (poll.status != #active) {
          return #err("Only active polls can be paused");
        };

        // Update poll status
        polls := Array.tabulate<Poll>(polls.size(), func i {
          let p = polls[i];
          if (p.id == pollId) { { p with status = #paused } } else { p }
        });

        #ok("Poll paused successfully")
      };
    }
  };

  // Resume a paused poll (only creator can resume)
  public shared (msg) func resume_poll(pollId : PollId) : async Result.Result<Text, Text> {
    let pollOpt = findPoll(pollId);
    switch (pollOpt) {
      case null { return #err("Poll not found") };
      case (?poll) {
        // Check authorization
        if (poll.createdBy != msg.caller) {
          return #err("Only poll creator can resume the poll");
        };

        // Check current status
        if (poll.status != #paused) {
          return #err("Only paused polls can be resumed");
        };

        // Update poll status
        polls := Array.tabulate<Poll>(polls.size(), func i {
          let p = polls[i];
          if (p.id == pollId) { { p with status = #active } } else { p }
        });

        #ok("Poll resumed successfully")
      };
    }
  };

  // Start rewards claiming period (only creator can start)
  public shared (msg) func start_rewards_claiming(pollId : PollId) : async Result.Result<Text, Text> {
    let pollOpt = findPoll(pollId);
    switch (pollOpt) {
      case null { return #err("Poll not found") };
      case (?poll) {
        // Check authorization
        if (poll.createdBy != msg.caller) {
          return #err("Only poll creator can start rewards claiming");
        };

        // Check current status - can transition from active or paused
        if (poll.status != #active and poll.status != #paused) {
          return #err("Can only start claiming from active or paused polls");
        };

        // Update poll status
        polls := Array.tabulate<Poll>(polls.size(), func i {
          let p = polls[i];
          if (p.id == pollId) { { p with status = #claimsOpen } } else { p }
        });

        #ok("Rewards claiming period started")
      };
    }
  };

  // End rewards claiming period (only creator can end)
  public shared (msg) func end_rewards_claiming(pollId : PollId) : async Result.Result<Text, Text> {
    let pollOpt = findPoll(pollId);
    switch (pollOpt) {
      case null { return #err("Poll not found") };
      case (?poll) {
        // Check authorization
        if (poll.createdBy != msg.caller) {
          return #err("Only poll creator can end rewards claiming");
        };

        // Check current status
        if (poll.status != #claimsOpen) {
          return #err("Rewards claiming must be open to end it");
        };

        // Update poll status
        polls := Array.tabulate<Poll>(polls.size(), func i {
          let p = polls[i];
          if (p.id == pollId) { { p with status = #claimsEnded } } else { p }
        });

        #ok("Rewards claiming period ended")
      };
    }
  };

  // Close poll permanently (only creator can close)
  public shared (msg) func close_poll(pollId : PollId) : async Result.Result<Text, Text> {
    let pollOpt = findPoll(pollId);
    switch (pollOpt) {
      case null { return #err("Poll not found") };
      case (?poll) {
        // Check authorization
        if (poll.createdBy != msg.caller) {
          return #err("Only poll creator can close the poll");
        };

        // Can close from any status except already closed
        if (poll.status == #closed) {
          return #err("Poll is already closed");
        };

        // Update poll status
        polls := Array.tabulate<Poll>(polls.size(), func i {
          let p = polls[i];
          if (p.id == pollId) { { p with status = #closed } } else { p }
        });

        #ok("Poll closed successfully")
      };
    }
  };

  // Distribute custom token rewards for a poll
  private func distributeCustomTokenReward(
    recipient: Principal,
    tokenCanister: Principal,
    amount: Nat64
  ) : async Bool {
    try {
      let tokenActor = actor(Principal.toText(tokenCanister)) : actor {
        icrc1_transfer : (TransferArgs) -> async TransferResult;
      };

      let transferArgs : TransferArgs = {
        from_subaccount = null;
        to = { owner = recipient; subaccount = null };
        amount = Nat64.toNat(amount);
        fee = null;
        memo = null;
        created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
      };

      switch (await tokenActor.icrc1_transfer(transferArgs)) {
        case (#Ok(_)) { true };
        case (#Err(_)) { false };
      };
    } catch (e) {
      false
    }
  };

  // Get available tokens (for frontend dropdown)
  public query func get_supported_tokens() : async [(Principal, Text, Nat8)] {
    // Start with our deployed PULSE token only
    var tokens : [(Principal, Text, Nat8)] = [
      (KNOWN_TOKENS.PULSE, "PULSE", 8),
      // Other tokens commented out for initial deployment
      // (KNOWN_TOKENS.ckBTC, "ckBTC", 8),
      // (KNOWN_TOKENS.ckETH, "ckETH", 18),
      // (KNOWN_TOKENS.ckUSDC, "ckUSDC", 6),
      // (KNOWN_TOKENS.CHAT, "CHAT", 8),
      // (KNOWN_TOKENS.SNS1, "SNS1", 8),
    ];

    // Add cached tokens that aren't already in the list
    for ((canister, (symbol, decimals)) in Map.entries(tokenInfo)) {
      let isKnown = Array.find<(Principal, Text, Nat8)>(tokens, func((p, _, _)) = Principal.equal(p, canister));
      switch (isKnown) {
        case null {
          tokens := Array.append(tokens, [(canister, symbol, decimals)]);
        };
        case (?_) {}; // Already in the list
      };
    };

    tokens
  };

  // Surveys
  public shared (msg) func create_survey(scopeType : Text, scopeId : Nat, title : Text, description : Text, closesAt : Int, rewardFund : Nat, allowAnonymous : Bool, questions : [QuestionInput], fundingEnabled : Bool, rewardPerResponse : ?Nat64) : async SurveyId {
    assert(questions.size() >= 1);
    assert(closesAt > now());
    let id = nextSurveyId; nextSurveyId += 1;
    let qs = Array.tabulate<Question>(questions.size(), func i {
      let qi = questions[i];
      { id = i; qType = toQuestionType(qi.qType); text = qi.text; required = qi.required; choices = qi.choices; min = qi.min; max = qi.max; helpText = qi.helpText }
    });
    let fundingInfo = if (fundingEnabled) {
      switch (rewardPerResponse) {
        case (?reward) {
          let totalFund = Nat64.fromNat(rewardFund) * 1_000_000; // Convert cents to e8s (rewardFund is in cents, so multiply by 1M instead of 100M)
          // For surveys, we currently auto-calculate maxResponses from budget (can be made optional in future)
          let maxResponses : ?Nat = if (reward > 0) { ?Nat64.toNat(totalFund / reward) } else { ?0 };
          ?{
            tokenType = #ICP;
            tokenCanister = null;
            tokenSymbol = "ICP";
            tokenDecimals = 8 : Nat8;
            totalFund = totalFund;
            rewardPerResponse = reward;
            maxResponses = maxResponses;
            currentResponses = 0;
            remainingFund = totalFund;
            fundingType = #SelfFunded;
            contributors = [];
            pendingClaims = [];
          }
        };
        case null { null }
      }
    } else { null };
    let survey : Survey = { id = id; scopeType = toScopeType(scopeType); scopeId = scopeId; title = title; description = description; createdBy = msg.caller; createdAt = now(); closesAt = closesAt; status = #active; rewardFund = rewardFund; fundingInfo = fundingInfo; allowAnonymous = allowAnonymous; questions = qs; submissionsCount = 0 };
    surveys := Array.append(surveys, [survey]);

    // Track survey creation for quest system (non-blocking)
    ignore async {
      ignore await airdrop.update_quest_progress(msg.caller, 0, null, null, ?1, null, null);
    };

    id
  };

  public query func get_survey(id : SurveyId) : async ?Survey { findSurvey(id) };

  public query func list_surveys_by_project(projectId : ProjectId, offset : Nat, limit : Nat) : async [SurveySummary] {
    let filtered = Array.filter<Survey>(surveys, func s = (s.scopeType == #project) and (s.scopeId == projectId));
    let size = filtered.size();
    let start = if (offset > size) size else offset;
    let endVal = start + limit;
    let end_ = if (endVal > size) size else endVal;
    Array.tabulate<SurveySummary>(end_ - start, func i {
      let s = filtered[start + i];
      { id = s.id; scopeType = s.scopeType; scopeId = s.scopeId; title = s.title; status = s.status; submissionsCount = s.submissionsCount }
    })
  };

  public query func list_surveys_by_product(productId : ProductId, offset : Nat, limit : Nat) : async [SurveySummary] {
    let filtered = Array.filter<Survey>(surveys, func s = (s.scopeType == #product) and (s.scopeId == productId));
    let size = filtered.size();
    let start = if (offset > size) size else offset;
    let endVal = start + limit;
    let end_ = if (endVal > size) size else endVal;
    Array.tabulate<SurveySummary>(end_ - start, func i {
      let s = filtered[start + i];
      { id = s.id; scopeType = s.scopeType; scopeId = s.scopeId; title = s.title; status = s.status; submissionsCount = s.submissionsCount }
    })
  };

  public shared (msg) func submit_survey(surveyId : SurveyId, answers : [AnswerInput]) : async Bool {
    var ok = false;
    var shouldTrackQuest = false;
    surveys := Array.tabulate<Survey>(surveys.size(), func i {
      let s = surveys[i];
      if (s.id == surveyId) {
        if ((s.status == #closed) or (s.closesAt <= now())) { ok := false; s } else {
          if ((not s.allowAnonymous) and isAnonymous(msg.caller)) { ok := false; s } else {
            // Enforce one submission per non-anonymous principal
            if (not isAnonymous(msg.caller)) {
              for (sub in submissions.vals()) {
                if (sub.surveyId == surveyId) {
                  switch (sub.respondent) { case (?p) { if (p == msg.caller) { ok := false; return s } }; case null {} }
                }
              }
            };
            // Validate
            for (q in s.questions.vals()) {
              var found : ?AnswerInput = null;
              for (a in answers.vals()) { if (a.questionId == q.id) { found := ?a } };
              switch (found) {
                case (?a) {
                  switch (q.qType) {
                    case (#single) {
                      switch (a.nat, q.choices) {
                        case (?n, ?chs) { if (n >= chs.size()) { ok := false; return s } };
                        case (_, _) { ok := false; return s };
                      }
                    };
                    case (#multi) {
                      switch (a.nats, q.choices) {
                        case (?ns, ?chs) {
                          for (ix in ns.vals()) { if (ix >= chs.size()) { ok := false; return s } }
                        };
                        case (_, _) { ok := false; return s };
                      }
                    };
                    case (#likert) {
                      switch (a.nat) { case (?v) { switch (q.min) { case (?mn) { if (v < mn) { ok := false; return s } }; case null {} }; switch (q.max) { case (?mx) { if (v > mx) { ok := false; return s } }; case null {} } }; case null { ok := false; return s } }
                    };
                    case (#number) {
                      switch (a.nat) { case (?v) { switch (q.min) { case (?mn) { if (v < mn) { ok := false; return s } }; case null {} }; switch (q.max) { case (?mx) { if (v > mx) { ok := false; return s } }; case null {} } }; case null { ok := false; return s } }
                    };
                    case (#rating) {
                      switch (a.nat) { case (?v) { switch (q.min) { case (?mn) { if (v < mn) { ok := false; return s } }; case null {} }; switch (q.max) { case (?mx) { if (v > mx) { ok := false; return s } }; case null {} } }; case null { ok := false; return s } }
                    };
                    case (#short) { switch (a.text) { case (?_) {}; case null { ok := false; return s } } };
                    case (#long) { switch (a.text) { case (?_) {}; case null { ok := false; return s } } };
                  }
                };
                case null { if (q.required) { ok := false; return s } };
              }
            };

            let subId = nextSubmissionId; nextSubmissionId += 1;
            let newSub : Submission = {
              id = subId;
              surveyId = surveyId;
              respondent = if (s.allowAnonymous and isAnonymous(msg.caller)) null else ?msg.caller;
              submittedAt = now();
              answers = Array.tabulate<Answer>(answers.size(), func k {
                let a = answers[k];
                {
                  questionId = a.questionId;
                  value = switch (a.nats, a.nat, a.text) {
                    case (?ns, _, _) { #nats(ns) };
                    case (null, ?n, _) { #nat(n) };
                    case (null, null, ?t) { #text(t) };
                    case _ { #text("") };
                  };
                }
              });
            };
            submissions := Array.append(submissions, [newSub]);
            ok := true;

            // Mark that we should track quest progress (only for non-anonymous respondents)
            if (not (s.allowAnonymous and isAnonymous(msg.caller))) {
              shouldTrackQuest := true;
            };

            // Update funding info if enabled
            let updatedFunding = switch (s.fundingInfo) {
              case (?funding) {
                // Check budget availability AND optional maxResponses limit
                let canAcceptSubmission = (funding.remainingFund >= funding.rewardPerResponse) and
                                         (switch (funding.maxResponses) {
                                           case null { true };
                                           case (?max) { funding.currentResponses < max };
                                         });
                if (canAcceptSubmission) {
                  ?{ funding with currentResponses = funding.currentResponses + 1; remainingFund = funding.remainingFund - funding.rewardPerResponse }
                } else { ?funding }
              };
              case null { null }
            };
            { s with submissionsCount = s.submissionsCount + 1; fundingInfo = updatedFunding }
          }
        }
      } else { s }
    });

    // Track survey submission for quest system (non-blocking)
    if (shouldTrackQuest) {
      ignore async {
        ignore await airdrop.update_quest_progress(msg.caller, 0, null, null, null, ?1, null);
      };
    };

    ok
  };

  public shared func close_survey(surveyId : SurveyId) : async Bool {
    var closed = false;
    surveys := Array.tabulate<Survey>(surveys.size(), func i {
      let s = surveys[i];
      if (s.id == surveyId) { closed := true; { s with status = #closed } } else { s }
    });
    closed
  };

  public query func export_survey_csv(surveyId : SurveyId) : async Blob {
    var csv : Text = "submissionId,respondent,submittedAt,questionId,value";
    for (sub in submissions.vals()) {
      if (sub.surveyId == surveyId) {
        let resp = switch (sub.respondent) { case (?p) Principal.toText(p); case null "" };
        for (ans in sub.answers.vals()) {
          let vtxt = switch (ans.value) { case (#nat(n)) Nat.toText(n); case (#nats(ns)) {
            var t : Text = "";
            var first = true;
            for (ix in ns.vals()) { if (first) { t := Nat.toText(ix); first := false } else { t := t # "," # Nat.toText(ix) } };
            t
          }; case (#text(t)) t };
          csv := csv # "\n" # Nat.toText(sub.id) # "," # resp # "," # Int.toText(sub.submittedAt) # "," # Nat.toText(ans.questionId) # "," # vtxt;
        }
      }
    };
    Text.encodeUtf8(csv)
  };

  // Get list of respondents for a survey
  public query func get_survey_respondents(surveyId : SurveyId) : async [Principal] {
    var respondents : [Principal] = [];
    for (sub in submissions.vals()) {
      if (sub.surveyId == surveyId) {
        switch (sub.respondent) {
          case (?principal) {
            respondents := Array.append(respondents, [principal]);
          };
          case null { };
        };
      };
    };
    respondents
  };

  // Get all submissions for a survey
  public query func get_survey_submissions(surveyId : SurveyId) : async [Submission] {
    Array.filter<Submission>(submissions, func sub = sub.surveyId == surveyId)
  };

  // Update survey funding
  public shared(msg) func update_survey_funding(surveyId : SurveyId, totalFund : Nat64, rewardPerResponse : Nat64) : async Bool {
    var updated = false;
    surveys := Array.tabulate<Survey>(surveys.size(), func i {
      let s = surveys[i];
      if (s.id == surveyId and s.createdBy == msg.caller) {
        // Calculate max responses (optional)
        let maxResponses : ?Nat = if (rewardPerResponse > 0) {
          ?Nat64.toNat(totalFund / rewardPerResponse)
        } else { ?0 };

        // Get token info (use existing or default to ICP)
        let (tokenSymbol, tokenDecimals) = switch (s.fundingInfo) {
          case (?existing) { (existing.tokenSymbol, existing.tokenDecimals) };
          case null { ("ICP", 8 : Nat8) };
        };

        // Get current responses count
        let currentResponses = switch (s.fundingInfo) {
          case (?existing) { existing.currentResponses };
          case null { 0 };
        };

        // Calculate remaining fund
        let usedFund = Nat64.fromNat(currentResponses) * rewardPerResponse;
        let remainingFund : Nat64 = if (totalFund > usedFund) { totalFund - usedFund } else { 0 : Nat64 };

        let newFunding : FundingInfo = {
          tokenType = #ICP;
          tokenCanister = null;
          tokenSymbol = tokenSymbol;
          tokenDecimals = tokenDecimals;
          totalFund = totalFund;
          rewardPerResponse = rewardPerResponse;
          maxResponses = maxResponses;
          currentResponses = currentResponses;
          remainingFund = remainingFund;
          fundingType = #SelfFunded;
          contributors = [];
          pendingClaims = [];
        };

        updated := true;
        { s with fundingInfo = ?newFunding }
      } else { s }
    });
    updated
  };

  // Validate and get info for a custom token
  public func validate_custom_token(canister: Principal) : async ?{symbol: Text; decimals: Nat8} {
    if (await validateTokenCanister(canister)) {
      let (symbol, decimals) = await getTokenInfo(?canister);
      ?{symbol = symbol; decimals = decimals}
    } else {
      null
    }
  };

  // Reward tracking types
  type RewardStatus = { #pending; #claimed; #processing };

  type PendingReward = {
    id: Text;
    pollId: PollId;
    pollTitle: Text;
    userPrincipal: Principal;
    amount: Nat64;
    tokenSymbol: Text;
    tokenDecimals: Nat8;
    tokenCanister: ?Principal;
    status: RewardStatus;
    claimedAt: ?Int;
    votedAt: Int;
  };

  // Storage for user rewards
  private var rewardCounter : Nat = 0;
  private var rewardsArray : [PendingReward] = [];
  private var rewards = Map.new<Text, PendingReward>();

  // DEPRECATED: OpenAI API key - kept for stable variable compatibility
  // No longer used - gateway handles authentication
  private var openaiApiKey : Text = "";

  // Platform fee configuration (10% fee)
  private let PLATFORM_FEE_PERCENTAGE : Nat = 10; // 10% platform fee

  // Treasury tracking - store collected fees by token
  private var treasuryFees = Map.new<Principal, Nat64>(); // Token canister -> total fees collected
  private var treasuryFeesICP : Nat64 = 0; // ICP fees collected separately

  // Initialize rewards map from stable array
  private func initializeRewards() {
    for (reward in rewardsArray.vals()) {
      Map.set(rewards, Map.thash, reward.id, reward);
    };
  };

  // Pre-upgrade: save rewards to stable array
  system func preupgrade() {
    let vals = Map.vals(rewards);
    rewardsArray := Iter.toArray(vals);
  };

  // Post-upgrade: restore rewards from stable array
  system func postupgrade() {
    initializeRewards();
  };

  // Create a reward when user votes
  private func createReward(pollId: PollId, pollTitle: Text, userPrincipal: Principal, amount: Nat64, tokenSymbol: Text, tokenDecimals: Nat8, tokenCanister: ?Principal) : Text {
    rewardCounter += 1;
    let rewardId = "reward_" # Nat.toText(rewardCounter);

    let reward : PendingReward = {
      id = rewardId;
      pollId = pollId;
      pollTitle = pollTitle;
      userPrincipal = userPrincipal;
      amount = amount;
      tokenSymbol = tokenSymbol;
      tokenDecimals = tokenDecimals;
      tokenCanister = tokenCanister;
      status = #pending;
      claimedAt = null;
      votedAt = now();
    };

    Map.set(rewards, Map.thash, rewardId, reward);
    rewardId
  };

  // Get user's pending and claimed rewards
  public query func get_user_rewards(userPrincipal: Principal) : async [PendingReward] {
    let vals = Map.vals(rewards);
    let allRewards = Iter.toArray(vals);
    let userRewards = Array.filter(allRewards, func(reward: PendingReward) : Bool {
      reward.userPrincipal == userPrincipal
    });
    userRewards
  };

  // Claim a pending reward
  public shared (msg) func claim_reward(rewardId: Text) : async Bool {
    switch (Map.get(rewards, Map.thash, rewardId)) {
      case (?reward) {
        // Verify the caller owns this reward
        if (reward.userPrincipal != msg.caller) {
          return false;
        };

        // Check if already claimed or processing
        if (reward.status != #pending) {
          return false;
        };

        // Mark as processing
        let processingReward = { reward with status = #processing };
        Map.set(rewards, Map.thash, rewardId, processingReward);

        // Attempt to distribute the reward
        let success = switch (reward.tokenCanister) {
          case (?canister) {
            // Custom token reward
            await distributeCustomTokenReward(reward.userPrincipal, canister, reward.amount)
          };
          case null {
            // ICP reward - would need ICP ledger integration
            // For now, return true to simulate success
            true
          };
        };

        if (success) {
          // Mark as claimed
          let claimedReward = { reward with status = #claimed; claimedAt = ?now() };
          Map.set(rewards, Map.thash, rewardId, claimedReward);
          true
        } else {
          // Revert to pending if distribution failed
          Map.set(rewards, Map.thash, rewardId, reward);
          false
        }
      };
      case null { false }
    }
  };

  // Analytics types
  type TokenDistribution = {
    tokenSymbol: Text;
    amount: Text;
    count: Nat;
  };

  type AnalyticsOverview = {
    polls: {
      total: Nat;
      totalVotes: Nat;
      averageVotesPerPoll: Nat;
    };
    surveys: {
      total: Nat;
      totalSubmissions: Nat;
      averageSubmissionsPerSurvey: Nat;
    };
    funding: {
      totalFundsDisbursed: Text;
      disbursedByToken: [TokenDistribution];
    };
    engagement: {
      uniqueVoters: Nat;
      uniqueRespondents: Nat;
      totalUniqueUsers: Nat;
    };
  };

  // Get platform analytics overview
  public query func get_analytics_overview() : async AnalyticsOverview {
    // Calculate poll stats
    let totalPolls = polls.size();
    var totalVotes = 0;
    for (poll in polls.vals()) {
      for (option in poll.options.vals()) {
        totalVotes += option.votes;
      };
    };
    let avgVotesPerPoll = if (totalPolls > 0) { totalVotes / totalPolls } else { 0 };

    // Calculate survey stats
    let totalSurveys = surveys.size();
    let totalSubmissions = submissions.size();
    let avgSubmissionsPerSurvey = if (totalSurveys > 0) { totalSubmissions / totalSurveys } else { 0 };

    // Calculate funding stats
    var totalDisbursed : Nat64 = 0;
    var tokenDistMap = Map.new<Text, (Nat64, Nat)>(); // (total amount, count)

    // Calculate from claimed rewards
    let allRewards = Iter.toArray(Map.vals(rewards));
    for (reward in allRewards.vals()) {
      if (reward.status == #claimed) {
        totalDisbursed += reward.amount;

        // Track by token
        let key = reward.tokenSymbol;
        switch (Map.get(tokenDistMap, Map.thash, key)) {
          case (?existing) {
            let (amt, cnt) = existing;
            Map.set(tokenDistMap, Map.thash, key, (amt + reward.amount, cnt + 1));
          };
          case null {
            Map.set(tokenDistMap, Map.thash, key, (reward.amount, 1));
          };
        };
      };
    };

    // Convert token distribution map to array
    let tokenDistArray = Array.map<(Text, (Nat64, Nat)), TokenDistribution>(
      Iter.toArray(Map.entries(tokenDistMap)),
      func((symbol, data)) : TokenDistribution {
        let (amount, count) = data;
        {
          tokenSymbol = symbol;
          amount = Nat64.toText(amount);
          count = count;
        }
      }
    );

    // Calculate unique users (simplified - counts unique voters and respondents)
    var uniqueVotersSet = Map.new<Principal, Bool>();
    var uniqueRespondentsSet = Map.new<Principal, Bool>();

    for (poll in polls.vals()) {
      for (voter in poll.voterPrincipals.vals()) {
        Map.set(uniqueVotersSet, phash, voter, true);
      };
    };

    for (submission in submissions.vals()) {
      switch (submission.respondent) {
        case (?principal) {
          Map.set(uniqueRespondentsSet, phash, principal, true);
        };
        case null {};
      };
    };

    let uniqueVotersCount = Map.size(uniqueVotersSet);
    let uniqueRespondentsCount = Map.size(uniqueRespondentsSet);

    // Combine for total unique users
    var totalUniqueSet = Map.new<Principal, Bool>();
    for ((voter, _) in Map.entries(uniqueVotersSet)) {
      Map.set(totalUniqueSet, phash, voter, true);
    };
    for ((respondent, _) in Map.entries(uniqueRespondentsSet)) {
      Map.set(totalUniqueSet, phash, respondent, true);
    };
    let totalUniqueUsers = Map.size(totalUniqueSet);

    {
      polls = {
        total = totalPolls;
        totalVotes = totalVotes;
        averageVotesPerPoll = avgVotesPerPoll;
      };
      surveys = {
        total = totalSurveys;
        totalSubmissions = totalSubmissions;
        averageSubmissionsPerSurvey = avgSubmissionsPerSurvey;
      };
      funding = {
        totalFundsDisbursed = Nat64.toText(totalDisbursed);
        disbursedByToken = tokenDistArray;
      };
      engagement = {
        uniqueVoters = uniqueVotersCount;
        uniqueRespondents = uniqueRespondentsCount;
        totalUniqueUsers = totalUniqueUsers;
      };
    }
  };

  // Get counts for sidebar stats
  public query func get_stats() : async { projectCount: Nat; surveyCount: Nat; pollCount: Nat } {
    var surveyCount = 0;
    var pollCount = 0;

    // Count surveys across all projects
    for (project in projects.vals()) {
      let projectSurveys = Array.filter<Survey>(surveys, func s = (s.scopeType == #project) and (s.scopeId == project.id));
      surveyCount += projectSurveys.size();
    };

    // Count polls across all projects
    for (project in projects.vals()) {
      let projectPolls = Array.filter<Poll>(polls, func p = (p.scopeType == #project) and (p.scopeId == project.id));
      pollCount += projectPolls.size();
    };

    {
      projectCount = projects.size();
      surveyCount = surveyCount;
      pollCount = pollCount;
    }
  };

  // HTTPS Outcall Types for OpenAI Integration
  type HttpHeader = {
    name: Text;
    value: Text;
  };

  type HttpMethod = {
    #get;
    #post;
    #head;
  };

  type TransformContext = {
    function: shared query TransformArgs -> async HttpResponsePayload;
    context: Blob;
  };

  type CanisterHttpRequestArgs = {
    url: Text;
    max_response_bytes: ?Nat64;
    headers: [HttpHeader];
    body: ?Blob;
    method: HttpMethod;
    transform: ?TransformContext;
  };

  type HttpResponsePayload = {
    status: Nat;
    headers: [HttpHeader];
    body: Blob;
  };

  type TransformArgs = {
    response: HttpResponsePayload;
    context: Blob;
  };

  type ManagementCanisterActor = actor {
    http_request: CanisterHttpRequestArgs -> async HttpResponsePayload;
  };

  // Helper to get first N characters of text
  private func textPrefix(text: Text, maxLen: Nat) : Text {
    let chars = Iter.toArray(Text.toIter(text));
    let len = chars.size();
    let takeLen = if (len < maxLen) { len } else { maxLen };
    Text.fromIter(
      Array.tabulate<Char>(takeLen, func(i) {
        chars[i]
      }).vals()
    )
  };

  // Helper to find pattern in text
  private func findPattern(text: Text, pattern: Text, startFrom: Nat) : ?Nat {
    let textChars = Iter.toArray(Text.toIter(text));
    let patternChars = Iter.toArray(Text.toIter(pattern));
    let textLen = textChars.size();
    let patternLen = patternChars.size();

    if (patternLen == 0 or startFrom + patternLen > textLen) {
      return null;
    };

    var i = startFrom;
    while (i + patternLen <= textLen) {
      var matches = true;
      var j = 0;
      while (j < patternLen) {
        if (textChars[i + j] != patternChars[j]) {
          matches := false;
          j := patternLen; // break
        };
        j += 1;
      };
      if (matches) {
        return ?i;
      };
      i += 1;
    };
    null
  };

  // Helper to extract only the content field from OpenAI response for consensus
  // OpenAI returns: {"id":"...","choices":[{"message":{"content":"[...]"}}],...}
  // We extract just the content value to achieve consensus
  private func extractContent(body: Blob) : Blob {
    switch (Text.decodeUtf8(body)) {
      case (?responseText) {
        // DEBUG: Log raw OpenAI response BEFORE extraction
        Debug.print("RAW OpenAI Response (before extraction): " # responseText);
        Debug.print("Raw response length: " # Nat.toText(Text.size(responseText)));

        let chars = Iter.toArray(Text.toIter(responseText));
        let len = chars.size();

        // Find "content" first, then look for : and " after it (handles any spacing)
        let contentKeyPattern = "\"content\"";
        let contentKeyPos = findPattern(responseText, contentKeyPattern, 0);

        switch (contentKeyPos) {
          case null {
            Debug.print("ERROR: Could not find 'content' key in response!");
            return Text.encodeUtf8("{\"choices\":[{\"message\":{\"content\":\"\"}}]}");
          };
          case (?keyPos) {
            Debug.print("Found 'content' key at position: " # Nat.toText(keyPos));

            // Now find the opening quote of the value (skip : and any whitespace)
            var searchPos = keyPos + Text.size(contentKeyPattern);
            Debug.print("Searching for value starting from position: " # Nat.toText(searchPos));

            // Skip whitespace and colon and more whitespace
            while (searchPos < len and (chars[searchPos] == ' ' or chars[searchPos] == ':')) {
              searchPos += 1;
            };

            // Now we should be at the opening quote of the content value
            if (searchPos >= len or chars[searchPos] != '\"') {
              Debug.print("ERROR: Could not find opening quote for content value at position " # Nat.toText(searchPos));
              return Text.encodeUtf8("{\"choices\":[{\"message\":{\"content\":\"\"}}]}");
            };

            let startIdx = searchPos + 1; // Start after the opening quote
            Debug.print("Content value starts at position: " # Nat.toText(startIdx));
            Debug.print("Content start index: " # Nat.toText(startIdx));
            Debug.print("Total response length: " # Nat.toText(len));
            var endIdx = startIdx;
            var escapeNext = false;
            var iterations = 0;

            while (endIdx < len) {
              iterations += 1;
              let currentChar = chars[endIdx];

              if (escapeNext) {
                escapeNext := false;
              } else if (currentChar == '\\') {
                escapeNext := true;
              } else if (currentChar == '\"') {
                // Found closing quote
                Debug.print("Found closing quote at position: " # Nat.toText(endIdx));
                Debug.print("Iterations to find closing quote: " # Nat.toText(iterations));
                let contentLen = if (endIdx > startIdx) { endIdx - startIdx } else { 0 };
                Debug.print("Calculated content length: " # Nat.toText(contentLen));

                let content = Text.fromIter(
                  Array.tabulate<Char>(contentLen, func(i) {
                    chars[startIdx + i]
                  }).vals()
                );

                Debug.print("Extracted content from OpenAI: " # content);
                Debug.print("Content length: " # Nat.toText(Text.size(content)));

                // Return normalized JSON with only the content
                let normalized = "{\"choices\":[{\"message\":{\"content\":\"" # content # "\"}}]}";
                return Text.encodeUtf8(normalized);
              };
              endIdx += 1;
            };

            // Reached end without finding closing quote
            Text.encodeUtf8("{\"choices\":[{\"message\":{\"content\":\"\"}}]}")
          };
        };
      };
      case null {
        Text.encodeUtf8("{\"choices\":[{\"message\":{\"content\":\"\"}}]}")
      }
    }
  };

  // Transform function to normalize HTTP response for consensus (legacy OpenAI)
  public query func transform(args: TransformArgs) : async HttpResponsePayload {
    {
      status = args.response.status;
      headers = [];
      body = extractContent(args.response.body);
    }
  };

  // New transform function for gateway responses
  // Gateway already returns deterministic format, so we just strip headers
  public query func transform_gateway(args: TransformArgs) : async HttpResponsePayload {
    {
      status = args.response.status;
      headers = []; // Strip all headers for consensus
      body = args.response.body; // Keep full gateway response (already deterministic)
    }
  };

  // DEPRECATED: Legacy OpenAI API key functions - kept for backward compatibility
  // These are no longer used but maintained for stable interface compatibility
  public shared(_msg) func set_openai_api_key(key: Text) : async Bool {
    openaiApiKey := key;
    true
  };

  public query func has_openai_api_key() : async Bool {
    Text.size(openaiApiKey) > 0
  };

  // Configuration for the deterministic AI gateway
  // Set this to your deployed Cloudflare Worker URL
  private stable var gatewayUrl : Text = "https://icp-pulse-ai-gateway.eastmaels.workers.dev/generate";
  private stable var _gatewaySecret : Text = ""; // Optional: for additional verification (unused)

  // Set gateway URL (only callable by canister owner)
  public shared(_msg) func set_gateway_url(url: Text) : async Bool {
    // TODO: Add proper access control to restrict this to canister controller
    gatewayUrl := url;
    true
  };

  // Get current gateway URL
  public query func get_gateway_url() : async Text {
    gatewayUrl
  };

  // Generate poll options using deterministic AI gateway
  // seed parameter: Optional seed for caching. If null, uses timestamp for fresh results
  public func generate_poll_options(topic: Text, seed: ?Nat) : async Result.Result<[Text], Text> {
    let ic : ManagementCanisterActor = actor("aaaaa-aa");

    // Generate seed: use provided seed or timestamp for fresh results
    let requestSeed = switch (seed) {
      case (?s) { s };
      case null { Int.abs(Time.now()) }; // Fresh results every time
    };

    // System prompt for generating poll options
    let systemPrompt = "You are a helpful assistant. Return ONLY a JSON array of 4 poll option strings, nothing else. Format: [\\\"option1\\\",\\\"option2\\\",\\\"option3\\\",\\\"option4\\\"]";

    // Construct gateway request body
    let requestBody = "{\"model\":\"gpt-4o-mini\",\"prompt\":\"Generate 4 poll options for: " # topic # "\",\"seed\":" # Nat.toText(requestSeed) # ",\"temperature\":0,\"max_tokens\":150,\"system_prompt\":\"" # systemPrompt # "\"}";

    // DEBUG: Log the request we're sending to gateway
    Debug.print("=== SENDING REQUEST TO AI GATEWAY ===");
    Debug.print("Poll topic: " # topic);
    Debug.print("Seed: " # Nat.toText(requestSeed));
    Debug.print("Gateway URL: " # gatewayUrl);
    Debug.print("Request body: " # requestBody);

    let requestBodyBlob = Text.encodeUtf8(requestBody);

    let httpHeader : [HttpHeader] = [
      { name = "Content-Type"; value = "application/json" }
    ];

    let request : CanisterHttpRequestArgs = {
      url = gatewayUrl;
      max_response_bytes = ?10000;
      headers = httpHeader;
      body = ?requestBodyBlob;
      method = #post;
      transform = ?{function = transform_gateway; context = Blob.fromArray([])};
    };

    // Add cycles for the HTTPS outcall (50B cycles for HTTPS request)
    Cycles.add<system>(50_000_000_000);

    try {
      let response = await ic.http_request(request);

      Debug.print("Gateway Response Status: " # Nat.toText(response.status));
      Debug.print("Response body size: " # Nat.toText(response.body.size()));

      // DEBUG: Log the actual response.body (this is AFTER transform)
      switch (Text.decodeUtf8(response.body)) {
        case (?bodyText) {
          Debug.print("Response body (after transform): " # textPrefix(bodyText, 1000));
        };
        case null {
          Debug.print("Could not decode response.body as UTF-8");
        };
      };

      if (response.status == 200) {
        let responseText = switch (Text.decodeUtf8(response.body)) {
          case (?text) { text };
          case null {
            Debug.print("AI Generation Error: Could not decode response body as UTF-8");
            return #err("DECODE_ERROR: Could not decode response as UTF-8");
          };
        };

        Debug.print("Gateway Response: " # responseText);
        Debug.print("Response length: " # Nat.toText(Text.size(responseText)));

        // Parse the gateway response to extract the poll options
        // Gateway returns: {"content": "[\"opt1\",\"opt2\",...]", "signature": "...", ...}
        switch (parseGatewayResponse(responseText)) {
          case (#ok(options)) {
            Debug.print("Successfully parsed " # Nat.toText(options.size()) # " options from gateway");
            #ok(options)
          };
          case (#err(errMsg)) {
            Debug.print("Gateway Parse Error: " # errMsg);
            #err("PARSE_ERROR: " # errMsg)
          };
        };
      } else {
        // Log the error response
        let errorBody = switch (Text.decodeUtf8(response.body)) {
          case (?text) { text };
          case null { "(could not decode error body)" };
        };
        Debug.print("Gateway HTTP Error: Status " # Nat.toText(response.status) # ", Body: " # errorBody);
        #err("HTTP_ERROR_" # Nat.toText(response.status) # ": " # errorBody)
      }
    } catch (error) {
      Debug.print("Gateway Exception: " # Error.message(error));
      #err("NETWORK_ERROR: " # Error.message(error))
    }
  };

  // Helper function to parse normalized OpenAI response from transform
  // Transform returns: {"choices":[{"message":{"content":"[\"opt1\",\"opt2\",...]"}}]}
  private func parseOpenAIResponse(response: Text) : Result.Result<[Text], Text> {
    Debug.print("Parsing response: " # response);

    // Response format after transform: {"choices":[{"message":{"content":"CONTENT_HERE"}}]}
    // The content itself is a JSON array string like: [\"option1\",\"option2\",...]

    let contentPattern = "\"content\":\"";
    let chars = Iter.toArray(Text.toIter(response));
    let len = chars.size();

    // Find "content":" pattern
    let contentPos = findPattern(response, contentPattern, 0);

    switch (contentPos) {
      case null {
        Debug.print("Could not find content pattern");
        #err("Could not find content field in response")
      };
      case (?pos) {
        // Extract everything between "content":" and the next unescaped "
        let startIdx = pos + Text.size(contentPattern);
        var endIdx = startIdx;
        var escapeNext = false;

        // Find the closing quote of the content value
        while (endIdx < len) {
          if (escapeNext) {
            escapeNext := false;
          } else if (chars[endIdx] == '\\') {
            escapeNext := true;
          } else if (chars[endIdx] == '\"') {
            // Found the closing quote - extract content
            let contentLen = if (endIdx > startIdx) { endIdx - startIdx } else { 0 };

            if (contentLen == 0) {
              Debug.print("Content is empty");
              return #err("Content field is empty");
            };

            let content = Text.fromIter(
              Array.tabulate<Char>(contentLen, func(i) {
                chars[startIdx + i]
              }).vals()
            );

            Debug.print("Extracted content: " # content);

            // Now parse the JSON array from content
            // Content should be like: [\"option1\",\"option2\",...]
            // But the backslashes might be escaped, so it could be raw text
            return parseJSONArray(content);
          };
          endIdx += 1;
        };

        Debug.print("Did not find closing quote for content");
        #err("Malformed content field")
      };
    }
  };

  // Parse a JSON array string into Text array
  private func parseJSONArray(jsonArray: Text) : Result.Result<[Text], Text> {
    let chars = Iter.toArray(Text.toIter(jsonArray));
    let len = chars.size();

    // Find opening bracket
    var arrayStart : ?Nat = null;
    var i = 0;
    while (i < len) {
      if (chars[i] == '[') {
        arrayStart := ?i;
        i := len; // break
      };
      i += 1;
    };

    switch (arrayStart) {
      case null { #err("No opening bracket found in JSON array") };
      case (?start) {
        // Parse array elements
        var options : [Text] = [];
        var currentOption : Text = "";
        var inString = false;
        var escapeNext = false;
        var idx = start + 1;

        while (idx < len) {
          let char = chars[idx];

          if (escapeNext) {
            // Previous char was \, so this is escaped
            currentOption := currentOption # Text.fromChar(char);
            escapeNext := false;
          } else if (char == '\\') {
            escapeNext := true;
          } else if (char == '\"') {
            if (inString) {
              // End of string - save it
              if (Text.size(currentOption) > 0) {
                options := Array.append(options, [currentOption]);
              };
              currentOption := "";
              inString := false;
            } else {
              // Start of string
              inString := true;
            };
          } else if (inString) {
            currentOption := currentOption # Text.fromChar(char);
          } else if (char == ']') {
            // End of array
            idx := len; // break
          };

          idx += 1;
        };

        if (options.size() >= 2) {
          #ok(options)
        } else {
          #err("Parsed array has fewer than 2 options. Found: " # Nat.toText(options.size()))
        }
      };
    }
  };

  // Helper function to parse gateway response
  // Gateway returns: {"content": "[\"opt1\",\"opt2\",...]", "signature": "...", "model": "...", ...}
  private func parseGatewayResponse(response: Text) : Result.Result<[Text], Text> {
    Debug.print("Parsing gateway response: " # response);

    // Find the "content" field in the gateway response
    let contentPattern = "\"content\":\"";
    let contentPos = findPattern(response, contentPattern, 0);

    switch (contentPos) {
      case null {
        Debug.print("Could not find content field in gateway response");
        #err("Could not find content field in gateway response")
      };
      case (?pos) {
        // Extract the content value (which is a JSON array string)
        let chars = Iter.toArray(Text.toIter(response));
        let len = chars.size();
        let startIdx = pos + Text.size(contentPattern);
        var endIdx = startIdx;
        var escapeNext = false;

        // Find the closing quote of the content value
        while (endIdx < len) {
          if (escapeNext) {
            escapeNext := false;
          } else if (chars[endIdx] == '\\') {
            escapeNext := true;
          } else if (chars[endIdx] == '\"') {
            // Found closing quote
            let contentLen = if (endIdx > startIdx) { endIdx - startIdx } else { 0 };

            if (contentLen == 0) {
              Debug.print("Content field is empty");
              return #err("Content field is empty");
            };

            let content = Text.fromIter(
              Array.tabulate<Char>(contentLen, func(i) {
                chars[startIdx + i]
              }).vals()
            );

            Debug.print("Extracted content: " # content);

            // Unescape the content: replace \" with "
            // The gateway returns escaped quotes like: [\"opt1\",\"opt2\"]
            // We need to convert to: ["opt1","opt2"]
            let unescapedContent = Text.replace(content, #text("\\\""), "\"");
            Debug.print("Unescaped content: " # unescapedContent);

            // Now parse the content as a JSON array: ["opt1","opt2",...]
            return parseJsonArray(unescapedContent);
          };
          endIdx += 1;
        };

        #err("Could not find closing quote for content field")
      };
    }
  };

  // Helper to parse a JSON array string: ["opt1","opt2","opt3","opt4"]
  private func parseJsonArray(arrayStr: Text) : Result.Result<[Text], Text> {
    let chars = Iter.toArray(Text.toIter(arrayStr));
    let len = chars.size();

    // Find opening bracket
    var arrayStart : ?Nat = null;
    var i = 0;
    while (i < len and arrayStart == null) {
      if (chars[i] == '[') {
        arrayStart := ?i;
      };
      i += 1;
    };

    switch (arrayStart) {
      case null { #err("No opening bracket found in JSON array") };
      case (?start) {
        // Parse array elements
        var options : [Text] = [];
        var currentOption : Text = "";
        var inString = false;
        var escapeNext = false;
        var idx = start + 1;

        while (idx < len) {
          let char = chars[idx];

          if (escapeNext) {
            currentOption := currentOption # Text.fromChar(char);
            escapeNext := false;
          } else if (char == '\\') {
            escapeNext := true;
          } else if (char == '\"') {
            if (inString) {
              // End of string
              if (Text.size(currentOption) > 0) {
                options := Array.append(options, [currentOption]);
              };
              currentOption := "";
              inString := false;
            } else {
              // Start of string
              inString := true;
            };
          } else if (inString) {
            currentOption := currentOption # Text.fromChar(char);
          } else if (char == ']') {
            // End of array
            idx := len; // break
          };

          idx += 1;
        };

        if (options.size() >= 2) {
          Debug.print("Parsed " # Nat.toText(options.size()) # " options from gateway content");
          #ok(options)
        } else {
          #err("Parsed array has fewer than 2 options. Found: " # Nat.toText(options.size()))
        }
      };
    }
  };

  // ======================================================================
  // AI-POWERED POLL ANALYSIS FUNCTIONS
  // ======================================================================

  // Type for poll analysis input
  public type PollDataForAnalysis = {
    id: Text;
    title: Text;
    description: Text;
    options: [{
      text: Text;
      votes: Nat;
    }];
    totalVotes: Nat;
  };

  // Analyze multiple polls and provide insights
  public func analyze_polls(polls: [PollDataForAnalysis], projectName: Text) : async Result.Result<Text, Text> {
    if (polls.size() == 0) {
      return #err("No polls provided for analysis");
    };

    if (polls.size() > 20) {
      return #err("Maximum 20 polls can be analyzed at once");
    };

    let ic : ManagementCanisterActor = actor("aaaaa-aa");

    // Generate seed for determinism
    let requestSeed = Int.abs(Time.now());

    // Build poll summary for analysis
    var pollsSummary = "";
    var pollIndex = 0;

    for (poll in polls.vals()) {
      pollIndex += 1;

      // Find winning option
      var winningOption = "";
      var maxVotes : Nat = 0;
      for (option in poll.options.vals()) {
        if (option.votes > maxVotes) {
          maxVotes := option.votes;
          winningOption := option.text;
        };
      };

      // Build options summary
      var optionsSummary = "";
      for (option in poll.options.vals()) {
        let percentage = if (poll.totalVotes > 0) {
          (option.votes * 100) / poll.totalVotes
        } else { 0 };
        optionsSummary := optionsSummary # "  - " # option.text # ": " # Nat.toText(option.votes) # " votes (" # Nat.toText(percentage) # "%)\n";
      };

      pollsSummary := pollsSummary # "Poll " # Nat.toText(pollIndex) # ": \"" # poll.title # "\"\n";
      pollsSummary := pollsSummary # "Description: " # poll.description # "\n";
      pollsSummary := pollsSummary # "Total Votes: " # Nat.toText(poll.totalVotes) # "\n";
      pollsSummary := pollsSummary # "Options and Results:\n" # optionsSummary;
      pollsSummary := pollsSummary # "Leading Option: " # winningOption # " with " # Nat.toText(maxVotes) # " votes\n\n---\n\n";
    };

    // System prompt for structured JSON analysis
    let systemPrompt = "You are an expert data analyst specializing in survey and poll analysis. Analyze the provided polls and return ONLY a valid JSON object with this exact structure: {\"overview\":\"2-3 sentence summary\",\"keyFindings\":[\"finding1\",\"finding2\",\"finding3\",\"finding4\",\"finding5\"],\"sentimentAnalysis\":\"overall sentiment\",\"trends\":[\"trend1\",\"trend2\",\"trend3\"],\"recommendations\":[\"rec1\",\"rec2\",\"rec3\",\"rec4\"],\"pollBreakdowns\":[{\"pollTitle\":\"title\",\"winningOption\":\"option\",\"insights\":\"2-3 sentences\"}]}";

    // Construct user prompt
    let userPrompt = "Analyze the following " # Nat.toText(polls.size()) # " poll(s) from the project \"" # projectName # "\".\n\n" # pollsSummary # "\n\nProvide comprehensive analysis focusing on:\n1. What the voting patterns reveal about user preferences\n2. Any surprising or notable results\n3. Engagement levels and participation\n4. Actionable recommendations based on the data\n5. Trends or patterns across multiple polls\n\nReturn ONLY valid JSON, no additional text.";

    // Construct gateway request body
    let requestBody = "{\"model\":\"gpt-4o-mini\",\"prompt\":\"" # escapeJsonString(userPrompt) # "\",\"seed\":" # Nat.toText(requestSeed) # ",\"temperature\":0.7,\"max_tokens\":2000,\"system_prompt\":\"" # escapeJsonString(systemPrompt) # "\"}";

    Debug.print("=== SENDING POLL ANALYSIS REQUEST TO AI GATEWAY ===");
    Debug.print("Project: " # projectName);
    Debug.print("Number of polls: " # Nat.toText(polls.size()));
    Debug.print("Seed: " # Nat.toText(requestSeed));

    let requestBodyBlob = Text.encodeUtf8(requestBody);

    let httpHeader : [HttpHeader] = [
      { name = "Content-Type"; value = "application/json" }
    ];

    let request : CanisterHttpRequestArgs = {
      url = gatewayUrl;
      max_response_bytes = ?20000;
      headers = httpHeader;
      body = ?requestBodyBlob;
      method = #post;
      transform = ?{function = transform_gateway; context = Blob.fromArray([])};
    };

    Cycles.add<system>(50_000_000_000);

    try {
      let response = await ic.http_request(request);

      Debug.print("Gateway Response Status: " # Nat.toText(response.status));

      if (response.status == 200) {
        let responseText = switch (Text.decodeUtf8(response.body)) {
          case (?text) { text };
          case null { return #err("Could not decode response as UTF-8") };
        };

        Debug.print("Analysis response received");

        // Extract content from gateway response
        switch (parseGatewayContent(responseText)) {
          case (#ok(content)) {
            Debug.print("Successfully parsed analysis");
            #ok(content)
          };
          case (#err(errMsg)) {
            Debug.print("Parse Error: " # errMsg);
            #err("PARSE_ERROR: " # errMsg)
          };
        };
      } else {
        let errorBody = switch (Text.decodeUtf8(response.body)) {
          case (?text) { text };
          case null { "(could not decode error body)" };
        };
        Debug.print("Gateway HTTP Error: Status " # Nat.toText(response.status));
        #err("HTTP_ERROR_" # Nat.toText(response.status) # ": " # errorBody)
      }
    } catch (error) {
      Debug.print("Gateway Exception: " # Error.message(error));
      #err("NETWORK_ERROR: " # Error.message(error))
    }
  };

  // Chat with AI assistant (can create polls, answer questions, etc.)
  public func chat_message(userMessage: Text, conversationHistory: [(Text, Text)]) : async Result.Result<Text, Text> {
    if (Text.size(userMessage) < 1) {
      return #err("Message cannot be empty");
    };

    let ic : ManagementCanisterActor = actor("aaaaa-aa");

    // Generate seed for determinism
    let requestSeed = Int.abs(Time.now());

    // Build conversation context
    var conversationContext = "";
    for ((role, message) in conversationHistory.vals()) {
      conversationContext := conversationContext # role # ": " # message # "\n";
    };

    // System prompt for chat assistant
    let systemPrompt = "You are a helpful assistant for True Pulse, a platform for context-aware polls and surveys on the Internet Computer. You can help with:\n- Creating polls: Explain how to create polls\n- Managing surveys: Help with survey creation\n- Platform guidance: Explain features\n\nBe concise and helpful. When users ask about creating polls, guide them to use the poll creation form.";

    // Construct user prompt with context
    let fullPrompt = if (conversationContext != "") {
      "Conversation history:\n" # conversationContext # "\n\nUser: " # userMessage
    } else {
      userMessage
    };

    // Construct gateway request body
    let requestBody = "{\"model\":\"gpt-4o-mini\",\"prompt\":\"" # escapeJsonString(fullPrompt) # "\",\"seed\":" # Nat.toText(requestSeed) # ",\"temperature\":0.7,\"max_tokens\":500,\"system_prompt\":\"" # escapeJsonString(systemPrompt) # "\"}";

    Debug.print("=== SENDING CHAT MESSAGE TO AI GATEWAY ===");
    Debug.print("User message: " # userMessage);
    Debug.print("Seed: " # Nat.toText(requestSeed));

    let requestBodyBlob = Text.encodeUtf8(requestBody);

    let httpHeader : [HttpHeader] = [
      { name = "Content-Type"; value = "application/json" }
    ];

    let request : CanisterHttpRequestArgs = {
      url = gatewayUrl;
      max_response_bytes = ?10000;
      headers = httpHeader;
      body = ?requestBodyBlob;
      method = #post;
      transform = ?{function = transform_gateway; context = Blob.fromArray([])};
    };

    Cycles.add<system>(50_000_000_000);

    try {
      let response = await ic.http_request(request);

      Debug.print("Gateway Response Status: " # Nat.toText(response.status));

      if (response.status == 200) {
        let responseText = switch (Text.decodeUtf8(response.body)) {
          case (?text) { text };
          case null { return #err("Could not decode response as UTF-8") };
        };

        Debug.print("Chat response received");

        // Extract content from gateway response
        switch (parseGatewayContent(responseText)) {
          case (#ok(content)) {
            Debug.print("Successfully parsed chat response");
            #ok(content)
          };
          case (#err(errMsg)) {
            Debug.print("Parse Error: " # errMsg);
            #err("PARSE_ERROR: " # errMsg)
          };
        };
      } else {
        let errorBody = switch (Text.decodeUtf8(response.body)) {
          case (?text) { text };
          case null { "(could not decode error body)" };
        };
        Debug.print("Gateway HTTP Error: Status " # Nat.toText(response.status));
        #err("HTTP_ERROR_" # Nat.toText(response.status) # ": " # errorBody)
      }
    } catch (error) {
      Debug.print("Gateway Exception: " # Error.message(error));
      #err("NETWORK_ERROR: " # Error.message(error))
    }
  };

  // Helper function to extract content from gateway response
  // Gateway returns: {"content": "...", "signature": "...", ...}
  private func parseGatewayContent(response: Text) : Result.Result<Text, Text> {
    let contentPattern = "\"content\":\"";
    let contentPos = findPattern(response, contentPattern, 0);

    switch (contentPos) {
      case null {
        #err("Could not find content field in gateway response")
      };
      case (?pos) {
        let chars = Iter.toArray(Text.toIter(response));
        let len = chars.size();
        let startIdx = pos + Text.size(contentPattern);
        var endIdx = startIdx;
        var escapeNext = false;

        // Find the closing quote of the content value
        while (endIdx < len) {
          if (escapeNext) {
            escapeNext := false;
          } else if (chars[endIdx] == '\\') {
            escapeNext := true;
          } else if (chars[endIdx] == '\"') {
            // Found closing quote
            let contentLen = if (endIdx > startIdx) { endIdx - startIdx } else { 0 };

            if (contentLen == 0) {
              return #err("Content field is empty");
            };

            let content = Text.fromIter(
              Array.tabulate<Char>(contentLen, func(i) {
                chars[startIdx + i]
              }).vals()
            );

            // Unescape the content
            let unescapedContent = Text.replace(content, #text("\\\""), "\"");
            let unescapedContent2 = Text.replace(unescapedContent, #text("\\n"), "\n");
            let unescapedContent3 = Text.replace(unescapedContent2, #text("\\t"), "\t");

            return #ok(unescapedContent3);
          };
          endIdx += 1;
        };

        #err("Malformed content field - no closing quote")
      };
    }
  };

  // Helper function to escape JSON strings
  private func escapeJsonString(str: Text) : Text {
    var escaped = Text.replace(str, #text("\\"), "\\\\");
    escaped := Text.replace(escaped, #text("\""), "\\\"");
    escaped := Text.replace(escaped, #text("\n"), "\\n");
    escaped := Text.replace(escaped, #text("\t"), "\\t");
    escaped
  };

  // Treasury management types and functions
  type TreasuryFee = {
    tokenCanister: Principal;
    tokenSymbol: Text;
    tokenDecimals: Nat8;
    totalFeesCollected: Nat64;
  };

  // Get all collected platform fees by token
  public query func get_treasury_fees() : async [TreasuryFee] {
    var fees : [TreasuryFee] = [];

    // Iterate through all collected fees
    for ((canister, amount) in Map.entries(treasuryFees)) {
      // Get token symbol and decimals from cache
      let (symbol, decimals) = switch (Map.get(tokenInfo, phash, canister)) {
        case (?info) { info };
        case null { ("UNKNOWN", 8 : Nat8) }; // Fallback if token info not in cache
      };

      fees := Array.append(fees, [{
        tokenCanister = canister;
        tokenSymbol = symbol;
        tokenDecimals = decimals;
        totalFeesCollected = amount;
      }]);
    };

    // Add ICP fees if any
    if (treasuryFeesICP > 0) {
      fees := Array.append(fees, [{
        tokenCanister = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"); // ICP ledger canister
        tokenSymbol = "ICP";
        tokenDecimals = 8 : Nat8;
        totalFeesCollected = treasuryFeesICP;
      }]);
    };

    fees
  };

  // Get platform fee percentage
  public query func get_platform_fee_percentage() : async Nat {
    PLATFORM_FEE_PERCENTAGE
  };

  // Get total fees collected for a specific token
  public query func get_token_treasury_fees(tokenCanister: Principal) : async ?TreasuryFee {
    switch (Map.get(treasuryFees, phash, tokenCanister)) {
      case (?amount) {
        let (symbol, decimals) = switch (Map.get(tokenInfo, phash, tokenCanister)) {
          case (?info) { info };
          case null { ("UNKNOWN", 8 : Nat8) };
        };

        ?{
          tokenCanister = tokenCanister;
          tokenSymbol = symbol;
          tokenDecimals = decimals;
          totalFeesCollected = amount;
        }
      };
      case null { null }
    }
  };
}
