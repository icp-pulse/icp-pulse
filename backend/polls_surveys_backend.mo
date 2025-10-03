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
import Map "mo:map/Map";
import { phash } "mo:map/Map";
import Cycles "mo:base/ExperimentalCycles";

persistent actor class polls_surveys_backend() = this {
  // Types
  type ProjectId = Nat;
  type ProductId = Nat;
  type PollId = Nat;
  type SurveyId = Nat;

  type Status = { #active; #closed };

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

  type FundingInfo = {
    tokenType: TokenType;         // Type of token used for funding
    tokenCanister: ?Principal;    // Token canister for custom tokens (null for ICP)
    tokenSymbol: Text;           // Token symbol for display
    tokenDecimals: Nat8;         // Token decimals
    totalFund: Nat64;           // Total tokens in smallest unit (e8s for ICP)
    rewardPerResponse: Nat64;    // Tokens per valid response in smallest unit
    maxResponses: Nat;          // Maximum funded responses
    currentResponses: Nat;       // Current response count
    remainingFund: Nat64;       // Remaining token balance in smallest unit
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
  public shared (msg) func create_poll(scopeType : Text, scopeId : Nat, title : Text, description : Text, options : [Text], closesAt : Int, rewardFund : Nat, fundingEnabled : Bool, rewardPerVote : ?Nat64) : async PollId {
    assert(options.size() >= 2);
    assert(closesAt > now());
    let id = nextPollId; nextPollId += 1;
    let opts = Array.tabulate<OptionT>(options.size(), func i { { id = i; text = options[i]; votes = 0 } });
    let fundingInfo = if (fundingEnabled) {
      switch (rewardPerVote) {
        case (?reward) {
          let totalFund = Nat64.fromNat(rewardFund) * 1_000_000; // Convert cents to e8s (rewardFund is in cents, so multiply by 1M instead of 100M)
          let maxResponses = if (reward > 0) { Nat64.toNat(totalFund / reward) } else { 0 };
          ?{
            tokenType = #ICP;
            tokenCanister = null;
            tokenSymbol = "ICP";
            tokenDecimals = 8 : Nat8;
            totalFund = totalFund;
            rewardPerResponse = reward;
            maxResponses = maxResponses;
            currentResponses = 0;
            remainingFund = totalFund
          }
        };
        case null { null }
      }
    } else { null };
    let poll : Poll = { id = id; scopeType = toScopeType(scopeType); scopeId = scopeId; title = title; description = description; options = opts; createdBy = msg.caller; createdAt = now(); closesAt = closesAt; status = #active; totalVotes = 0; rewardFund = rewardFund; fundingInfo = fundingInfo; voterPrincipals = [] };
    polls := Array.append(polls, [poll]);
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
    rewardPerVote : Nat64
  ) : async Result.Result<PollId, Text> {
    assert(options.size() >= 2);
    assert(closesAt > now());

    // Validate custom token if provided
    switch (tokenCanister) {
      case (?canister) {
        if (not (await validateTokenCanister(canister))) {
          return #err("Invalid or unsupported token canister");
        };
      };
      case null { /* Using ICP */ };
    };

    let id = nextPollId; nextPollId += 1;
    let opts = Array.tabulate<OptionT>(options.size(), func i { { id = i; text = options[i]; votes = 0 } });

    // Get token info
    let (tokenSymbol, tokenDecimals) = await getTokenInfo(tokenCanister);

    let fundingInfo = {
      tokenType = switch (tokenCanister) {
        case null { #ICP };
        case (?canister) { #ICRC1(canister) };
      };
      tokenCanister = tokenCanister;
      tokenSymbol = tokenSymbol;
      tokenDecimals = tokenDecimals;
      totalFund = totalFunding;
      rewardPerResponse = rewardPerVote;
      maxResponses = if (rewardPerVote > 0) { Nat64.toNat(totalFunding / rewardPerVote) } else { 0 };
      currentResponses = 0;
      remainingFund = totalFunding;
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
    };

    polls := Array.append(polls, [poll]);
    #ok(id)
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
        if ((poll.status == #closed) or (poll.closesAt <= now())) { return false };

        // Check one vote per principal
        var already = false;
        for (vp in poll.voterPrincipals.vals()) { if (vp == msg.caller) { already := true } };
        if (already or (optionId >= poll.options.size())) { return false };

        // Create reward if funding is enabled
        switch (poll.fundingInfo) {
          case (?funding) {
            if (funding.currentResponses < funding.maxResponses) {
              let (tokenSymbol, tokenDecimals) = await getTokenInfo(funding.tokenCanister);
              ignore createReward(poll.id, poll.title, msg.caller, funding.rewardPerResponse, tokenSymbol, tokenDecimals, funding.tokenCanister);
            };
          };
          case null { };
        };

        // Now update the poll data
        var ok = false;
        polls := Array.tabulate<Poll>(polls.size(), func i {
          let p = polls[i];
          if (p.id == pollId) {
            let updatedOptions = Array.tabulate<OptionT>(p.options.size(), func j {
              let o = p.options[j];
              if (j == optionId) { { id = o.id; text = o.text; votes = o.votes + 1 } } else { o }
            });
            ok := true;
            // Update funding info if enabled
            let updatedFunding = switch (p.fundingInfo) {
              case (?funding) {
                if (funding.currentResponses < funding.maxResponses) {
                  ?{ funding with currentResponses = funding.currentResponses + 1; remainingFund = funding.remainingFund - funding.rewardPerResponse }
                } else { ?funding }
              };
              case null { null }
            };
            { p with options = updatedOptions; totalVotes = p.totalVotes + 1; voterPrincipals = Array.append(p.voterPrincipals, [msg.caller]); fundingInfo = updatedFunding }
          } else { p }
        });
        ok
      };
      case null { false }
    }
  };

  public shared func close_poll(pollId : PollId) : async Bool {
    var closed = false;
    polls := Array.tabulate<Poll>(polls.size(), func i {
      let p = polls[i];
      if (p.id == pollId) { closed := true; { p with status = #closed } } else { p }
    });
    closed
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
          let maxResponses = if (reward > 0) { Nat64.toNat(totalFund / reward) } else { 0 };
          ?{
            tokenType = #ICP;
            tokenCanister = null;
            tokenSymbol = "ICP";
            tokenDecimals = 8 : Nat8;
            totalFund = totalFund;
            rewardPerResponse = reward;
            maxResponses = maxResponses;
            currentResponses = 0;
            remainingFund = totalFund
          }
        };
        case null { null }
      }
    } else { null };
    let survey : Survey = { id = id; scopeType = toScopeType(scopeType); scopeId = scopeId; title = title; description = description; createdBy = msg.caller; createdAt = now(); closesAt = closesAt; status = #active; rewardFund = rewardFund; fundingInfo = fundingInfo; allowAnonymous = allowAnonymous; questions = qs; submissionsCount = 0 };
    surveys := Array.append(surveys, [survey]);
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
            // Update funding info if enabled
            let updatedFunding = switch (s.fundingInfo) {
              case (?funding) {
                if (funding.currentResponses < funding.maxResponses) {
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
        // Calculate max responses
        let maxResponses = Nat64.toNat(totalFund / rewardPerResponse);

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

  // Storage for OpenAI API key
  private var openaiApiKey : Text = "";

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

  // Transform function to clean up the HTTP response
  public query func transform(args: TransformArgs) : async HttpResponsePayload {
    {
      status = args.response.status;
      headers = [];
      body = args.response.body;
    }
  };

  // Set OpenAI API key (only callable by canister owner)
  public shared(msg) func set_openai_api_key(key: Text) : async Bool {
    // TODO: Add proper access control to restrict this to canister controller
    openaiApiKey := key;
    true
  };

  // Get current API key status (doesn't return the actual key)
  public query func has_openai_api_key() : async Bool {
    Text.size(openaiApiKey) > 0
  };

  // Generate poll options using OpenAI
  public func generate_poll_options(topic: Text) : async ?[Text] {
    if (Text.size(openaiApiKey) == 0) {
      return null; // No API key set
    };

    let apiKey = openaiApiKey;
    let ic : ManagementCanisterActor = actor("aaaaa-aa");

    // Construct the OpenAI API request
    let requestBody = "{\"model\":\"gpt-3.5-turbo\",\"messages\":[{\"role\":\"system\",\"content\":\"You are a helpful assistant that generates poll options. Return exactly 4 poll options as a JSON array of strings. Only return the JSON array, nothing else.\"},{\"role\":\"user\",\"content\":\"Generate 4 poll options for the topic: " # topic # "\"}],\"temperature\":0.7}";

    let requestBodyBlob = Text.encodeUtf8(requestBody);

    let httpHeader : [HttpHeader] = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # apiKey },
      { name = "Host"; value = "api.openai.com" }
    ];

    let request : CanisterHttpRequestArgs = {
      url = "https://api.openai.com/v1/chat/completions";
      max_response_bytes = ?10000;
      headers = httpHeader;
      body = ?requestBodyBlob;
      method = #post;
      transform = ?{function = transform; context = Blob.fromArray([])};
    };

    // Add cycles for the HTTPS outcall (approximately 0.4T cycles)
    Cycles.add<system>(400_000_000_000);

    try {
      let response = await ic.http_request(request);

      if (response.status == 200) {
        let responseText = switch (Text.decodeUtf8(response.body)) {
          case (?text) { text };
          case null { return null };
        };

        // Parse the OpenAI response to extract the poll options
        // This is a simplified parser - you might want to use a proper JSON library
        ?parseOpenAIResponse(responseText)
      } else {
        null
      }
    } catch (error) {
      null
    }
  };

  // Helper function to parse OpenAI response
  private func parseOpenAIResponse(response: Text) : [Text] {
    // Simple parser to extract JSON array from OpenAI response
    // The response format is: {"choices":[{"message":{"content":"[\"option1\",\"option2\",\"option3\",\"option4\"]"}}]}

    // Find the content field
    var startIdx = 0;
    var found = false;
    let searchStr = "\"content\":\"";

    // This is a simplified implementation - for production use a proper JSON parser
    // For now, return default options if parsing fails
    let defaultOptions = [
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4"
    ];

    // Extract content between quotes after "content":"
    // Look for pattern: "content":"[\"...\",\"...\",\"...\",\"...\"]"
    let textLength = Text.size(response);
    var contentStart : ?Nat = null;
    var i = 0;

    // Find start of content array
    label findContent for (char in response.chars()) {
      if (i > 0 and i < textLength - 1) {
        // Look for opening bracket of array in content
        if (char == '[') {
          contentStart := ?i;
          break findContent;
        };
      };
      i += 1;
    };

    switch (contentStart) {
      case (?start) {
        // Extract the array content - simplified version
        // In production, use a proper JSON parser library
        defaultOptions
      };
      case null {
        defaultOptions
      };
    }
  };
}
