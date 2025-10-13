import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Time "mo:base/Time";

persistent actor class SwapCanister() = this {

  // Type definitions for ICRC1 token interface
  public type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  public type TransferArg = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

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

  public type TransferFromError = {
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

  public type TransferResult = { #Ok : Nat; #Err : TransferError };
  public type TransferFromResult = { #Ok : Nat; #Err : TransferFromError };

  public type TransferFromArgs = {
    spender_subaccount : ?Blob;
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type ICRC1Interface = actor {
    icrc1_transfer : (TransferArg) -> async TransferResult;
    icrc1_balance_of : (Account) -> async Nat;
  };

  public type ICRC2Interface = actor {
    icrc1_transfer : (TransferArg) -> async TransferResult;
    icrc1_balance_of : (Account) -> async Nat;
    icrc2_transfer_from : (TransferFromArgs) -> async TransferFromResult;
  };

  // Transaction history types
  public type SwapDirection = {
    #BuyPulse;    // ckUSDC → PULSE
    #SellPulse;   // PULSE → ckUSDC
  };

  public type SwapTransaction = {
    timestamp: Int;           // Time.now()
    user: Principal;          // User who performed swap
    direction: SwapDirection; // Buy or sell PULSE
    inputAmount: Nat;         // Amount sent by user
    outputAmount: Nat;        // Amount received by user
    exchangeRate: Nat;        // Exchange rate at time (PULSE per ckUSDC)
    spreadBps: Nat;          // Spread in basis points
  };

  // State variables
  private var owner : Principal = Principal.fromText("aaaaa-aa");
  private var pulseTokenCanister : ?Principal = null;
  private var ckUSDCTokenCanister : ?Principal = null;

  // Exchange rate: 10000 PULSE = 1 ckUSDC (stored as PULSE per ckUSDC)
  private var pulsePerCkUSDC : Nat = 10_000;

  // Spread percentage (2.5% = 250 basis points)
  // This creates profit on both buy and sell sides
  private var spreadBasisPoints : Nat = 250; // 250 basis points = 2.5%

  // Track if canister is initialized
  private var initialized : Bool = false;

  // Store last 100 swap transactions (using stable array)
  private stable var swapHistory : [SwapTransaction] = [];
  private let MAX_HISTORY_SIZE : Nat = 100;

  // Initialize the swap canister with token canisters
  public shared ({ caller }) func initialize(
    _pulseCanister : Principal,
    _ckUSDCCanister : Principal
  ) : async Result.Result<Text, Text> {
    if (initialized) {
      return #err("Canister already initialized");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot initialize");
    };

    owner := caller;
    pulseTokenCanister := ?_pulseCanister;
    ckUSDCTokenCanister := ?_ckUSDCCanister;
    initialized := true;

    #ok("Swap canister initialized successfully");
  };

  // Update exchange rate (only owner)
  public shared ({ caller }) func updateExchangeRate(newRate : Nat) : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can update exchange rate");
    };

    if (newRate == 0) {
      return #err("Exchange rate must be greater than 0");
    };

    pulsePerCkUSDC := newRate;
    #ok("Exchange rate updated successfully");
  };

  // Update spread (only owner)
  public shared ({ caller }) func updateSpread(newSpreadBasisPoints : Nat) : async Result.Result<Text, Text> {
    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can update spread");
    };

    if (newSpreadBasisPoints > 1000) {
      return #err("Spread cannot exceed 10% (1000 basis points)");
    };

    spreadBasisPoints := newSpreadBasisPoints;
    #ok("Spread updated successfully to " # Nat.toText(newSpreadBasisPoints) # " basis points");
  };

  // Helper function to record swap transactions
  private func recordSwap(
    user: Principal,
    direction: SwapDirection,
    inputAmount: Nat,
    outputAmount: Nat
  ) {
    let transaction : SwapTransaction = {
      timestamp = Time.now();
      user = user;
      direction = direction;
      inputAmount = inputAmount;
      outputAmount = outputAmount;
      exchangeRate = pulsePerCkUSDC;
      spreadBps = spreadBasisPoints;
    };

    // Add new transaction to history
    let newHistory = Array.append(swapHistory, [transaction]);

    // Keep only last MAX_HISTORY_SIZE transactions
    if (newHistory.size() > MAX_HISTORY_SIZE) {
      swapHistory := Array.tabulate<SwapTransaction>(
        MAX_HISTORY_SIZE,
        func(i) = newHistory[newHistory.size() - MAX_HISTORY_SIZE + i]
      );
    } else {
      swapHistory := newHistory;
    };
  };

  // Swap ckUSDC for PULSE
  public shared ({ caller }) func swapCkUSDCForPulse(ckUSDCAmount : Nat) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot swap");
    };

    if (ckUSDCAmount == 0) {
      return #err("Amount must be greater than 0");
    };

    let pulseCanister = switch (pulseTokenCanister) {
      case (null) { return #err("PULSE token canister not set") };
      case (?canister) { canister };
    };

    let ckUSDCCanister = switch (ckUSDCTokenCanister) {
      case (null) { return #err("ckUSDC token canister not set") };
      case (?canister) { canister };
    };

    // Calculate PULSE amount to send with spread
    // When buying PULSE, user gets 2.5% less PULSE (we apply negative spread)
    // Base amount: ckUSDCAmount * pulsePerCkUSDC
    // With spread: baseAmount * (10000 - spread) / 10000
    let pulseAmount = (ckUSDCAmount * pulsePerCkUSDC * (10_000 - spreadBasisPoints)) / 10_000;

    // Check if swap canister has enough PULSE
    let pulseLedger : ICRC1Interface = actor (Principal.toText(pulseCanister));
    let swapBalance = await pulseLedger.icrc1_balance_of({
      owner = Principal.fromActor(this);
      subaccount = null;
    });

    if (swapBalance < pulseAmount) {
      return #err("Insufficient PULSE liquidity in swap canister");
    };

    // Step 1: Transfer ckUSDC from user to swap canister using icrc2_transfer_from
    // User must have approved this canister first
    let ckUSDCLedger : ICRC2Interface = actor (Principal.toText(ckUSDCCanister));

    let transferFromResult = await ckUSDCLedger.icrc2_transfer_from({
      spender_subaccount = null;
      from = {
        owner = caller;
        subaccount = null;
      };
      to = {
        owner = Principal.fromActor(this);
        subaccount = null;
      };
      amount = ckUSDCAmount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    // Check if ckUSDC transfer was successful
    switch (transferFromResult) {
      case (#Err(error)) {
        let errorMsg = switch (error) {
          case (#InsufficientAllowance({ allowance })) {
            "Insufficient allowance. Current allowance: " # Nat.toText(allowance) # ". Please approve more ckUSDC.";
          };
          case (#InsufficientFunds({ balance })) {
            "Insufficient ckUSDC balance: " # Nat.toText(balance);
          };
          case (#BadFee({ expected_fee })) {
            "Bad fee. Expected: " # Nat.toText(expected_fee);
          };
          case (#GenericError({ message; error_code })) {
            "Error: " # message # " (code: " # Nat.toText(error_code) # ")";
          };
          case (_) {
            "Failed to transfer ckUSDC. Please ensure you have approved the swap canister and have sufficient balance.";
          };
        };
        return #err(errorMsg);
      };
      case (#Ok(_)) {};
    };

    // Step 2: Transfer PULSE to user
    let transferResult = await pulseLedger.icrc1_transfer({
      from_subaccount = null;
      to = {
        owner = caller;
        subaccount = null;
      };
      amount = pulseAmount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    switch (transferResult) {
      case (#Ok(_)) {
        // Record successful swap
        recordSwap(caller, #BuyPulse, ckUSDCAmount, pulseAmount);
        #ok(pulseAmount);
      };
      case (#Err(_)) {
        #err("PULSE transfer failed");
      };
    };
  };

  // Swap PULSE for ckUSDC (reverse swap)
  public shared ({ caller }) func swapPulseForCkUSDC(pulseAmount : Nat) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principals cannot swap");
    };

    if (pulseAmount == 0) {
      return #err("Amount must be greater than 0");
    };

    let pulseCanister = switch (pulseTokenCanister) {
      case (null) { return #err("PULSE token canister not set") };
      case (?canister) { canister };
    };

    let ckUSDCCanister = switch (ckUSDCTokenCanister) {
      case (null) { return #err("ckUSDC token canister not set") };
      case (?canister) { canister };
    };

    // Calculate ckUSDC amount to send with spread (PULSE / rate)
    // When selling PULSE, user gets 2.5% less ckUSDC (we apply negative spread)
    // Base amount: pulseAmount / pulsePerCkUSDC
    // With spread: baseAmount * (10000 - spread) / 10000
    let ckUSDCAmount = (pulseAmount * (10_000 - spreadBasisPoints)) / (pulsePerCkUSDC * 10_000);

    if (ckUSDCAmount == 0) {
      return #err("PULSE amount too small to swap. Minimum: " # Nat.toText(pulsePerCkUSDC) # " PULSE");
    };

    // Check if swap canister has enough ckUSDC
    let ckUSDCLedger : ICRC2Interface = actor (Principal.toText(ckUSDCCanister));
    let swapBalance = await ckUSDCLedger.icrc1_balance_of({
      owner = Principal.fromActor(this);
      subaccount = null;
    });

    if (swapBalance < ckUSDCAmount) {
      return #err("Insufficient ckUSDC liquidity in swap canister");
    };

    // Step 1: Transfer PULSE from user to swap canister using icrc2_transfer_from
    // User must have approved this canister first
    let pulseLedger : ICRC2Interface = actor (Principal.toText(pulseCanister));

    let transferFromResult = await pulseLedger.icrc2_transfer_from({
      spender_subaccount = null;
      from = {
        owner = caller;
        subaccount = null;
      };
      to = {
        owner = Principal.fromActor(this);
        subaccount = null;
      };
      amount = pulseAmount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    // Check if PULSE transfer was successful
    switch (transferFromResult) {
      case (#Err(error)) {
        let errorMsg = switch (error) {
          case (#InsufficientAllowance({ allowance })) {
            "Insufficient allowance. Current allowance: " # Nat.toText(allowance) # ". Please approve more PULSE.";
          };
          case (#InsufficientFunds({ balance })) {
            "Insufficient PULSE balance: " # Nat.toText(balance);
          };
          case (#BadFee({ expected_fee })) {
            "Bad fee. Expected: " # Nat.toText(expected_fee);
          };
          case (#GenericError({ message; error_code })) {
            "Error: " # message # " (code: " # Nat.toText(error_code) # ")";
          };
          case (_) {
            "Failed to transfer PULSE. Please ensure you have approved the swap canister and have sufficient balance.";
          };
        };
        return #err(errorMsg);
      };
      case (#Ok(_)) {};
    };

    // Step 2: Transfer ckUSDC to user
    let transferResult = await ckUSDCLedger.icrc1_transfer({
      from_subaccount = null;
      to = {
        owner = caller;
        subaccount = null;
      };
      amount = ckUSDCAmount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    switch (transferResult) {
      case (#Ok(_)) {
        // Record successful swap
        recordSwap(caller, #SellPulse, pulseAmount, ckUSDCAmount);
        #ok(ckUSDCAmount);
      };
      case (#Err(_)) {
        #err("ckUSDC transfer failed");
      };
    };
  };

  // Deposit PULSE liquidity (owner only)
  public shared ({ caller }) func depositPulseLiquidity(_amount : Nat) : async Result.Result<Text, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can deposit liquidity");
    };

    // Owner must transfer PULSE to this canister manually
    // This function is for record keeping
    #ok("Owner should transfer PULSE to canister: " # Principal.toText(Principal.fromActor(this)));
  };

  // Withdraw PULSE (owner only)
  public shared ({ caller }) func withdrawPulse(amount : Nat) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can withdraw");
    };

    let pulseCanister = switch (pulseTokenCanister) {
      case (null) { return #err("PULSE token canister not set") };
      case (?canister) { canister };
    };

    let pulseLedger : ICRC1Interface = actor (Principal.toText(pulseCanister));

    let transferResult = await pulseLedger.icrc1_transfer({
      from_subaccount = null;
      to = {
        owner = caller;
        subaccount = null;
      };
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    switch (transferResult) {
      case (#Ok(blockIndex)) {
        #ok(blockIndex);
      };
      case (#Err(_)) {
        #err("Withdrawal failed");
      };
    };
  };

  // Withdraw ckUSDC (owner only)
  public shared ({ caller }) func withdrawCkUSDC(amount : Nat) : async Result.Result<Nat, Text> {
    if (not initialized) {
      return #err("Canister not initialized");
    };

    if (not Principal.equal(caller, owner)) {
      return #err("Only owner can withdraw");
    };

    let ckUSDCCanister = switch (ckUSDCTokenCanister) {
      case (null) { return #err("ckUSDC token canister not set") };
      case (?canister) { canister };
    };

    let ckUSDCLedger : ICRC2Interface = actor (Principal.toText(ckUSDCCanister));

    let transferResult = await ckUSDCLedger.icrc1_transfer({
      from_subaccount = null;
      to = {
        owner = caller;
        subaccount = null;
      };
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });

    switch (transferResult) {
      case (#Ok(blockIndex)) {
        #ok(blockIndex);
      };
      case (#Err(_)) {
        #err("Withdrawal failed");
      };
    };
  };

  // Query functions
  public query func getExchangeRate() : async Nat {
    pulsePerCkUSDC;
  };

  public query func getOwner() : async Principal {
    owner;
  };

  public query func getPulseCanister() : async ?Principal {
    pulseTokenCanister;
  };

  public query func getCkUSDCCanister() : async ?Principal {
    ckUSDCTokenCanister;
  };

  public query func isInitialized() : async Bool {
    initialized;
  };

  public query func getCanisterPrincipal() : async Principal {
    Principal.fromActor(this);
  };

  // Calculate how much PULSE user will receive for given ckUSDC amount (with spread applied)
  public query func calculatePulseAmount(ckUSDCAmount : Nat) : async Nat {
    let baseAmount = ckUSDCAmount * pulsePerCkUSDC;
    (baseAmount * (10_000 - spreadBasisPoints)) / 10_000;
  };

  // Calculate how much ckUSDC user will receive for given PULSE amount (with spread applied)
  public query func calculateCkUSDCAmount(pulseAmount : Nat) : async Nat {
    let baseAmount = pulseAmount / pulsePerCkUSDC;
    (baseAmount * (10_000 - spreadBasisPoints)) / 10_000;
  };

  // Get current spread in basis points
  public query func getSpread() : async Nat {
    spreadBasisPoints;
  };

  // Get PULSE balance of swap canister
  public func getPulseBalance() : async Nat {
    let pulseCanister = switch (pulseTokenCanister) {
      case (null) { return 0 };
      case (?canister) { canister };
    };

    let pulseLedger : ICRC1Interface = actor (Principal.toText(pulseCanister));
    await pulseLedger.icrc1_balance_of({
      owner = Principal.fromActor(this);
      subaccount = null;
    });
  };

  // Get ckUSDC balance of swap canister
  public func getCkUSDCBalance() : async Nat {
    let ckUSDCCanister = switch (ckUSDCTokenCanister) {
      case (null) { return 0 };
      case (?canister) { canister };
    };

    let ckUSDCLedger : ICRC1Interface = actor (Principal.toText(ckUSDCCanister));
    await ckUSDCLedger.icrc1_balance_of({
      owner = Principal.fromActor(this);
      subaccount = null;
    });
  };

  // Get recent swap transactions (returns newest first)
  public query func getSwapHistory(limit: Nat) : async [SwapTransaction] {
    let size = swapHistory.size();
    if (size == 0) {
      return [];
    };

    let actualLimit = if (limit > size) { size } else { limit };
    let startIndex = if (size > actualLimit) { size - actualLimit } else { 0 };

    // Return transactions in reverse order (newest first)
    Array.tabulate<SwapTransaction>(
      actualLimit,
      func(i) = swapHistory[size - 1 - i]
    );
  };
};
