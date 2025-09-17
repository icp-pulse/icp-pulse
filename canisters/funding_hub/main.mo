import Debug "mo:base/Debug";
import Map "mo:base/HashMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";

actor FundingHub {
    public type FundingProject = {
        id: Text;
        title: Text;
        description: Text;
        goalAmount: Nat;
        currentAmount: Nat;
        creator: Principal;
        createdAt: Int;
        deadline: Int;
        isActive: Bool;
    };

    public type ContributionRecord = {
        projectId: Text;
        contributor: Principal;
        amount: Nat;
        timestamp: Int;
    };

    private stable var nextProjectId: Nat = 0;
    private var projects = Map.HashMap<Text, FundingProject>(0, Text.equal, Text.hash);
    private var contributions = Map.HashMap<Text, [ContributionRecord]>(0, Text.equal, Text.hash);

    public query func getProjects() : async [FundingProject] {
        Map.vals(projects) |> Iter.toArray(_)
    };

    public query func getProject(id: Text) : async ?FundingProject {
        projects.get(id)
    };

    public func createProject(title: Text, description: Text, goalAmount: Nat, deadline: Int) : async Result.Result<Text, Text> {
        let caller = msg.caller;
        let projectId = Nat.toText(nextProjectId);
        nextProjectId += 1;

        let project: FundingProject = {
            id = projectId;
            title = title;
            description = description;
            goalAmount = goalAmount;
            currentAmount = 0;
            creator = caller;
            createdAt = Time.now();
            deadline = deadline;
            isActive = true;
        };

        projects.put(projectId, project);
        #ok(projectId)
    };

    public func contribute(projectId: Text, amount: Nat) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        switch (projects.get(projectId)) {
            case null { #err("Project not found") };
            case (?project) {
                if (not project.isActive) {
                    return #err("Project is not active");
                };
                
                if (Time.now() > project.deadline) {
                    return #err("Project deadline has passed");
                };

                let updatedProject = {
                    project with
                    currentAmount = project.currentAmount + amount;
                };
                
                projects.put(projectId, updatedProject);

                let contribution: ContributionRecord = {
                    projectId = projectId;
                    contributor = caller;
                    amount = amount;
                    timestamp = Time.now();
                };

                let existingContributions = switch (contributions.get(projectId)) {
                    case null { [] };
                    case (?contribs) { contribs };
                };
                
                contributions.put(projectId, Array.append(existingContributions, [contribution]));
                #ok()
            };
        }
    };

    public query func getContributions(projectId: Text) : async [ContributionRecord] {
        switch (contributions.get(projectId)) {
            case null { [] };
            case (?contribs) { contribs };
        }
    };

    system func preupgrade() {
        Debug.print("Starting pre-upgrade for FundingHub");
    };

    system func postupgrade() {
        Debug.print("Completed post-upgrade for FundingHub");
    };
}