import Debug "mo:base/Debug";
import Map "mo:base/HashMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import SHA256 "mo:sha256/SHA256";

actor FundingHub {
    // ICRC-1/2 minimal interface types
    public type Account = { owner : Principal; subaccount : ?[Nat8] };
    public type TransferArgs = {
        from_subaccount : ?[Nat8];
        to : Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?[Nat8];
        created_at_time : ?Nat64;
    };
    public type TransferFromArgs = {
        spender_subaccount : ?[Nat8];
        from : Account;
        to : Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?[Nat8];
        created_at_time : ?Nat64;
    };
    public type TransferResult = { #Ok : Nat; #Err : TransferError };
    public type TransferError = {
        #BadFee : { expected_fee : Nat };
        #BadBurn : { min_burn_amount : Nat };
        #InsufficientFunds : { balance : Nat };
        #TooOld;
        #CreatedInFuture : { ledger_time : Nat64 };
        #Duplicate : { duplicate_of : Nat };
        #TemporarilyUnavailable;
        #GenericError : { error_code : Nat; message : Text };
    };

    public type ICRC1 = actor {
        icrc1_transfer : (TransferArgs) -> async TransferResult;
        icrc1_fee : () -> async Nat;
    };

    public type ICRC2 = actor {
        icrc2_transfer_from : (TransferFromArgs) -> async TransferResult;
    };

    // Core types matching the Candid interface
    public type FundingStatus = { #OPEN; #FUNDED; #FAILED; #PAID; #REFUNDED };
    public type Outcome = { #Success; #Failure };

    // Event type for tracking
    public type Event = {
        ts: Nat64;
        kind: Text;
        who: ?Principal;
        amount: ?Nat;
        token: ?Principal;
    };

    // Poll state structure
    type PollState = {
        creator: Principal;
        token: Principal;
        target: Nat;
        funded: Nat;
        status: FundingStatus;
        escrowSub: [Nat8];
    };

    // Contribution tracking
    type Contribution = {
        contributor: Principal;
        amount: Nat;
        timestamp: Nat64;
    };

    // Storage
    private stable var pollStates: [(Nat, PollState)] = [];
    private stable var pollContributions: [(Nat, [Contribution])] = [];
    private stable var pollEvents: [(Nat, [Event])] = [];
    
    private var polls = Map.HashMap<Nat, PollState>(0, Nat.equal, func(x: Nat): Nat32 { Nat32.fromNat(x % (2**32)) });
    private var contributions = Map.HashMap<Nat, [Contribution]>(0, Nat.equal, func(x: Nat): Nat32 { Nat32.fromNat(x % (2**32)) });
    private var events = Map.HashMap<Nat, Buffer.Buffer<Event>>(0, Nat.equal, func(x: Nat): Nat32 { Nat32.fromNat(x % (2**32)) });
    
    // Re-entrancy guard
    private var inProgress = Map.HashMap<Nat, Bool>(0, Nat.equal, func(x: Nat): Nat32 { Nat32.fromNat(x % (2**32)) });

    // Constants
    private let MAX_EVENTS_PER_POLL = 1000;

    // Utility functions
    private func generateEscrowSubaccount(pollId: Nat): [Nat8] {
        let input = Text.encodeUtf8("poll:" # Nat.toText(pollId));
        let hash = SHA256.sha256(Blob.toArray(input));
        Array.take(hash, 32)
    };

    private func addEvent(pollId: Nat, event: Event) {
        switch (events.get(pollId)) {
            case null {
                let buffer = Buffer.Buffer<Event>(MAX_EVENTS_PER_POLL);
                buffer.add(event);
                events.put(pollId, buffer);
            };
            case (?buffer) {
                if (buffer.size() >= MAX_EVENTS_PER_POLL) {
                    ignore buffer.removeFirst();
                };
                buffer.add(event);
            };
        }
    };

    private func isReentrant(pollId: Nat): Bool {
        switch (inProgress.get(pollId)) {
            case null { false };
            case (?inProg) { inProg };
        }
    };

    private func setInProgress(pollId: Nat, value: Bool) {
        inProgress.put(pollId, value);
    };

    // Public API implementation
    public func init_poll_escrow(
        pollId: Nat, 
        creator: Principal, 
        token: Principal, 
        subaccount: ?[Nat8], 
        target: ?Nat
    ) : async () {
        // Check if poll already exists
        switch (polls.get(pollId)) {
            case (?_) { return }; // Already initialized
            case null {};
        };

        let escrowSub = generateEscrowSubaccount(pollId);
        let targetAmount = switch (target) {
            case null { 0 };
            case (?t) { t };
        };

        let pollState: PollState = {
            creator = creator;
            token = token;
            target = targetAmount;
            funded = 0;
            status = #OPEN;
            escrowSub = escrowSub;
        };

        polls.put(pollId, pollState);
        contributions.put(pollId, []);

        let event: Event = {
            ts = Nat64.fromNat(Int.abs(Time.now()));
            kind = "init";
            who = ?creator;
            amount = ?targetAmount;
            token = ?token;
        };
        addEvent(pollId, event);
    };

    public func fund_poll(pollId: Nat, from: Principal, amount: Nat) : async { #Ok; #Err: Text } {
        let caller = msg.caller;
        
        // Re-entrancy guard
        if (isReentrant(pollId)) {
            return #Err("Operation in progress for this poll");
        };
        setInProgress(pollId, true);

        let result = await _fund_poll_impl(pollId, from, amount, caller);
        setInProgress(pollId, false);
        result
    };

    private func _fund_poll_impl(pollId: Nat, from: Principal, amount: Nat, caller: Principal) : async { #Ok; #Err: Text } {
        switch (polls.get(pollId)) {
            case null { #Err("Poll not found") };
            case (?poll) {
                // State machine check
                switch (poll.status) {
                    case (#OPEN) {};
                    case (_) { return #Err("Poll is not open for funding") };
                };

                // TODO: Read network fee via icrc1_fee() and validate amount > fee
                let tokenActor: ICRC2 = actor(Principal.toText(poll.token));
                let memo = Text.encodeUtf8("poll-" # Nat.toText(pollId));
                
                let transferArgs: TransferFromArgs = {
                    spender_subaccount = null;
                    from = { owner = from; subaccount = null };
                    to = { owner = Principal.fromActor(FundingHub); subaccount = ?poll.escrowSub };
                    amount = amount;
                    fee = null; // TODO: Set appropriate fee
                    memo = ?Blob.toArray(memo);
                    created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
                };

                try {
                    let transferResult = await tokenActor.icrc2_transfer_from(transferArgs);
                    switch (transferResult) {
                        case (#Ok(_)) {
                            // Update poll state
                            let updatedPoll = {
                                poll with
                                funded = poll.funded + amount;
                                status = if (poll.funded + amount >= poll.target and poll.target > 0) { #FUNDED } else { #OPEN };
                            };
                            polls.put(pollId, updatedPoll);

                            // Track contribution
                            let newContrib: Contribution = {
                                contributor = caller;
                                amount = amount;
                                timestamp = Nat64.fromNat(Int.abs(Time.now()));
                            };
                            let existingContribs = switch (contributions.get(pollId)) {
                                case null { [] };
                                case (?contribs) { contribs };
                            };
                            contributions.put(pollId, Array.append(existingContribs, [newContrib]));

                            // Add event
                            let event: Event = {
                                ts = Nat64.fromNat(Int.abs(Time.now()));
                                kind = "fund";
                                who = ?caller;
                                amount = ?amount;
                                token = ?poll.token;
                            };
                            addEvent(pollId, event);

                            #Ok
                        };
                        case (#Err(err)) {
                            #Err("Transfer failed: " # debug_show(err))
                        };
                    }
                } catch (e) {
                    #Err("Network error during transfer")
                }
            };
        }
    };

    public func close_poll(pollId: Nat, outcome: Outcome) : async { #Ok; #Err: Text } {
        let caller = msg.caller;
        
        // Re-entrancy guard
        if (isReentrant(pollId)) {
            return #Err("Operation in progress for this poll");
        };
        setInProgress(pollId, true);

        let result = await _close_poll_impl(pollId, outcome, caller);
        setInProgress(pollId, false);
        result
    };

    private func _close_poll_impl(pollId: Nat, outcome: Outcome, caller: Principal) : async { #Ok; #Err: Text } {
        switch (polls.get(pollId)) {
            case null { #Err("Poll not found") };
            case (?poll) {
                // Check authorization (only creator can close)
                if (caller != poll.creator) {
                    return #Err("Only poll creator can close the poll");
                };

                // State machine check - prevent double close
                switch (poll.status) {
                    case (#PAID or #REFUNDED or #FAILED) { return #Err("Poll already closed") };
                    case (_) {};
                };

                switch (outcome) {
                    case (#Success) {
                        // Transfer escrow to creator
                        // TODO: Calculate and subtract network fee from transfer amount
                        let tokenActor: ICRC1 = actor(Principal.toText(poll.token));
                        
                        let transferArgs: TransferArgs = {
                            from_subaccount = ?poll.escrowSub;
                            to = { owner = poll.creator; subaccount = null };
                            amount = poll.funded;
                            fee = null; // TODO: Set appropriate fee
                            memo = ?Text.encodeUtf8("poll-success-" # Nat.toText(pollId)) |> Blob.toArray(_);
                            created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
                        };

                        try {
                            let transferResult = await tokenActor.icrc1_transfer(transferArgs);
                            switch (transferResult) {
                                case (#Ok(_)) {
                                    let updatedPoll = { poll with status = #PAID };
                                    polls.put(pollId, updatedPoll);
                                    
                                    let event: Event = {
                                        ts = Nat64.fromNat(Int.abs(Time.now()));
                                        kind = "close_success";
                                        who = ?caller;
                                        amount = ?poll.funded;
                                        token = ?poll.token;
                                    };
                                    addEvent(pollId, event);
                                    
                                    #Ok
                                };
                                case (#Err(err)) {
                                    #Err("Transfer to creator failed: " # debug_show(err))
                                };
                            }
                        } catch (e) {
                            #Err("Network error during payout transfer")
                        }
                    };
                    case (#Failure) {
                        // Mark as failed, do not auto-refund
                        let updatedPoll = { poll with status = #FAILED };
                        polls.put(pollId, updatedPoll);
                        
                        let event: Event = {
                            ts = Nat64.fromNat(Int.abs(Time.now()));
                            kind = "close_failure";
                            who = ?caller;
                            amount = null;
                            token = ?poll.token;
                        };
                        addEvent(pollId, event);
                        
                        #Ok
                    };
                }
            };
        }
    };

    public func request_refund(pollId: Nat) : async { #Ok; #Err: Text } {
        let caller = msg.caller;
        
        // Re-entrancy guard
        if (isReentrant(pollId)) {
            return #Err("Operation in progress for this poll");
        };
        setInProgress(pollId, true);

        let result = await _request_refund_impl(pollId, caller);
        setInProgress(pollId, false);
        result
    };

    private func _request_refund_impl(pollId: Nat, caller: Principal) : async { #Ok; #Err: Text } {
        switch (polls.get(pollId)) {
            case null { #Err("Poll not found") };
            case (?poll) {
                // Check if refunds are allowed
                switch (poll.status) {
                    case (#FAILED) {};
                    case (_) { return #Err("Refunds only available for failed polls") };
                };

                // Find contributor's total contributions
                let contribs = switch (contributions.get(pollId)) {
                    case null { [] };
                    case (?c) { c };
                };

                let totalContribution = Array.foldLeft<Contribution, Nat>(
                    contribs, 
                    0, 
                    func(acc, contrib) { 
                        if (contrib.contributor == caller) { acc + contrib.amount } else { acc }
                    }
                );

                if (totalContribution == 0) {
                    return #Err("No contributions found for this contributor");
                };

                // TODO: Calculate and subtract network fee from refund amount
                let tokenActor: ICRC1 = actor(Principal.toText(poll.token));
                
                let transferArgs: TransferArgs = {
                    from_subaccount = ?poll.escrowSub;
                    to = { owner = caller; subaccount = null };
                    amount = totalContribution;
                    fee = null; // TODO: Set appropriate fee
                    memo = ?Text.encodeUtf8("poll-refund-" # Nat.toText(pollId)) |> Blob.toArray(_);
                    created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
                };

                try {
                    let transferResult = await tokenActor.icrc1_transfer(transferArgs);
                    switch (transferResult) {
                        case (#Ok(_)) {
                            // Remove contributor's contributions to prevent double refund
                            let remainingContribs = Array.filter<Contribution>(
                                contribs,
                                func(contrib) { contrib.contributor != caller }
                            );
                            contributions.put(pollId, remainingContribs);

                            // Update funded amount
                            let updatedPoll = { 
                                poll with 
                                funded = poll.funded - totalContribution;
                            };
                            polls.put(pollId, updatedPoll);
                            
                            let event: Event = {
                                ts = Nat64.fromNat(Int.abs(Time.now()));
                                kind = "refund";
                                who = ?caller;
                                amount = ?totalContribution;
                                token = ?poll.token;
                            };
                            addEvent(pollId, event);
                            
                            #Ok
                        };
                        case (#Err(err)) {
                            #Err("Refund transfer failed: " # debug_show(err))
                        };
                    }
                } catch (e) {
                    #Err("Network error during refund transfer")
                }
            };
        }
    };

    public query func get_poll_state(pollId: Nat) : async ?{ creator: Principal; token: Principal; target: Nat; funded: Nat; status: FundingStatus } {
        switch (polls.get(pollId)) {
            case null { null };
            case (?poll) {
                ?{
                    creator = poll.creator;
                    token = poll.token;
                    target = poll.target;
                    funded = poll.funded;
                    status = poll.status;
                }
            };
        }
    };

    public query func get_events(pollId: Nat, offset: Nat, limit: Nat) : async [{ ts: Nat64; kind: Text; who: ?Principal; amount: ?Nat; token: ?Principal }] {
        switch (events.get(pollId)) {
            case null { [] };
            case (?buffer) {
                let eventArray = Buffer.toArray(buffer);
                let start = Nat.min(offset, eventArray.size());
                let end = Nat.min(start + limit, eventArray.size());
                let slice = Array.subArray(eventArray, start, end - start);
                slice
            };
        }
    };

    // System functions for upgrades
    system func preupgrade() {
        Debug.print("Starting pre-upgrade for FundingHub");
        pollStates := Iter.toArray(polls.entries());
        pollContributions := Iter.toArray(contributions.entries());
        
        // Convert events to stable format
        pollEvents := Array.map<(Nat, Buffer.Buffer<Event>), (Nat, [Event])>(
            Iter.toArray(events.entries()),
            func(entry) { (entry.0, Buffer.toArray(entry.1)) }
        );
    };

    system func postupgrade() {
        Debug.print("Completed post-upgrade for FundingHub");
        
        // Restore polls
        for ((pollId, state) in pollStates.vals()) {
            polls.put(pollId, state);
        };
        pollStates := [];
        
        // Restore contributions
        for ((pollId, contribs) in pollContributions.vals()) {
            contributions.put(pollId, contribs);
        };
        pollContributions := [];
        
        // Restore events
        for ((pollId, eventArray) in pollEvents.vals()) {
            let buffer = Buffer.Buffer<Event>(MAX_EVENTS_PER_POLL);
            for (event in eventArray.vals()) {
                buffer.add(event);
            };
            events.put(pollId, buffer);
        };
        pollEvents := [];
    };
}