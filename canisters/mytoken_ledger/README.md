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

## Configuration

The ledger initialization parameters are defined in `init.json`:

- **Token Name:** TruePulse Token
- **Symbol:** TPULSE  
- **Decimals:** 8 (100,000,000 base units = 1 TPULSE)
- **Transfer Fee:** 1,000 base units (0.00001 TPULSE)
- **Initial Supply:** 1,000 TPULSE (to initial owner)
- **Features:** ICRC-2 allowances enabled

### Setup Principals

Before deployment, update the principal placeholders:

```bash
cd canisters/mytoken_ledger
./setup-principals.sh <controller_principal> <initial_owner_principal>
```

Or manually edit `init.json` to replace:
- `<CONTROLLER_PRINCIPAL>` - Principal that controls the ledger
- `<YOUR_PRINCIPAL>` - Principal that receives initial token supply

### ICRC-2 Approval Support

The ledger supports ICRC-2 standard for approve/allowance functionality, which enables:
- **`icrc2_approve`** - Grant spending allowances to other accounts
- **`icrc2_transfer_from`** - Transfer tokens on behalf of another account (with allowance)
- **`icrc2_allowance`** - Query current allowance between accounts

**Current Status:** ICRC-2 is **enabled** by default in the configuration.

**To toggle ICRC-2 support:**

1. **Enable ICRC-2** (current setting):
   ```json
   "feature_flags": {
     "icrc2": true
   }
   ```

2. **Disable ICRC-2**:
   ```json
   "feature_flags": {
     "icrc2": false
   }
   ```

**Note:** ICRC-2 functionality is essential for the funding hub canister integration, as it uses `icrc2_transfer_from` to pull tokens from contributors with their approval.

## Deployment

Deploy using the npm script:

```bash
npm run ic:deploy:token
```

Or directly with dfx:

```bash
dfx deploy mytoken_ledger --argument-file canisters/mytoken_ledger/init.json
```

## Documentation

For comprehensive documentation, see:
- [ICRC-1 Standard](https://github.com/dfinity/ICRC-1)
- [IC Ledger Documentation](https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/)
- [Upstream README](https://github.com/dfinity/ic/blob/master/rs/ledger_suite/icrc1/ledger/README.adoc)