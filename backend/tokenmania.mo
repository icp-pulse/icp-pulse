// Use this token for testing purposes only!
// Please visit https://github.com/dfinity/ICRC-1 to find
// the latest version of the ICP token standards.

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Principal "mo:base/Principal";
import Option "mo:base/Option";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Map "mo:map/Map";
import { phash } "mo:map/Map";
import Iter "mo:base/Iter";

persistent actor class Tokenmania() = this {

  // PULSE Token Maximum Supply: 1 billion tokens
  // With 8 decimals: 1 PULSE = 100_000_000 e8s (smallest units)
  // Max supply = 1,000,000,000 PULSE = 100_000_000_000_000_000 e8s
  // This is enforced by the smart contract - no more tokens can be minted
  private let MAX_SUPPLY : Nat = 100_000_000_000_000_000;

  // Set temporary values for the token.
  // These will be overritten when the token is created.
  var init : {
    initial_mints : [{
      account : { owner : Principal; subaccount : ?Blob };
      amount : Nat;
    }];
    minting_account : { owner : Principal; subaccount : ?Blob };
    token_name : Text;
    token_symbol : Text;
    decimals : Nat8;
    transfer_fee : Nat;
  } = {
    initial_mints = [];
    minting_account = {
      owner = Principal.fromBlob("\04");
      subaccount = null;
    };
    token_name = "";
    token_symbol = "";
    decimals = 0;
    transfer_fee = 0;
  };

  var logo : Text = "";
  var created : Bool = false;

  public query func token_created() : async Bool {
    created;
  };

  public shared ({ caller }) func delete_token() : async Result<Text, Text> {
    if (not created) {
      return #Err("Token not created");
    };

    if (not Principal.equal(caller, init.minting_account.owner)) {
      return #Err("Caller is not the token creator");
    };

    created := false;

    // Reset token details.
    init := {
      initial_mints = [];
      minting_account = {
        owner = Principal.fromBlob("\04");
        subaccount = null;
      };
      token_name = "";
      token_symbol = "";
      decimals = 0;
      transfer_fee = 0;
    };

    // Override the genesis txns.
    log := makeGenesisChain();

    #Ok("Token deleted");
  };

  public shared ({ caller }) func update_logo(new_logo : Text) : async Result<Text, Text> {
    if (not created) {
      return #Err("Token not created");
    };

    if (not Principal.equal(caller, init.minting_account.owner)) {
      return #Err("Only minting account can update logo");
    };

    logo := new_logo;
    #Ok("Logo updated successfully");
  };

  public shared ({ caller }) func create_token({
    token_name : Text;
    token_symbol : Text;
    initial_supply : Nat;
    token_logo : Text;
  }) : async Result<Text, Text> {
    if (created) {
      return #Err("Token already created");
    };

    if (Principal.isAnonymous(caller)) {
      return #Err("Cannot create token with anonymous principal");
    };

    // Validate initial supply doesn't exceed maximum supply cap
    if (initial_supply > MAX_SUPPLY) {
      return #Err("Initial supply cannot exceed maximum supply of 1 billion PULSE tokens");
    };

    // Specify actual token details, set the caller to own some inital amount.
    init := {
      initial_mints = [{
        account = {
          owner = caller;
          subaccount = null;
        };
        amount = initial_supply;
      }];
      minting_account = {
        owner = caller;
        subaccount = null;
      };
      token_name;
      token_symbol;
      // PULSE uses 8 decimals: 100_000_000 e8s = 1.0 PULSE (displayed to users)
      decimals = 8;
      // Transfer fee: 10_000 e8s = 0.0001 PULSE (displayed to users)
      transfer_fee = 10_000;
    };

    // Set the token logo.
    logo := token_logo;

    // Override the genesis chain with new minter and initial mints.
    log := makeGenesisChain();

    created := true;

    #Ok("Token created");
  };

  // From here on, we use the reference implementation of the ICRC Ledger
  // canister from https://github.com/dfinity/ICRC-1/blob/main/ref/ICRC1.mo,
  // except where we add the token logo to the metadata.

  public type Account = { owner : Principal; subaccount : ?Subaccount };
  public type Subaccount = Blob;
  public type Tokens = Nat;
  public type Memo = Blob;
  public type Timestamp = Nat64;
  public type Duration = Nat64;
  public type TxIndex = Nat;
  public type TxLog = Buffer.Buffer<Transaction>;

  public type Value = { #Nat : Nat; #Int : Int; #Blob : Blob; #Text : Text };

  transient let maxMemoSize = 32;
  transient let permittedDriftNanos : Duration = 60_000_000_000;
  transient let transactionWindowNanos : Duration = 24 * 60 * 60 * 1_000_000_000;
  transient let defaultSubaccount : Subaccount = Blob.fromArrayMut(Array.init(32, 0 : Nat8));

  public type Operation = {
    #Approve : Approve;
    #Transfer : Transfer;
    #Burn : Transfer;
    #Mint : Transfer;
  };

  public type CommonFields = {
    memo : ?Memo;
    fee : ?Tokens;
    created_at_time : ?Timestamp;
  };

  public type Approve = CommonFields and {
    from : Account;
    spender : Account;
    amount : Nat;
    expires_at : ?Nat64;
  };

  public type TransferSource = {
    #Init;
    #Icrc1Transfer;
    #Icrc2TransferFrom;
  };

  public type Transfer = CommonFields and {
    spender : Account;
    source : TransferSource;
    to : Account;
    from : Account;
    amount : Tokens;
  };

  public type Allowance = { allowance : Nat; expires_at : ?Nat64 };

  public type Transaction = {
    operation : Operation;
    // Effective fee for this transaction.
    fee : Tokens;
    timestamp : Timestamp;
  };

  public type DeduplicationError = {
    #TooOld;
    #Duplicate : { duplicate_of : TxIndex };
    #CreatedInFuture : { ledger_time : Timestamp };
  };

  public type CommonError = {
    #InsufficientFunds : { balance : Tokens };
    #BadFee : { expected_fee : Tokens };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferError = DeduplicationError or CommonError or {
    #BadBurn : { min_burn_amount : Tokens };
  };

  public type ApproveError = DeduplicationError or CommonError or {
    #Expired : { ledger_time : Nat64 };
    #AllowanceChanged : { current_allowance : Nat };
  };

  public type TransferFromError = TransferError or {
    #InsufficientAllowance : { allowance : Nat };
  };

  public type Result<T, E> = { #Ok : T; #Err : E };

  // Checks whether two accounts are semantically equal.
  func accountsEqual(lhs : Account, rhs : Account) : Bool {
    let lhsSubaccount = Option.get(lhs.subaccount, defaultSubaccount);
    let rhsSubaccount = Option.get(rhs.subaccount, defaultSubaccount);

    Principal.equal(lhs.owner, rhs.owner) and Blob.equal(
      lhsSubaccount,
      rhsSubaccount,
    );
  };

  // Computes the balance of the specified account.
  func balance(account : Account, log : TxLog) : Nat {
    var sum = 0;
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Burn(args)) {
          if (accountsEqual(args.from, account)) { sum -= args.amount };
        };
        case (#Mint(args)) {
          if (accountsEqual(args.to, account)) { sum += args.amount };
        };
        case (#Transfer(args)) {
          if (accountsEqual(args.from, account)) {
            sum -= args.amount + tx.fee;
          };
          if (accountsEqual(args.to, account)) { sum += args.amount };
        };
        case (#Approve(args)) {
          if (accountsEqual(args.from, account)) { sum -= tx.fee };
        };
      };
    };
    sum;
  };

  // Computes the total token supply.
  func totalSupply(log : TxLog) : Tokens {
    var total = 0;
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Burn(args)) { total -= args.amount };
        case (#Mint(args)) { total += args.amount };
        case (#Transfer(_)) { total -= tx.fee };
        case (#Approve(_)) { total -= tx.fee };
      };
    };
    total;
  };

  // Finds a transaction in the transaction log.
  func findTransfer(transfer : Transfer, log : TxLog) : ?TxIndex {
    var i = 0;
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Burn(args)) { if (args == transfer) { return ?i } };
        case (#Mint(args)) { if (args == transfer) { return ?i } };
        case (#Transfer(args)) { if (args == transfer) { return ?i } };
        case (_) {};
      };
      i += 1;
    };
    null;
  };

  // Finds an approval in the transaction log.
  func findApproval(approval : Approve, log : TxLog) : ?TxIndex {
    var i = 0;
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Approve(args)) { if (args == approval) { return ?i } };
        case (_) {};
      };
      i += 1;
    };
    null;
  };

  // Computes allowance of the spender for the specified account.
  func allowance(account : Account, spender : Account, now : Nat64) : Allowance {
    var allowance : Nat = 0;
    var lastApprovalTs : ?Nat64 = null;

    for (tx in log.vals()) {
      // Reset expired approvals, if any.
      switch (lastApprovalTs) {
        case (?expires_at) {
          if (expires_at < tx.timestamp) {
            allowance := 0;
            lastApprovalTs := null;
          };
        };
        case (null) {};
      };
      // Add pending approvals.
      switch (tx.operation) {
        case (#Approve(args)) {
          if (args.from == account and args.spender == spender) {
            allowance := args.amount;
            lastApprovalTs := args.expires_at;
          };
        };
        case (#Transfer(args)) {
          if (args.from == account and args.spender == spender) {
            // Deduct the amount + fee from allowance if there's enough
            // Don't assert here as this is recalculating historical state
            let required = args.amount + tx.fee;
            if (allowance >= required) {
              allowance -= required;
            } else {
              // If allowance is insufficient, this shouldn't trap during query
              // Just set allowance to 0 as the transfer already happened
              allowance := 0;
            };
          };
        };
        case (_) {};
      };
    };

    switch (lastApprovalTs) {
      case (?expires_at) {
        if (expires_at < now) { { allowance = 0; expires_at = null } } else {
          {
            allowance = Int.abs(allowance);
            expires_at = ?expires_at;
          };
        };
      };
      case (null) { { allowance = allowance; expires_at = null } };
    };
  };

  // Constructs the transaction log corresponding to the init argument.
  func makeGenesisChain() : TxLog {
    validateSubaccount(init.minting_account.subaccount);

    let now = Nat64.fromNat(Int.abs(Time.now()));
    let log = Buffer.Buffer<Transaction>(100);
    for ({ account; amount } in Array.vals(init.initial_mints)) {
      validateSubaccount(account.subaccount);
      let tx : Transaction = {
        operation = #Mint({
          spender = init.minting_account;
          source = #Init;
          from = init.minting_account;
          to = account;
          amount = amount;
          fee = null;
          memo = null;
          created_at_time = ?now;
        });
        fee = 0;
        timestamp = now;
      };
      log.add(tx);
    };
    log;
  };

  // Traps if the specified blob is not a valid subaccount.
  func validateSubaccount(s : ?Subaccount) {
    let subaccount = Option.get(s, defaultSubaccount);
    assert (subaccount.size() == 32);
  };

  func validateMemo(m : ?Memo) {
    switch (m) {
      case (null) {};
      case (?memo) { assert (memo.size() <= maxMemoSize) };
    };
  };

  func checkTxTime(created_at_time : ?Timestamp, now : Timestamp) : Result<(), DeduplicationError> {
    let txTime : Timestamp = Option.get(created_at_time, now);

    if ((txTime > now) and (txTime - now > permittedDriftNanos)) {
      return #Err(#CreatedInFuture { ledger_time = now });
    };

    if ((txTime < now) and (now - txTime > transactionWindowNanos + permittedDriftNanos)) {
      return #Err(#TooOld);
    };

    #Ok(());
  };

  // The list of all transactions.
  transient var log : TxLog = makeGenesisChain();

  // The stable representation of the transaction log.
  // Used only during upgrades.
  var persistedLog : [Transaction] = [];

  // ========== BALANCE CACHE FOR OPTIMIZED HOLDER QUERIES ==========
  // Maintains real-time balance for each principal to avoid log scanning
  transient var balanceCache = Map.new<Principal, Nat>();

  // Stable storage for balance cache (persists across upgrades)
  var stableBalanceCache : [(Principal, Nat)] = [];

  // Flag to track if cache has been initialized from log
  var cacheInitialized : Bool = false;

  system func preupgrade() {
    persistedLog := Buffer.toArray(log);
    stableBalanceCache := Iter.toArray(Map.entries(balanceCache));
  };

  system func postupgrade() {
    log := Buffer.Buffer(persistedLog.size());
    for (tx in Array.vals(persistedLog)) {
      log.add(tx);
    };

    // Restore balance cache from stable storage
    for ((principal, bal) in stableBalanceCache.vals()) {
      Map.set(balanceCache, phash, principal, bal);
    };

    // If cache is empty but log has transactions, initialize cache from log
    if (Map.size(balanceCache) == 0 and log.size() > 0) {
      initializeBalanceCache();
    };
    cacheInitialized := true;
  };

  // Helper function to update balance in cache
  private func updateBalanceCache(principal : Principal, delta : Int) {
    let currentBalance = switch (Map.get(balanceCache, phash, principal)) {
      case (?bal) { bal };
      case null { 0 };
    };

    let newBalance = if (delta >= 0) {
      currentBalance + Int.abs(delta)
    } else {
      let absDelta = Int.abs(delta);
      if (currentBalance >= absDelta) {
        currentBalance - absDelta
      } else {
        0 // Should not happen in correct implementation
      }
    };

    if (newBalance > 0) {
      Map.set(balanceCache, phash, principal, newBalance);
    } else {
      // Remove from map if balance is zero to save memory
      ignore Map.remove(balanceCache, phash, principal);
    };
  };

  // Initialize balance cache from transaction log (one-time migration)
  private func initializeBalanceCache() {
    // Clear existing cache
    balanceCache := Map.new<Principal, Nat>();

    // Collect all unique principals
    let principals = Buffer.Buffer<Principal>(100);
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Mint(args)) {
          if (not hasPrincipal(principals, args.to.owner)) {
            principals.add(args.to.owner);
          };
        };
        case (#Transfer(args)) {
          if (not hasPrincipal(principals, args.from.owner)) {
            principals.add(args.from.owner);
          };
          if (not hasPrincipal(principals, args.to.owner)) {
            principals.add(args.to.owner);
          };
        };
        case (#Burn(args)) {
          if (not hasPrincipal(principals, args.from.owner)) {
            principals.add(args.from.owner);
          };
        };
        case (#Approve(args)) {
          if (not hasPrincipal(principals, args.from.owner)) {
            principals.add(args.from.owner);
          };
        };
      };
    };

    // Calculate and cache balance for each principal
    for (principal in principals.vals()) {
      let bal = balance({ owner = principal; subaccount = null }, log);
      if (bal > 0) {
        Map.set(balanceCache, phash, principal, bal);
      };
    };
  };

  func recordTransaction(tx : Transaction) : TxIndex {
    let idx = log.size();
    log.add(tx);

    // Update balance cache based on transaction type
    switch (tx.operation) {
      case (#Mint(args)) {
        updateBalanceCache(args.to.owner, Int.abs(args.amount));
      };
      case (#Transfer(args)) {
        updateBalanceCache(args.from.owner, -Int.abs(args.amount + tx.fee));
        updateBalanceCache(args.to.owner, Int.abs(args.amount));
      };
      case (#Burn(args)) {
        updateBalanceCache(args.from.owner, -Int.abs(args.amount));
      };
      case (#Approve(args)) {
        if (tx.fee > 0) {
          updateBalanceCache(args.from.owner, -Int.abs(tx.fee));
        };
      };
    };

    idx;
  };

  func classifyTransfer(log : TxLog, transfer : Transfer) : Result<(Operation, Tokens), TransferError> {
    let minter = init.minting_account;

    if (Option.isSome(transfer.created_at_time)) {
      switch (findTransfer(transfer, log)) {
        case (?txid) { return #Err(#Duplicate { duplicate_of = txid }) };
        case null {};
      };
    };

    let result = if (accountsEqual(transfer.from, minter)) {
      // Enforce maximum supply cap
      let currentSupply = totalSupply(log);
      if (currentSupply + transfer.amount > MAX_SUPPLY) {
        return #Err(#GenericError {
          error_code = 1001;
          message = "Minting would exceed maximum supply"
        });
      };

      if (Option.get(transfer.fee, 0) != 0) {
        return #Err(#BadFee { expected_fee = 0 });
      };
      (#Mint(transfer), 0);
    } else if (accountsEqual(transfer.to, minter)) {
      if (Option.get(transfer.fee, 0) != 0) {
        return #Err(#BadFee { expected_fee = 0 });
      };

      if (transfer.amount < init.transfer_fee) {
        return #Err(#BadBurn { min_burn_amount = init.transfer_fee });
      };

      let debitBalance = balance(transfer.from, log);
      if (debitBalance < transfer.amount) {
        return #Err(#InsufficientFunds { balance = debitBalance });
      };

      (#Burn(transfer), 0);
    } else {
      let effectiveFee = init.transfer_fee;
      if (Option.get(transfer.fee, effectiveFee) != effectiveFee) {
        return #Err(#BadFee { expected_fee = init.transfer_fee });
      };

      let debitBalance = balance(transfer.from, log);
      if (debitBalance < transfer.amount + effectiveFee) {
        return #Err(#InsufficientFunds { balance = debitBalance });
      };

      (#Transfer(transfer), effectiveFee);
    };
    #Ok(result);
  };

  func applyTransfer(args : Transfer) : Result<TxIndex, TransferError> {
    validateSubaccount(args.from.subaccount);
    validateSubaccount(args.to.subaccount);
    validateMemo(args.memo);

    let now = Nat64.fromNat(Int.abs(Time.now()));

    switch (checkTxTime(args.created_at_time, now)) {
      case (#Ok(_)) {};
      case (#Err(e)) { return #Err(e) };
    };

    switch (classifyTransfer(log, args)) {
      case (#Ok((operation, effectiveFee))) {
        #Ok(recordTransaction({ operation = operation; fee = effectiveFee; timestamp = now }));
      };
      case (#Err(e)) { #Err(e) };
    };
  };

  func overflowOk(x : Nat) : Nat {
    x;
  };

  public shared ({ caller }) func icrc1_transfer({
    from_subaccount : ?Subaccount;
    to : Account;
    amount : Tokens;
    fee : ?Tokens;
    memo : ?Memo;
    created_at_time : ?Timestamp;
  }) : async Result<TxIndex, TransferError> {
    let from = {
      owner = caller;
      subaccount = from_subaccount;
    };
    applyTransfer({
      spender = from;
      source = #Icrc1Transfer;
      from = from;
      to = to;
      amount = amount;
      fee = fee;
      memo = memo;
      created_at_time = created_at_time;
    });
  };

  public query func icrc1_balance_of(account : Account) : async Tokens {
    balance(account, log);
  };

  public query func icrc1_total_supply() : async Tokens {
    totalSupply(log);
  };

  // Returns the maximum supply cap for PULSE tokens
  // 1 billion PULSE = 100_000_000_000_000_000 e8s (with 8 decimals)
  public query func icrc1_max_supply() : async Tokens {
    MAX_SUPPLY;
  };

  // Admin function to burn tokens from minting account
  // This is needed because standard burns (transfer TO minting account)
  // don't work when the minting account itself is the caller
  public shared ({ caller }) func burn_from_minting_account(amount : Nat) : async Result<TxIndex, Text> {
    if (not Principal.equal(caller, init.minting_account.owner)) {
      return #Err("Only minting account can burn its own tokens");
    };

    let mintingBalance = balance(init.minting_account, log);
    if (mintingBalance < amount) {
      return #Err("Insufficient balance in minting account");
    };

    // Create a burn transaction
    let now = Nat64.fromNat(Int.abs(Time.now()));
    let burnTx : Transaction = {
      operation = #Burn({
        spender = init.minting_account;
        source = #Icrc1Transfer;
        from = init.minting_account;
        to = init.minting_account;
        amount = amount;
        fee = null;
        memo = null;
        created_at_time = ?now;
      });
      fee = 0;
      timestamp = now;
    };

    let txid = recordTransaction(burnTx);
    #Ok(txid);
  };

  public query func icrc1_minting_account() : async ?Account {
    ?init.minting_account;
  };

  public query func icrc1_name() : async Text {
    init.token_name;
  };

  public query func icrc1_symbol() : async Text {
    init.token_symbol;
  };

  public query func icrc1_decimals() : async Nat8 {
    init.decimals;
  };

  public query func icrc1_fee() : async Nat {
    init.transfer_fee;
  };

  public query func icrc1_metadata() : async [(Text, Value)] {
    [
      ("icrc1:name", #Text(init.token_name)),
      ("icrc1:symbol", #Text(init.token_symbol)),
      ("icrc1:decimals", #Nat(Nat8.toNat(init.decimals))),
      ("icrc1:fee", #Nat(init.transfer_fee)),
      ("icrc1:logo", #Text(logo)), /* Here we add the token logo to the metadata. */
    ];
  };

  public query func icrc1_supported_standards() : async [{
    name : Text;
    url : Text;
  }] {
    [
      {
        name = "ICRC-1";
        url = "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1";
      },
      {
        name = "ICRC-2";
        url = "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-2";
      },
    ];
  };

  public shared ({ caller }) func icrc2_approve({
    from_subaccount : ?Subaccount;
    spender : Account;
    amount : Nat;
    expires_at : ?Nat64;
    expected_allowance : ?Nat;
    memo : ?Memo;
    fee : ?Tokens;
    created_at_time : ?Timestamp;
  }) : async Result<TxIndex, ApproveError> {
    validateSubaccount(from_subaccount);
    validateMemo(memo);

    let now = Nat64.fromNat(Int.abs(Time.now()));

    switch (checkTxTime(created_at_time, now)) {
      case (#Ok(_)) {};
      case (#Err(e)) { return #Err(e) };
    };

    let approverAccount = { owner = caller; subaccount = from_subaccount };
    let approval = {
      from = approverAccount;
      spender = spender;
      amount = amount;
      expires_at = expires_at;
      fee = fee;
      created_at_time = created_at_time;
      memo = memo;
    };

    if (Option.isSome(created_at_time)) {
      switch (findApproval(approval, log)) {
        case (?txid) { return #Err(#Duplicate { duplicate_of = txid }) };
        case (null) {};
      };
    };

    switch (expires_at) {
      case (?expires_at) {
        if (expires_at < now) { return #Err(#Expired { ledger_time = now }) };
      };
      case (null) {};
    };

    let effectiveFee = init.transfer_fee;

    if (Option.get(fee, effectiveFee) != effectiveFee) {
      return #Err(#BadFee({ expected_fee = effectiveFee }));
    };

    switch (expected_allowance) {
      case (?expected_allowance) {
        let currentAllowance = allowance(approverAccount, spender, now);
        if (currentAllowance.allowance != expected_allowance) {
          return #Err(#AllowanceChanged({ current_allowance = currentAllowance.allowance }));
        };
      };
      case (null) {};
    };

    let approverBalance = balance(approverAccount, log);
    if (approverBalance < init.transfer_fee) {
      return #Err(#InsufficientFunds { balance = approverBalance });
    };

    let txid = recordTransaction({
      operation = #Approve(approval);
      fee = effectiveFee;
      timestamp = now;
    });

    assert (balance(approverAccount, log) == overflowOk(approverBalance - effectiveFee));

    #Ok(txid);
  };

  public shared ({ caller }) func icrc2_transfer_from({
    spender_subaccount : ?Subaccount;
    from : Account;
    to : Account;
    amount : Tokens;
    fee : ?Tokens;
    memo : ?Memo;
    created_at_time : ?Timestamp;
  }) : async Result<TxIndex, TransferFromError> {
    validateSubaccount(spender_subaccount);
    validateSubaccount(from.subaccount);
    validateSubaccount(to.subaccount);
    validateMemo(memo);

    let spender = { owner = caller; subaccount = spender_subaccount };
    let transfer : Transfer = {
      spender = spender;
      source = #Icrc2TransferFrom;
      from = from;
      to = to;
      amount = amount;
      fee = fee;
      memo = memo;
      created_at_time = created_at_time;
    };

    if (caller == from.owner) {
      return applyTransfer(transfer);
    };

    let now = Nat64.fromNat(Int.abs(Time.now()));

    switch (checkTxTime(created_at_time, now)) {
      case (#Ok(_)) {};
      case (#Err(e)) { return #Err(e) };
    };

    let (operation, effectiveFee) = switch (classifyTransfer(log, transfer)) {
      case (#Ok(result)) { result };
      case (#Err(err)) { return #Err(err) };
    };

    let preTransferAllowance = allowance(from, spender, now);
    if (preTransferAllowance.allowance < amount + effectiveFee) {
      return #Err(#InsufficientAllowance { allowance = preTransferAllowance.allowance });
    };

    let txid = recordTransaction({
      operation = operation;
      fee = effectiveFee;
      timestamp = now;
    });

    let postTransferAllowance = allowance(from, spender, now);
    assert (postTransferAllowance.allowance == overflowOk(preTransferAllowance.allowance - (amount + effectiveFee)));

    #Ok(txid);
  };

  public query func icrc2_allowance({ account : Account; spender : Account }) : async Allowance {
    allowance(account, spender, Nat64.fromNat(Int.abs(Time.now())));
  };

  // ========== TRANSACTION HISTORY QUERIES ==========

  // Get total number of transactions in the ledger
  public query func get_transaction_count() : async Nat {
    log.size();
  };

  // Get a specific transaction by index
  public query func get_transaction(index : TxIndex) : async ?Transaction {
    if (index < log.size()) {
      ?log.get(index);
    } else {
      null;
    };
  };

  // Get a range of transactions (for pagination)
  // Returns transactions from start_index up to (but not including) end_index
  public query func get_transactions(start_index : Nat, length : Nat) : async [Transaction] {
    let end_index = Nat.min(start_index + length, log.size());
    let result = Buffer.Buffer<Transaction>(length);

    var i = start_index;
    while (i < end_index) {
      result.add(log.get(i));
      i += 1;
    };

    Buffer.toArray(result);
  };

  // Get all unique token holders using the balance cache
  // Returns an array of (Principal, Balance) tuples
  // This is now O(m) where m is the number of holders, instead of O(n*m)
  public query func get_all_holders() : async [(Principal, Nat)] {
    // Return all entries from balance cache (only holders with balance > 0)
    Iter.toArray(Map.entries(balanceCache))
  };

  // Get the total number of token holders (holders with balance > 0)
  public query func get_holder_count() : async Nat {
    Map.size(balanceCache)
  };

  // Admin function to manually initialize/rebuild the balance cache
  // Useful for existing deployments or to fix cache inconsistencies
  public shared ({ caller }) func rebuild_balance_cache() : async Result<Text, Text> {
    if (not Principal.equal(caller, init.minting_account.owner)) {
      return #Err("Only minting account owner can rebuild cache");
    };

    initializeBalanceCache();
    cacheInitialized := true;
    #Ok("Balance cache rebuilt successfully with " # Nat.toText(Map.size(balanceCache)) # " holders")
  };

  // Helper function to check if principal already in list
  private func hasPrincipal(list : Buffer.Buffer<Principal>, p : Principal) : Bool {
    for (item in list.vals()) {
      if (Principal.equal(item, p)) {
        return true;
      };
    };
    false;
  };
};
