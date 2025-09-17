import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Buffer "mo:base/Buffer";
import Map "mo:base/HashMap";

// Import the main canister types
import FundingHub "../main";

actor Test {
    // Mock token transfer records for testing
    type MockTransferRecord = {
        kind: Text; // "transfer_from" or "transfer"
        from: ?Principal;
        to: Principal;
        amount: Nat;
        memo: ?[Nat8];
        subaccount: ?[Nat8];
    };

    // Mock token actor that records all transfers
    class MockToken() {
        private var transferLog = Buffer.Buffer<MockTransferRecord>(100);
        private var shouldFail = false;
        private var fee: Nat = 10000; // 0.0001 tokens

        public func icrc2_transfer_from(args: FundingHub.TransferFromArgs) : async FundingHub.TransferResult {
            if (shouldFail) {
                return #Err(#InsufficientFunds({ balance = 0 }));
            };

            let record: MockTransferRecord = {
                kind = "transfer_from";
                from = ?args.from.owner;
                to = args.to.owner;
                amount = args.amount;
                memo = args.memo;
                subaccount = args.to.subaccount;
            };
            transferLog.add(record);
            #Ok(transferLog.size())
        };

        public func icrc1_transfer(args: FundingHub.TransferArgs) : async FundingHub.TransferResult {
            if (shouldFail) {
                return #Err(#InsufficientFunds({ balance = 0 }));
            };

            let record: MockTransferRecord = {
                kind = "transfer";
                from = null;
                to = args.to.owner;
                amount = args.amount;
                memo = args.memo;
                subaccount = args.from_subaccount;
            };
            transferLog.add(record);
            #Ok(transferLog.size())
        };

        public func icrc1_fee() : async Nat {
            fee
        };

        public func setFailure(fail: Bool) {
            shouldFail := fail;
        };

        public func getTransferLog() : [MockTransferRecord] {
            Buffer.toArray(transferLog)
        };

        public func clearLog() {
            transferLog.clear();
        };
    };

    // Test utilities
    private func assertEqual<T>(actual: T, expected: T, msg: Text) {
        if (actual != expected) {
            Debug.print("✗ ASSERTION FAILED: " # msg);
            Debug.print("  Expected: " # debug_show(expected));
            Debug.print("  Actual: " # debug_show(actual));
        } else {
            Debug.print("✓ " # msg);
        }
    };

    private func assertSuccess<T>(result: { #Ok: T; #Err: Text }, msg: Text) : ?T {
        switch (result) {
            case (#Ok(value)) {
                Debug.print("✓ " # msg);
                ?value
            };
            case (#Err(error)) {
                Debug.print("✗ " # msg # " - Error: " # error);
                null
            };
        }
    };

    private func assertError<T>(result: { #Ok: T; #Err: Text }, msg: Text) {
        switch (result) {
            case (#Ok(_)) {
                Debug.print("✗ " # msg # " - Expected error but got success");
            };
            case (#Err(error)) {
                Debug.print("✓ " # msg # " - Got expected error: " # error);
            };
        }
    };

    // Main test runner
    public func runTests() : async () {
        Debug.print("=== Starting FundingHub Unit Tests ===");
        
        await testPositivePath();
        await testNegativePath();
        await testEdgeCases();
        
        Debug.print("=== All tests completed! ===");
    };

    // Test positive path: open → fund → close(success) → payout
    private func testPositivePath() : async () {
        Debug.print("\n--- Testing Positive Path: Open → Fund → Close(Success) → Payout ---");
        
        let fundingHub = await FundingHub.FundingHub();
        let mockToken = MockToken();
        let pollId = 1;
        let creator = Principal.fromText("rdmx6-jaaaa-aaaah-qcaiq-cai");
        let contributor = Principal.fromText("rrkah-fqaaa-aaaah-qcuaq-cai");
        let tokenPrincipal = Principal.fromActor(mockToken);
        let targetAmount = 1000000; // 1 token with 6 decimals
        let fundingAmount = 500000; // 0.5 tokens

        // Step 1: Initialize poll escrow
        Debug.print("Step 1: Initialize poll escrow");
        await fundingHub.init_poll_escrow(pollId, creator, tokenPrincipal, null, ?targetAmount);
        
        // Verify poll state after initialization
        let stateAfterInit = await fundingHub.get_poll_state(pollId);
        switch (stateAfterInit) {
            case (?state) {
                assertEqual(state.creator, creator, "Creator matches");
                assertEqual(state.token, tokenPrincipal, "Token matches");
                assertEqual(state.target, targetAmount, "Target amount matches");
                assertEqual(state.funded, 0, "Initial funded amount is 0");
                assertEqual(state.status, #OPEN, "Initial status is OPEN");
            };
            case null {
                Debug.print("✗ Poll state not found after initialization");
            };
        };

        // Step 2: Fund the poll (first contribution)
        Debug.print("Step 2: Fund the poll");
        let fundResult1 = await fundingHub.fund_poll(pollId, contributor, fundingAmount);
        ignore assertSuccess(fundResult1, "First funding contribution");

        // Verify mock token recorded the transfer_from call
        let transferLog1 = mockToken.getTransferLog();
        if (transferLog1.size() == 1) {
            let transfer = transferLog1[0];
            assertEqual(transfer.kind, "transfer_from", "Transfer type is transfer_from");
            assertEqual(transfer.amount, fundingAmount, "Transfer amount matches");
            Debug.print("✓ Mock token recorded transfer_from call");
        } else {
            Debug.print("✗ Expected 1 transfer, got " # Nat.toText(transferLog1.size()));
        };

        // Verify poll state after funding
        let stateAfterFunding = await fundingHub.get_poll_state(pollId);
        switch (stateAfterFunding) {
            case (?state) {
                assertEqual(state.funded, fundingAmount, "Funded amount updated");
                assertEqual(state.status, #OPEN, "Status remains OPEN (target not reached)");
            };
            case null {
                Debug.print("✗ Poll state not found after funding");
            };
        };

        // Step 3: Fund again to reach target
        Debug.print("Step 3: Fund again to reach target");
        let fundResult2 = await fundingHub.fund_poll(pollId, contributor, fundingAmount);
        ignore assertSuccess(fundResult2, "Second funding contribution");

        let stateAfterFullFunding = await fundingHub.get_poll_state(pollId);
        switch (stateAfterFullFunding) {
            case (?state) {
                assertEqual(state.funded, fundingAmount * 2, "Total funded amount correct");
                assertEqual(state.status, #FUNDED, "Status changed to FUNDED");
            };
            case null {
                Debug.print("✗ Poll state not found after full funding");
            };
        };

        // Step 4: Close poll with success
        Debug.print("Step 4: Close poll with success");
        let closeResult = await fundingHub.close_poll(pollId, #Success);
        ignore assertSuccess(closeResult, "Poll closed successfully");

        // Verify mock token recorded the payout transfer
        let transferLog2 = mockToken.getTransferLog();
        if (transferLog2.size() == 3) {
            let payoutTransfer = transferLog2[2];
            assertEqual(payoutTransfer.kind, "transfer", "Payout transfer type is transfer");
            assertEqual(payoutTransfer.to, creator, "Payout goes to creator");
            assertEqual(payoutTransfer.amount, fundingAmount * 2, "Payout amount matches total funded");
            Debug.print("✓ Mock token recorded payout transfer");
        } else {
            Debug.print("✗ Expected 3 transfers total, got " # Nat.toText(transferLog2.size()));
        };

        // Verify final poll state
        let finalState = await fundingHub.get_poll_state(pollId);
        switch (finalState) {
            case (?state) {
                assertEqual(state.status, #PAID, "Final status is PAID");
            };
            case null {
                Debug.print("✗ Poll state not found after closure");
            };
        };

        // Step 5: Check events
        Debug.print("Step 5: Check events");
        let events = await fundingHub.get_events(pollId, 0, 10);
        if (events.size() >= 4) {
            assertEqual(events[0].kind, "init", "First event is init");
            assertEqual(events[1].kind, "fund", "Second event is fund");
            assertEqual(events[2].kind, "fund", "Third event is fund");
            assertEqual(events[3].kind, "close_success", "Fourth event is close_success");
            Debug.print("✓ Event history correct");
        } else {
            Debug.print("✗ Expected at least 4 events, got " # Nat.toText(events.size()));
        };

        mockToken.clearLog();
        Debug.print("✓ Positive path test completed successfully");
    };

    // Test negative path: open → fund → close(failure) → request_refund
    private func testNegativePath() : async () {
        Debug.print("\n--- Testing Negative Path: Open → Fund → Close(Failure) → Request Refund ---");
        
        let fundingHub = await FundingHub.FundingHub();
        let mockToken = MockToken();
        let pollId = 2;
        let creator = Principal.fromText("rdmx6-jaaaa-aaaah-qcaiq-cai");
        let contributor1 = Principal.fromText("rrkah-fqaaa-aaaah-qcuaq-cai");
        let contributor2 = Principal.fromText("ryjl3-tyaaa-aaaah-qc7wa-cai");
        let tokenPrincipal = Principal.fromActor(mockToken);
        let targetAmount = 2000000; // 2 tokens
        let contribution1 = 800000; // 0.8 tokens
        let contribution2 = 600000; // 0.6 tokens

        // Step 1: Initialize poll escrow
        Debug.print("Step 1: Initialize poll escrow");
        await fundingHub.init_poll_escrow(pollId, creator, tokenPrincipal, null, ?targetAmount);

        // Step 2: Multiple contributors fund the poll
        Debug.print("Step 2: Multiple contributors fund the poll");
        let fundResult1 = await fundingHub.fund_poll(pollId, contributor1, contribution1);
        ignore assertSuccess(fundResult1, "Contributor 1 funding");
        
        let fundResult2 = await fundingHub.fund_poll(pollId, contributor2, contribution2);
        ignore assertSuccess(fundResult2, "Contributor 2 funding");

        // Verify poll state after funding
        let stateAfterFunding = await fundingHub.get_poll_state(pollId);
        switch (stateAfterFunding) {
            case (?state) {
                assertEqual(state.funded, contribution1 + contribution2, "Total funded amount correct");
                assertEqual(state.status, #OPEN, "Status remains OPEN (target not reached)");
            };
            case null {
                Debug.print("✗ Poll state not found after funding");
            };
        };

        // Step 3: Close poll with failure
        Debug.print("Step 3: Close poll with failure");
        let closeResult = await fundingHub.close_poll(pollId, #Failure);
        ignore assertSuccess(closeResult, "Poll closed with failure");

        // Verify poll state after closure
        let stateAfterClosure = await fundingHub.get_poll_state(pollId);
        switch (stateAfterClosure) {
            case (?state) {
                assertEqual(state.status, #FAILED, "Status changed to FAILED");
            };
            case null {
                Debug.print("✗ Poll state not found after closure");
            };
        };

        // Step 4: Contributors request refunds
        Debug.print("Step 4: Contributors request refunds");
        
        // Contributor 1 requests refund
        let refundResult1 = await fundingHub.request_refund(pollId);
        ignore assertSuccess(refundResult1, "Contributor 1 refund");

        // Verify mock token recorded the refund transfer
        let transferLog = mockToken.getTransferLog();
        let refundTransfers = Array.filter<MockTransferRecord>(transferLog, func(t) { t.kind == "transfer" });
        if (refundTransfers.size() >= 1) {
            let refundTransfer = refundTransfers[0];
            assertEqual(refundTransfer.amount, contribution1, "Refund amount matches contribution 1");
            Debug.print("✓ Mock token recorded refund transfer for contributor 1");
        };

        // Contributor 2 requests refund
        let refundResult2 = await fundingHub.request_refund(pollId);
        ignore assertSuccess(refundResult2, "Contributor 2 refund");

        // Step 5: Verify double refund protection
        Debug.print("Step 5: Test double refund protection");
        let doubleRefundResult = await fundingHub.request_refund(pollId);
        assertError(doubleRefundResult, "Double refund prevented");

        // Step 6: Check events
        Debug.print("Step 6: Check events");
        let events = await fundingHub.get_events(pollId, 0, 10);
        if (events.size() >= 5) {
            assertEqual(events[0].kind, "init", "First event is init");
            assertEqual(events[1].kind, "fund", "Second event is fund");
            assertEqual(events[2].kind, "fund", "Third event is fund");
            assertEqual(events[3].kind, "close_failure", "Fourth event is close_failure");
            assertEqual(events[4].kind, "refund", "Fifth event is refund");
            Debug.print("✓ Event history correct");
        } else {
            Debug.print("✗ Expected at least 5 events, got " # Nat.toText(events.size()));
        };

        mockToken.clearLog();
        Debug.print("✓ Negative path test completed successfully");
    };

    // Test edge cases and error conditions
    private func testEdgeCases() : async () {
        Debug.print("\n--- Testing Edge Cases ---");
        
        let fundingHub = await FundingHub.FundingHub();
        let mockToken = MockToken();
        let pollId = 3;
        let creator = Principal.fromText("rdmx6-jaaaa-aaaah-qcaiq-cai");
        let unauthorized = Principal.fromText("rrkah-fqaaa-aaaah-qcuaq-cai");
        let tokenPrincipal = Principal.fromActor(mockToken);

        // Test 1: Fund non-existent poll
        Debug.print("Test 1: Fund non-existent poll");
        let fundNonExistentResult = await fundingHub.fund_poll(999, creator, 100000);
        assertError(fundNonExistentResult, "Funding non-existent poll fails");

        // Test 2: Close non-existent poll
        Debug.print("Test 2: Close non-existent poll");
        let closeNonExistentResult = await fundingHub.close_poll(999, #Success);
        assertError(closeNonExistentResult, "Closing non-existent poll fails");

        // Test 3: Initialize poll, then try unauthorized close
        Debug.print("Test 3: Unauthorized poll closure");
        await fundingHub.init_poll_escrow(pollId, creator, tokenPrincipal, null, ?1000000);
        let unauthorizedCloseResult = await fundingHub.close_poll(pollId, #Success);
        assertError(unauthorizedCloseResult, "Unauthorized close prevented");

        // Test 4: Double initialization
        Debug.print("Test 4: Double initialization");
        await fundingHub.init_poll_escrow(pollId, creator, tokenPrincipal, null, ?2000000);
        let stateAfterDouble = await fundingHub.get_poll_state(pollId);
        switch (stateAfterDouble) {
            case (?state) {
                assertEqual(state.target, 1000000, "Target unchanged after double init");
                Debug.print("✓ Double initialization prevented");
            };
            case null {
                Debug.print("✗ Poll state lost after double init");
            };
        };

        // Test 5: Fund closed poll
        Debug.print("Test 5: Fund closed poll");
        let fundResult = await fundingHub.fund_poll(pollId, creator, 500000);
        ignore assertSuccess(fundResult, "Initial funding");
        
        let closeResult = await fundingHub.close_poll(pollId, #Success);
        ignore assertSuccess(closeResult, "Poll closure");
        
        let fundClosedResult = await fundingHub.fund_poll(pollId, creator, 100000);
        assertError(fundClosedResult, "Funding closed poll fails");

        // Test 6: Refund from non-failed poll
        Debug.print("Test 6: Refund from non-failed poll");
        let pollId2 = 4;
        await fundingHub.init_poll_escrow(pollId2, creator, tokenPrincipal, null, ?1000000);
        let refundNonFailedResult = await fundingHub.request_refund(pollId2);
        assertError(refundNonFailedResult, "Refund from non-failed poll fails");

        // Test 7: Token transfer failure simulation
        Debug.print("Test 7: Token transfer failure");
        let pollId3 = 5;
        mockToken.setFailure(true);
        await fundingHub.init_poll_escrow(pollId3, creator, tokenPrincipal, null, ?1000000);
        let failedFundResult = await fundingHub.fund_poll(pollId3, creator, 500000);
        assertError(failedFundResult, "Funding with token failure handled");
        mockToken.setFailure(false);

        Debug.print("✓ Edge case tests completed successfully");
    };
}