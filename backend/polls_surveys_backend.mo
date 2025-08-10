import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

public type ProjectId = Nat;
public type ProductId = Nat;
public type PollId = Nat;
public type SurveyId = Nat;

public type Status = { #active; #closed };
public type ScopeType = { #project; #product };

public type Project = {
  id : ProjectId;
  slug : Text;
  name : Text;
  description : Text;
  createdBy : Principal;
  createdAt : Int;
  status : Text;
};

public type ProjectSummary = {
  id : ProjectId;
  slug : Text;
  name : Text;
  status : Text;
};

public type Product = {
  id : ProductId;
  projectId : ProjectId;
  slug : Text;
  name : Text;
  description : Text;
  createdBy : Principal;
  createdAt : Int;
  status : Text;
};

public type ProductSummary = {
  id : ProductId;
  projectId : ProjectId;
  slug : Text;
  name : Text;
  status : Text;
};

public type OptionT = { id : Nat; text : Text; votes : Nat };

public type Poll = {
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
  rewardFund : Nat;
  voterPrincipals : [Principal];
};

public type PollSummary = {
  id : PollId;
  scopeType : ScopeType;
  scopeId : Nat;
  title : Text;
  status : Status;
  totalVotes : Nat;
};

public type QuestionType = { #single; #multi; #likert; #short; #long; #number; #rating };

public type Question = {
  id : Nat;
  type_ : QuestionType;
  text : Text;
  required : Bool;
  choices : ?[Text];
  min : ?Nat;
  max : ?Nat;
  helpText : ?Text;
};

public type Survey = {
  id : SurveyId;
  scopeType : ScopeType;
  scopeId : Nat;
  title : Text;
  description : Text;
  createdBy : Principal;
  createdAt : Int;
  closesAt : Int;
  status : Status;
  rewardFund : Nat;
  allowAnonymous : Bool;
  questions : [Question];
  submissionsCount : Nat;
};

public type SurveySummary = {
  id : SurveyId;
  scopeType : ScopeType;
  scopeId : Nat;
  title : Text;
  status : Status;
  submissionsCount : Nat;
};

public type AnswerValue = { #nat : Nat; #nats : [Nat]; #text : Text };

public type Answer = { questionId : Nat; value : AnswerValue };

public type Submission = {
  id : Nat;
  surveyId : SurveyId;
  respondent : ?Principal;
  submittedAt : Int;
  answers : [Answer];
};

public type QuestionInput = {
  type_ : Text;
  text : Text;
  required : Bool;
  choices : ?[Text];
  min : ?Nat;
  max : ?Nat;
  helpText : ?Text;
};

public type AnswerInput = {
  questionId : Nat;
  nat : ?Nat;
  nats : ?[Nat];
  text : ?Text;
};

actor class polls_surveys_backend() = this {
  // Stable counters
  stable var nextProjectId : Nat = 1;
  stable var nextProductId : Nat = 1;
  stable var nextPollId : Nat = 1;
  stable var nextSurveyId : Nat = 1;
  stable var nextSubmissionId : Nat = 1;

  // Stable persisted snapshots
  stable var projectsSnap : [(Nat, Project)] = [];
  stable var productsSnap : [(Nat, Product)] = [];
  stable var pollsSnap : [(Nat, Poll)] = [];
  stable var surveysSnap : [(Nat, Survey)] = [];
  stable var submissionsSnap : [(Nat, Submission)] = [];

  // In-memory maps
  var projectMap = HashMap.HashMap<Nat, Project>(0, Nat.equal, Nat.hash);
  var productMap = HashMap.HashMap<Nat, Product>(0, Nat.equal, Nat.hash);
  var pollMap = HashMap.HashMap<Nat, Poll>(0, Nat.equal, Nat.hash);
  var surveyMap = HashMap.HashMap<Nat, Survey>(0, Nat.equal, Nat.hash);
  var submissionMap = HashMap.HashMap<Nat, Submission>(0, Nat.equal, Nat.hash);

  system func preupgrade() {
    projectsSnap := Iter.toArray(projectMap.entries());
    productsSnap := Iter.toArray(productMap.entries());
    pollsSnap := Iter.toArray(pollMap.entries());
    surveysSnap := Iter.toArray(surveyMap.entries());
    submissionsSnap := Iter.toArray(submissionMap.entries());
  };

  system func postupgrade() {
    projectMap := HashMap.fromIter<Nat, Project>(projectsSnap.vals(), 0, Nat.equal, Nat.hash);
    productMap := HashMap.fromIter<Nat, Product>(productsSnap.vals(), 0, Nat.equal, Nat.hash);
    pollMap := HashMap.fromIter<Nat, Poll>(pollsSnap.vals(), 0, Nat.equal, Nat.hash);
    surveyMap := HashMap.fromIter<Nat, Survey>(surveysSnap.vals(), 0, Nat.equal, Nat.hash);
    submissionMap := HashMap.fromIter<Nat, Submission>(submissionsSnap.vals(), 0, Nat.equal, Nat.hash);
  };

  // Helpers
  private func now() : Int { Time.now() };

  private func toScopeType(txt : Text) : ScopeType {
    if (Text.equal(txt, "project")) { #project } else { #product };
  };

  private func toQuestionType(txt : Text) : QuestionType {
    if (Text.equal(txt, "single")) return #single;
    if (Text.equal(txt, "multi")) return #multi;
    if (Text.equal(txt, "likert")) return #likert;
    if (Text.equal(txt, "short")) return #short;
    if (Text.equal(txt, "long")) return #long;
    if (Text.equal(txt, "number")) return #number;
    return #rating;
  };

  private func principalIn(arr : [Principal], who : Principal) : Bool {
    for (p in arr.vals()) if (Principal.equal(p, who)) return true;
    false
  };

  // Projects
  public shared (msg) func create_project(name : Text, description : Text) : async ProjectId {
    let id = nextProjectId; nextProjectId += 1;
    let proj : Project = {
      id = id;
      slug = Text.map(name, func c = if (c == ' ') { '-' } else { c });
      name = name;
      description = description;
      createdBy = msg.caller;
      createdAt = now();
      status = "active";
    };
    projectMap.put(id, proj);
    id
  };

  public query func list_projects(offset : Nat, limit : Nat) : async [ProjectSummary] {
    let all = Iter.toArray(projectMap.vals());
    let start = if (offset > all.size()) all.size() else offset;
    let end = let e = start + limit; if (e > all.size()) all.size() else e;
    Array.tabulate<ProjectSummary>(end - start, func i {
      let p = all[start + i];
      { id = p.id; slug = p.slug; name = p.name; status = p.status }
    })
  };

  public query func get_project(id : ProjectId) : async ?Project { projectMap.get(id) };

  public shared func update_project(id : ProjectId, name : Text, description : Text, status : Text) : async Bool {
    switch (projectMap.get(id)) {
      case (?p) {
        let updated = { p with name = name; description = description; status = status; slug = Text.map(name, func c = if (c == ' ') { '-' } else { c }) };
        projectMap.put(id, updated);
        true
      };
      case null false
    }
  };

  // Products
  public shared (msg) func create_product(projectId : ProjectId, name : Text, description : Text) : async ProductId {
    let id = nextProductId; nextProductId += 1;
    let prod : Product = { id = id; projectId = projectId; slug = Text.map(name, func c = if (c == ' ') { '-' } else { c }); name = name; description = description; createdBy = msg.caller; createdAt = now(); status = "active" };
    productMap.put(id, prod);
    id
  };

  public query func list_products(projectId : ProjectId, offset : Nat, limit : Nat) : async [ProductSummary] {
    let filtered = Array.filter<Product>(Iter.toArray(productMap.vals()), func x = x.projectId == projectId);
    let start = if (offset > filtered.size()) filtered.size() else offset;
    let end = let e = start + limit; if (e > filtered.size()) filtered.size() else e;
    Array.tabulate<ProductSummary>(end - start, func i {
      let p = filtered[start + i];
      { id = p.id; projectId = p.projectId; slug = p.slug; name = p.name; status = p.status }
    })
  };

  public query func get_product(id : ProductId) : async ?Product { productMap.get(id) };

  public shared func update_product(id : ProductId, name : Text, description : Text, status : Text) : async Bool {
    switch (productMap.get(id)) {
      case (?p) {
        let updated = { p with name = name; description = description; status = status; slug = Text.map(name, func c = if (c == ' ') { '-' } else { c }) };
        productMap.put(id, updated);
        true
      };
      case null false
    }
  };

  // Polls
  public shared (msg) func create_poll(scopeType : Text, scopeId : Nat, title : Text, description : Text, options : [Text], closesAt : Int, rewardFund : Nat) : async PollId {
    assert(options.size() >= 2);
    assert(closesAt > now());
    let id = nextPollId; nextPollId += 1;
    let opts = Array.tabulate<OptionT>(options.size(), func i { { id = Nat.fromIntWrap(i); text = options[i]; votes = 0 } });
    let poll : Poll = { id = id; scopeType = toScopeType(scopeType); scopeId = scopeId; title = title; description = description; options = opts; createdBy = msg.caller; createdAt = now(); closesAt = closesAt; status = #active; totalVotes = 0; rewardFund = rewardFund; voterPrincipals = [] };
    pollMap.put(id, poll);
    id
  };

  public query func list_polls_by_project(projectId : ProjectId, offset : Nat, limit : Nat) : async [PollSummary] {
    let filtered = Array.filter<Poll>(Iter.toArray(pollMap.vals()), func p = p.scopeType == #project and p.scopeId == projectId);
    let start = if (offset > filtered.size()) filtered.size() else offset;
    let end = let e = start + limit; if (e > filtered.size()) filtered.size() else e;
    Array.tabulate<PollSummary>(end - start, func i {
      let p = filtered[start + i];
      { id = p.id; scopeType = p.scopeType; scopeId = p.scopeId; title = p.title; status = p.status; totalVotes = p.totalVotes }
    })
  };

  public query func list_polls_by_product(productId : ProductId, offset : Nat, limit : Nat) : async [PollSummary] {
    let filtered = Array.filter<Poll>(Iter.toArray(pollMap.vals()), func p = p.scopeType == #product and p.scopeId == productId);
    let start = if (offset > filtered.size()) filtered.size() else offset;
    let end = let e = start + limit; if (e > filtered.size()) filtered.size() else e;
    Array.tabulate<PollSummary>(end - start, func i {
      let p = filtered[start + i];
      { id = p.id; scopeType = p.scopeType; scopeId = p.scopeId; title = p.title; status = p.status; totalVotes = p.totalVotes }
    })
  };

  public query func get_poll(id : PollId) : async ?Poll { pollMap.get(id) };

  public shared (msg) func vote(pollId : PollId, optionId : Nat) : async Bool {
    switch (pollMap.get(pollId)) {
      case (?p) {
        if (p.status == #closed or p.closesAt <= now()) return false;
        if (principalIn(p.voterPrincipals, msg.caller)) return false;
        if (optionId >= p.options.size()) return false;
        let updatedOptions = Array.tabulate<OptionT>(p.options.size(), func i {
          let o = p.options[i];
          if (i == optionId) { { id = o.id; text = o.text; votes = o.votes + 1 } } else { o }
        });
        let updated = { p with options = updatedOptions; totalVotes = p.totalVotes + 1; voterPrincipals = Array.append(p.voterPrincipals, [msg.caller]) };
        pollMap.put(pollId, updated);
        true
      };
      case null false
    }
  };

  public shared func close_poll(pollId : PollId) : async Bool {
    switch (pollMap.get(pollId)) {
      case (?p) { pollMap.put(pollId, { p with status = #closed }); true };
      case null false
    }
  };

  // Surveys
  public shared (msg) func create_survey(scopeType : Text, scopeId : Nat, title : Text, description : Text, closesAt : Int, rewardFund : Nat, allowAnonymous : Bool, questions : [QuestionInput]) : async SurveyId {
    assert(questions.size() >= 1);
    assert(closesAt > now());
    let id = nextSurveyId; nextSurveyId += 1;
    let qs = Array.tabulate<Question>(questions.size(), func i {
      let qi = questions[i];
      {
        id = Nat.fromIntWrap(i);
        type_ = toQuestionType(qi.type_);
        text = qi.text;
        required = qi.required;
        choices = qi.choices;
        min = qi.min;
        max = qi.max;
        helpText = qi.helpText;
      }
    });
    let survey : Survey = {
      id = id; scopeType = toScopeType(scopeType); scopeId = scopeId; title = title; description = description; createdBy = msg.caller; createdAt = now(); closesAt = closesAt; status = #active; rewardFund = rewardFund; allowAnonymous = allowAnonymous; questions = qs; submissionsCount = 0
    };
    surveyMap.put(id, survey);
    id
  };

  public query func get_survey(id : SurveyId) : async ?Survey { surveyMap.get(id) };

  public query func list_surveys_by_project(projectId : ProjectId, offset : Nat, limit : Nat) : async [SurveySummary] {
    let filtered = Array.filter<Survey>(Iter.toArray(surveyMap.vals()), func s = s.scopeType == #project and s.scopeId == projectId);
    let start = if (offset > filtered.size()) filtered.size() else offset;
    let end = let e = start + limit; if (e > filtered.size()) filtered.size() else e;
    Array.tabulate<SurveySummary>(end - start, func i {
      let s = filtered[start + i];
      { id = s.id; scopeType = s.scopeType; scopeId = s.scopeId; title = s.title; status = s.status; submissionsCount = s.submissionsCount }
    })
  };

  public query func list_surveys_by_product(productId : ProductId, offset : Nat, limit : Nat) : async [SurveySummary] {
    let filtered = Array.filter<Survey>(Iter.toArray(surveyMap.vals()), func s = s.scopeType == #product and s.scopeId == productId);
    let start = if (offset > filtered.size()) filtered.size() else offset;
    let end = let e = start + limit; if (e > filtered.size()) filtered.size() else e;
    Array.tabulate<SurveySummary>(end - start, func i {
      let s = filtered[start + i];
      { id = s.id; scopeType = s.scopeType; scopeId = s.scopeId; title = s.title; status = s.status; submissionsCount = s.submissionsCount }
    })
  };

  public shared (msg) func submit_survey(surveyId : SurveyId, answers : [AnswerInput]) : async Bool {
    switch (surveyMap.get(surveyId)) {
      case (?s) {
        if (s.status == #closed or s.closesAt <= now()) return false;
        if (not s.allowAnonymous and Principal.isAnonymous(msg.caller)) return false;
        // One submission per principal per survey (if not anonymous)
        if (not Principal.isAnonymous(msg.caller)) {
          for ((_, sub) in submissionMap.entries()) {
            if (sub.surveyId == surveyId) {
              switch (sub.respondent) {
                case (?p) { if (Principal.equal(p, msg.caller)) return false };
                case null {};
              }
            }
          }
        };
        // Validate required questions and types
        label validate for (q in s.questions.vals()) {
          var found : ?AnswerInput = null;
          for (a in answers.vals()) { if (a.questionId == q.id) { found := ?a; break validate } };
          switch (found) {
            case (?a) {
              switch (q.type_) {
                case (#single) {
                  switch (a.nat) { case (?n) { switch (q.choices) { case (?chs) { if (n >= chs.size()) return false }; case null return false } }; case null return false }
                };
                case (#multi) {
                  switch (a.nats) {
                    case (?ns) { switch (q.choices) { case (?chs) { for (ix in ns.vals()) if (ix >= chs.size()) return false }; case null return false } };
                    case null return false
                  }
                };
                case (#likert) {
                  switch (a.nat) { case (?v) { if (q.min != null and v < q.min!) return false; if (q.max != null and v > q.max!) return false }; case null return false }
                };
                case (#number) {
                  switch (a.nat) { case (?v) { if (q.min != null and v < q.min!) return false; if (q.max != null and v > q.max!) return false }; case null return false }
                };
                case (#rating) {
                  switch (a.nat) { case (?v) { if (q.min != null and v < q.min!) return false; if (q.max != null and v > q.max!) return false }; case null return false }
                };
                case (#short) { if (Option.isNull(a.text)) return false };
                case (#long) { if (Option.isNull(a.text)) return false };
              }
            };
            case null { if (q.required) return false };
          }
        };

        let subId = nextSubmissionId; nextSubmissionId += 1;
        let newSub : Submission = {
          id = subId;
          surveyId = surveyId;
          respondent = if (s.allowAnonymous and Principal.isAnonymous(msg.caller)) null else ?msg.caller;
          submittedAt = now();
          answers = Array.tabulate<Answer>(answers.size(), func i {
            let a = answers[i];
            {
              questionId = a.questionId;
              value = switch (a.nats, a.nat, a.text) {
                case (?ns, _, _) { #nats(ns) };
                case (null, ?n, _) { #nat(n) };
                case (null, null, ?t) { #text(t) };
                case _ { #text("") }
              };
            }
          });
        };
        submissionMap.put(subId, newSub);
        let updated = { s with submissionsCount = s.submissionsCount + 1 };
        surveyMap.put(surveyId, updated);
        true
      };
      case null false
    }
  };

  public shared func close_survey(surveyId : SurveyId) : async Bool {
    switch (surveyMap.get(surveyId)) {
      case (?s) { surveyMap.put(surveyId, { s with status = #closed }); true };
      case null false
    }
  };

  public query func export_survey_csv(surveyId : SurveyId) : async Blob {
    var csv : Text = "submissionId,respondent,submittedAt,questionId,value";
    for ((_, sub) in submissionMap.entries()) {
      if (sub.surveyId == surveyId) {
        let resp = switch (sub.respondent) { case (?p) Principal.toText(p); case null "" };
        for (ans in sub.answers.vals()) {
          let vtxt = switch (ans.value) { case (#nat(n)) Nat.toText(n); case (#nats(ns)) {
            var t : Text = "";
            var first = true;
            for (ix in ns.vals()) {
              if (first) { t := Nat.toText(ix); first := false } else { t := t # "," # Nat.toText(ix) }
            };
            t
          }; case (#text(t)) t };
          csv := csv # "\n" # Nat.toText(sub.id) # "," # resp # "," # Int.toText(sub.submittedAt) # "," # Nat.toText(ans.questionId) # "," # vtxt;
        }
      }
    };
    Blob.fromArray(Text.encodeUtf8(csv))
  };
};
