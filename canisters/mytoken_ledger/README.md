# ICRC-1 Token Ledger

This directory contains the ICRC-1 reference ledger implementation vendored from the official DFINITY IC repository.

## Upstream Source

**Repository:** [dfinity/ic](https://github.com/dfinity/ic)  
**Path:** `rs/ledger_suite/icrc1/ledger/`  
**Last Updated:** September 2025  
**Reference Commit:** Latest from `master` branch  

## Implementation Details

- **Language:** Rust
- **Type:** Custom canister with Rust implementation
- **Standards Supported:**
  - ICRC-1: Basic token functionality
  - ICRC-2: Approve and transfer from
  - ICRC-3: Block indexing and archives
  - ICRC-10: Supported standards query
  - ICRC-21: Consent messages
  - ICRC-103: Index canister management
  - ICRC-106: Archive controller management

## Key Features

- **Token Operations:** Transfer, approve, allowance management
- **State Management:** Stable memory storage for balances, allowances, and blocks
- **Archiving:** Automatic block archiving when transaction history grows
- **Certification:** Cryptographic verification of ledger state
- **Upgrades:** Support for ledger migration and version updates
- **Metrics:** Comprehensive logging and performance monitoring

## Files

- `Cargo.toml` - Rust project configuration and dependencies
- `build.rs` - Build script for WASM compilation
- `ledger.did` - Candid interface definition
- `src/main.rs` - Main canister entry point
- `src/lib.rs` - Core ledger implementation

## Production Usage

**⚠️ Important:** The files in this directory are placeholders that reference the upstream implementation. For production use:

1. **Download complete sources** from the upstream repository:
   ```bash
   git clone https://github.com/dfinity/ic.git
   cp -r ic/rs/ledger_suite/icrc1/ledger/* canisters/mytoken_ledger/
   ```

2. **Set up dependencies** - The ledger requires several IC-specific dependencies that are part of the IC monorepo

3. **Configure build environment** - Ensure you have the IC SDK and Rust toolchain properly configured

4. **Update dependencies** - Adjust the dependency paths in `Cargo.toml` to match your project structure

## Deployment

The ledger can be deployed as a custom canister using dfx:

```bash
dfx deploy mytoken_ledger --argument '(variant { Init = record {
  token_name = "My Token";
  token_symbol = "MTK";
  minting_account = record { owner = principal "your-principal-here" };
  transfer_fee = 10000;
  metadata = vec {};
  initial_balances = vec {};
  archive_options = record {
    trigger_threshold = 2000;
    num_blocks_to_archive = 1000;
    controller_id = principal "your-principal-here";
  };
}})'
```

## Documentation

For comprehensive documentation, see:
- [ICRC-1 Standard](https://github.com/dfinity/ICRC-1)
- [IC Ledger Documentation](https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/)
- [Upstream README](https://github.com/dfinity/ic/blob/master/rs/ledger_suite/icrc1/ledger/README.adoc)