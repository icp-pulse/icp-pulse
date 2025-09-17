import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";

import FundingHub "../main";

actor Test {
    public func runTests() : async () {
        Debug.print("Starting FundingHub tests...");
        
        await testProjectCreation();
        await testContribution();
        await testGetProject();
        await testGetProjects();
        
        Debug.print("All tests completed!");
    };

    private func testProjectCreation() : async () {
        Debug.print("Testing project creation...");
        
        let fundingHub = await FundingHub.FundingHub();
        let deadline = Time.now() + (24 * 60 * 60 * 1_000_000_000); // 24 hours from now
        
        let result = await fundingHub.createProject(
            "Test Project",
            "A test funding project",
            1000,
            deadline
        );
        
        switch (result) {
            case (#ok(projectId)) {
                Debug.print("✓ Project created successfully with ID: " # projectId);
            };
            case (#err(error)) {
                Debug.print("✗ Project creation failed: " # error);
            };
        };
    };

    private func testContribution() : async () {
        Debug.print("Testing contribution...");
        
        let fundingHub = await FundingHub.FundingHub();
        let deadline = Time.now() + (24 * 60 * 60 * 1_000_000_000);
        
        // First create a project
        let createResult = await fundingHub.createProject(
            "Contribution Test Project",
            "A project for testing contributions",
            1000,
            deadline
        );
        
        switch (createResult) {
            case (#ok(projectId)) {
                // Now test contributing to it
                let contributeResult = await fundingHub.contribute(projectId, 100);
                
                switch (contributeResult) {
                    case (#ok()) {
                        Debug.print("✓ Contribution successful");
                    };
                    case (#err(error)) {
                        Debug.print("✗ Contribution failed: " # error);
                    };
                };
            };
            case (#err(error)) {
                Debug.print("✗ Could not create project for contribution test: " # error);
            };
        };
    };

    private func testGetProject() : async () {
        Debug.print("Testing get project...");
        
        let fundingHub = await FundingHub.FundingHub();
        let deadline = Time.now() + (24 * 60 * 60 * 1_000_000_000);
        
        // Create a project
        let createResult = await fundingHub.createProject(
            "Get Test Project",
            "A project for testing retrieval",
            500,
            deadline
        );
        
        switch (createResult) {
            case (#ok(projectId)) {
                // Try to retrieve it
                let project = await fundingHub.getProject(projectId);
                
                switch (project) {
                    case (?proj) {
                        Debug.print("✓ Project retrieved successfully: " # proj.title);
                    };
                    case null {
                        Debug.print("✗ Project not found");
                    };
                };
            };
            case (#err(error)) {
                Debug.print("✗ Could not create project for get test: " # error);
            };
        };
    };

    private func testGetProjects() : async () {
        Debug.print("Testing get all projects...");
        
        let fundingHub = await FundingHub.FundingHub();
        let projects = await fundingHub.getProjects();
        
        Debug.print("✓ Retrieved " # Nat.toText(projects.size()) # " projects");
    };
}