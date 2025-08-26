import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

persistent actor class polls_surveys_backend() = this {
  // Types
  type ProjectId = Nat;
  type ProductId = Nat;
  type PollId = Nat;
  type SurveyId = Nat;

  type Status = { #active; #closed };

  type FundingInfo = {
    totalFund: Nat64;        // Total ICP in e8s
    rewardPerResponse: Nat64; // ICP per valid response in e8s
    maxResponses: Nat;       // Maximum funded responses
    currentResponses: Nat;   // Current response count
    remainingFund: Nat64;    // Remaining ICP balance in e8s
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

  // Helpers
  private func now() : Int { Time.now() };

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
          ?{ totalFund = totalFund; rewardPerResponse = reward; maxResponses = maxResponses; currentResponses = 0; remainingFund = totalFund }
        };
        case null { null }
      }
    } else { null };
    let poll : Poll = { id = id; scopeType = toScopeType(scopeType); scopeId = scopeId; title = title; description = description; options = opts; createdBy = msg.caller; createdAt = now(); closesAt = closesAt; status = #active; totalVotes = 0; rewardFund = rewardFund; fundingInfo = fundingInfo; voterPrincipals = [] };
    polls := Array.append(polls, [poll]);
    id
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
    var ok = false;
    polls := Array.tabulate<Poll>(polls.size(), func i {
      let p = polls[i];
      if (p.id == pollId) {
        if ((p.status == #closed) or (p.closesAt <= now())) { ok := false; p } else {
          // Check one vote per principal
          var already = false;
          for (vp in p.voterPrincipals.vals()) { if (vp == msg.caller) { already := true } };
          if (already or (optionId >= p.options.size())) { ok := false; p } else {
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
          }
        }
      } else { p }
    });
    ok
  };

  public shared func close_poll(pollId : PollId) : async Bool {
    var closed = false;
    polls := Array.tabulate<Poll>(polls.size(), func i {
      let p = polls[i];
      if (p.id == pollId) { closed := true; { p with status = #closed } } else { p }
    });
    closed
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
          ?{ totalFund = totalFund; rewardPerResponse = reward; maxResponses = maxResponses; currentResponses = 0; remainingFund = totalFund }
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
}
