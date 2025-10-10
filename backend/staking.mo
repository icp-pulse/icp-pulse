// Staking Canister for ICP Pulse
// Users stake PULSE tokens to earn PULSEG governance tokens

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
import { phash; nhash; thash } "mo:map/Map";
import Float "mo:base/Float";
import Debug "mo:base/Debug";

persistent actor class Staking() = this {

  // Types
  type Principal = Principal.Principal;

  public type StakingPeriod = {
    #Flexible;      // No lock, 5% APY
    #ThirtyDays;    // 30 days, 15% APY
    #NinetyDays;    // 90 days, 30% APY
    #OneYear;       // 365 days, 50% APY
  };

  public type StakeStatus = {
    #Active;
    #Unstaking;
    #Completed;
  };

  public type StakeInfo = {
    id : Nat;
    owner : Principal;
    pulseAmount : Nat;           // Amount of PULSE staked (in e8s)
    pulsegEarned : Nat;          // Total PULSEG earned (in e8s)
    pulsegClaimed : Nat;         // Total PULSEG claimed (in e8s)
    lockPeriod : StakingPeriod;
    startTime : Int;             // Nanoseconds
    endTime : Int;               // Nanoseconds
    rewardRate : Nat;            // APY in basis points (e.g., 5000 = 50%)
    lastClaimTime : Int;         // Last time rewards were claimed
    status : StakeStatus;
  };

  public type StakingStats = {
    totalPulseStaked : Nat;
    totalPulsegDistributed : Nat;
    totalStakers : Nat;
    activeStakes : Nat;
    averageStakingPeriod : Nat;  // In seconds
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
    icrc2_transfer_from : (TransferFromArgs) -> async TransferResult;
  };

  type PULSEGActor = actor {
    mint : (Account, Nat) -> async Result.Result<Nat, TransferError>;
  };

  // State variables
  private var owner : Principal = Principal.fromText("aaaaa-aa");
  private var pulseTokenCanister : ?Principal = null;
  private var pulsegTokenCanister : ?Principal = null;
  private var initialized : Bool = false;
  private var stakingPaused : Bool = false;

  // Counters
  private var nextStakeId : Nat = 1;

  // Storage using Map
  private var stakes = Map.new<Nat, StakeInfo>();  // stakeId -> StakeInfo
  private var userStakes = Map.new<Principal, [Nat]>();  // user -> [stakeIds]

  // Stable storage for upgrades
  private var stableStakes : [(Nat, StakeInfo)] = [];
  private var stableUserStakes : [(Principal, [Nat])] = [];

  // APY Configuration (in basis points, 10000 = 100%)
  private var rewardRates : [(StakingPeriod, Nat)] = [
    (#Flexible, 500),     // 5%
    (#ThirtyDays, 1500),  // 15%
    (#NinetyDays, 3000),  // 30%
    (#OneYear, 5000),     // 50%
  ];

  // Early unstaking penalty (10% of staked amount)
  private let EARLY_UNSTAKE_PENALTY_BP : Nat = 1000; // 10% in basis points

  // Constants
  private let NANOS_PER_SECOND : Nat = 1_000_000_000;
  private let SECONDS_PER_DAY : Nat = 86400;
  private let SECONDS_PER_YEAR : Nat = 31_536_000;
  private let BASIS_POINTS : Nat = 10000;

  // Pre-upgrade: save state
  system func preupgrade() {
    stableStakes := Iter.toArray(Map.entries(stakes));
    stableUserStakes := Iter.toArray(Map.entries(userStakes));
  };

  // Post-upgrade: restore state
  system func postupgrade() {
    for ((id, stake) in stableStakes.vals()) {
      Map.set(stakes, nhash, id, stake);
    };
    for ((user, stakeIds) in stableUserStakes.vals()) {
      Map.set(userStakes, phash, user, stakeIds);
    };
  };

  // Initialize canister
  public shared ({ caller }) func initialize(
    _pulseCanister : Principal,
    _pulsegCanister : Principal
  ) : async Result.Result<Text, Text> {
    if (initialized) {
      return #err("Canister already initialized");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot initialize");
    };

    owner := caller;
    pulseTokenCanister := ?_pulseCanister;
    pulsegTokenCanister := ?_pulsegCanister;
    initialized := true;

    #ok("Staking canister initialized successfully");
  };

  // Get reward rate for staking period
  private func getRewardRate(period : StakingPeriod) : Nat {
    for ((p, rate) in rewardRates.vals()) {
      switch (p, period) {
        case (#Flexible, #Flexible) { return rate };
        case (#ThirtyDays, #ThirtyDays) { return rate };
        case (#NinetyDays, #NinetyDays) { return rate };
        case (#OneYear, #OneYear) { return rate };
        case _ {};
      };
    };
    500 // Default to 5% if not found
  };

  // Get lock period duration in seconds
  private func getLockDuration(period : StakingPeriod) : Nat {
    switch (period) {
      case (#Flexible) { 0 };
      case (#ThirtyDays) { SECONDS_PER_DAY * 30 };
      case (#NinetyDays) { SECONDS_PER_DAY * 90 };
      case (#OneYear) { SECONDS_PER_DAY * 365 };
    };
  };

  // Calculate rewards earned
  private func calculateRewards(stake : StakeInfo) : Nat {
    let now = Time.now();
    let stakingDuration = Int.abs(now - stake.lastClaimTime);
    let stakingSeconds = stakingDuration / NANOS_PER_SECOND;

    // Formula: rewards = (stakedAmount * APY * timeStaked) / (365 days * 10000)
    // Using integer arithmetic to avoid precision loss
    let rewardsNumerator = stake.pulseAmount * stake.rewardRate * stakingSeconds;
    let rewardsDenominator = SECONDS_PER_YEAR * BASIS_POINTS;

    rewardsNumerator / rewardsDenominator
  };

  // Stake PULSE tokens
  public shared ({ caller }) func stake(
    amount : Nat,
    lockPeriod : StakingPeriod
  ) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (stakingPaused) {
      return #err("Staking is currently paused");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot stake");
    };

    if (amount == 0) {
      return #err("Stake amount must be greater than 0");
    };

    // Minimum stake: 100 PULSE (100_000_000 in e8s)
    if (amount < 100_000_000) {
      return #err("Minimum stake is 100 PULSE");
    };

    let pulseCanister = switch (pulseTokenCanister) {
      case (null) { return #err("PULSE token canister not set") };
      case (?canister) { canister };
    };

    // Transfer PULSE from user to staking canister using icrc2_transfer_from
    let pulseLedger : ICRC1Actor = actor (Principal.toText(pulseCanister));

    let transferResult = await pulseLedger.icrc2_transfer_from({
      spender_subaccount = null;
      from = {
        owner = caller;
        subaccount = null;
      };
      to = {
        owner = Principal.fromActor(this);
        subaccount = null;
      };
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    switch (transferResult) {
      case (#Err(error)) {
        let errorMsg = switch (error) {
          case (#InsufficientAllowance({ allowance })) {
            "Insufficient allowance. Please approve the staking canister first. Current allowance: " # Nat.toText(allowance);
          };
          case (#InsufficientFunds({ balance })) {
            "Insufficient PULSE balance: " # Nat.toText(balance);
          };
          case (#GenericError({ message; error_code })) {
            "Error: " # message # " (code: " # Nat.toText(error_code) # ")";
          };
          case _ {
            "Failed to transfer PULSE tokens";
          };
        };
        return #err(errorMsg);
      };
      case (#Ok(_)) {};
    };

    // Create stake record
    let stakeId = nextStakeId;
    nextStakeId += 1;

    let now = Time.now();
    let lockDuration = getLockDuration(lockPeriod);
    let endTime = now + (lockDuration * NANOS_PER_SECOND);
    let rewardRate = getRewardRate(lockPeriod);

    let stakeInfo : StakeInfo = {
      id = stakeId;
      owner = caller;
      pulseAmount = amount;
      pulsegEarned = 0;
      pulsegClaimed = 0;
      lockPeriod = lockPeriod;
      startTime = now;
      endTime = endTime;
      rewardRate = rewardRate;
      lastClaimTime = now;
      status = #Active;
    };

    Map.set(stakes, nhash, stakeId, stakeInfo);

    // Update user stakes
    let currentUserStakes = switch (Map.get(userStakes, phash, caller)) {
      case (null) { [] };
      case (?stakes) { stakes };
    };
    Map.set(userStakes, phash, caller, Array.append(currentUserStakes, [stakeId]));

    #ok(stakeId)
  };

  // Claim rewards
  public shared ({ caller }) func claim_rewards(stakeId : Nat) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    let stakeOpt = Map.get(stakes, nhash, stakeId);
    switch (stakeOpt) {
      case (null) { return #err("Stake not found") };
      case (?stake) {
        // Verify ownership
        if (not Principal.equal(stake.owner, caller)) {
          return #err("You do not own this stake");
        };

        // Check if stake is active
        if (stake.status != #Active) {
          return #err("Stake is not active");
        };

        // Calculate pending rewards
        let pendingRewards = calculateRewards(stake);

        if (pendingRewards == 0) {
          return #err("No rewards to claim");
        };

        // Mint PULSEG rewards
        let pulsegCanister = switch (pulsegTokenCanister) {
          case (null) { return #err("PULSEG token canister not set") };
          case (?canister) { canister };
        };

        let pulsegActor : PULSEGActor = actor (Principal.toText(pulsegCanister));

        let mintResult = await pulsegActor.mint({
          owner = caller;
          subaccount = null;
        }, pendingRewards);

        switch (mintResult) {
          case (#Err(error)) {
            return #err("Failed to mint PULSEG rewards");
          };
          case (#Ok(_)) {
            // Update stake record
            let now = Time.now();
            let updatedStake : StakeInfo = {
              stake with
              pulsegEarned = stake.pulsegEarned + pendingRewards;
              pulsegClaimed = stake.pulsegClaimed + pendingRewards;
              lastClaimTime = now;
            };

            Map.set(stakes, nhash, stakeId, updatedStake);
            #ok(pendingRewards)
          };
        };
      };
    };
  };

  // Unstake PULSE tokens
  public shared ({ caller }) func unstake(stakeId : Nat) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    let stakeOpt = Map.get(stakes, nhash, stakeId);
    switch (stakeOpt) {
      case (null) { return #err("Stake not found") };
      case (?stake) {
        // Verify ownership
        if (not Principal.equal(stake.owner, caller)) {
          return #err("You do not own this stake");
        };

        // Check if stake is active
        if (stake.status != #Active) {
          return #err("Stake is not active");
        };

        let now = Time.now();
        var returnAmount = stake.pulseAmount;
        var penaltyApplied = false;

        // Check lock period
        if (now < stake.endTime) {
          // Early unstaking - apply penalty
          let penalty = (stake.pulseAmount * EARLY_UNSTAKE_PENALTY_BP) / BASIS_POINTS;
          returnAmount := stake.pulseAmount - penalty;
          penaltyApplied := true;
        };

        // First, claim any pending rewards
        let pendingRewards = calculateRewards(stake);
        if (pendingRewards > 0) {
          let pulsegCanister = switch (pulsegTokenCanister) {
            case (null) { return #err("PULSEG token canister not set") };
            case (?canister) { canister };
          };

          let pulsegActor : PULSEGActor = actor (Principal.toText(pulsegCanister));
          let _ = await pulsegActor.mint({
            owner = caller;
            subaccount = null;
          }, pendingRewards);
        };

        // Return PULSE to user
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
          amount = returnAmount;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        switch (transferResult) {
          case (#Err(_)) {
            return #err("Failed to transfer PULSE tokens back to you");
          };
          case (#Ok(_)) {
            // Update stake record
            let updatedStake : StakeInfo = {
              stake with
              status = #Completed;
              pulsegEarned = stake.pulsegEarned + pendingRewards;
              pulsegClaimed = stake.pulsegClaimed + pendingRewards;
            };

            Map.set(stakes, nhash, stakeId, updatedStake);

            if (penaltyApplied) {
              #ok("Unstaked successfully. Early unstaking penalty (10%) was applied. You received " # Nat.toText(returnAmount) # " PULSE")
            } else {
              #ok("Unstaked successfully. You received " # Nat.toText(returnAmount) # " PULSE")
            }
          };
        };
      };
    };
  };

  // Get user's stakes
  public query func get_user_stakes(user : Principal) : async [StakeInfo] {
    let userStakeIds = switch (Map.get(userStakes, phash, user)) {
      case (null) { return [] };
      case (?ids) { ids };
    };

    let stakeBuffer = Buffer.Buffer<StakeInfo>(userStakeIds.size());
    for (stakeId in userStakeIds.vals()) {
      switch (Map.get(stakes, nhash, stakeId)) {
        case (?stake) { stakeBuffer.add(stake) };
        case null {};
      };
    };

    Buffer.toArray(stakeBuffer)
  };

  // Get stake by ID
  public query func get_stake(stakeId : Nat) : async ?StakeInfo {
    Map.get(stakes, nhash, stakeId)
  };

  // Calculate pending rewards without claiming
  public query func calculate_pending_rewards(stakeId : Nat) : async Result.Result<Nat, Text> {
    switch (Map.get(stakes, nhash, stakeId)) {
      case (null) { #err("Stake not found") };
      case (?stake) {
        if (stake.status != #Active) {
          return #ok(0);
        };
        #ok(calculateRewards(stake))
      };
    };
  };

  // Get total staked PULSE
  public query func get_total_staked() : async Nat {
    var total : Nat = 0;
    for ((_, stake) in Map.entries(stakes)) {
      if (stake.status == #Active) {
        total += stake.pulseAmount;
      };
    };
    total
  };

  // Get staking statistics
  public query func get_staking_stats() : async StakingStats {
    var totalPulseStaked : Nat = 0;
    var totalPulsegDistributed : Nat = 0;
    var activeStakes : Nat = 0;
    var totalStakingDuration : Nat = 0;
    var uniqueStakers = Map.new<Principal, Bool>();

    let now = Time.now();

    for ((_, stake) in Map.entries(stakes)) {
      Map.set(uniqueStakers, phash, stake.owner, true);

      if (stake.status == #Active) {
        totalPulseStaked += stake.pulseAmount;
        activeStakes += 1;

        let duration = Int.abs(now - stake.startTime) / NANOS_PER_SECOND;
        totalStakingDuration += duration;
      };

      totalPulsegDistributed += stake.pulsegClaimed;
    };

    let avgStakingPeriod = if (activeStakes > 0) {
      totalStakingDuration / activeStakes
    } else { 0 };

    {
      totalPulseStaked = totalPulseStaked;
      totalPulsegDistributed = totalPulsegDistributed;
      totalStakers = Map.size(uniqueStakers);
      activeStakes = activeStakes;
      averageStakingPeriod = avgStakingPeriod;
    }
  };

  // Admin: Update reward rates
  public shared ({ caller }) func update_reward_rates(
    newRates : [(StakingPeriod, Nat)]
  ) : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can update reward rates");
    };

    rewardRates := newRates;
    #ok("Reward rates updated successfully")
  };

  // Admin: Pause staking
  public shared ({ caller }) func pause_staking() : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can pause staking");
    };

    stakingPaused := true;
    #ok("Staking paused")
  };

  // Admin: Resume staking
  public shared ({ caller }) func resume_staking() : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can resume staking");
    };

    stakingPaused := false;
    #ok("Staking resumed")
  };

  // Query functions
  public query func is_initialized() : async Bool {
    initialized
  };

  public query func is_staking_paused() : async Bool {
    stakingPaused
  };

  public query func get_owner() : async Principal {
    owner
  };

  public query func get_pulse_canister() : async ?Principal {
    pulseTokenCanister
  };

  public query func get_pulseg_canister() : async ?Principal {
    pulsegTokenCanister
  };

  public query func get_reward_rates() : async [(StakingPeriod, Nat)] {
    rewardRates
  };

  public query func get_canister_principal() : async Principal {
    Principal.fromActor(this)
  };
};
