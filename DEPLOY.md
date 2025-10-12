# ICP Pulse Platform - Mainnet Deployment Guide

This guide walks through deploying the ICP Pulse platform (Polls, Surveys, Token Economics, Staking, and Airdrop) to the Internet Computer Protocol (ICP) mainnet.

## Prerequisites

### 1. Install Required Tools

```bash
# Install DFX (Internet Computer SDK)
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Install Node.js and npm (if not already installed)
# Recommended: Node.js 18+ and npm 8+

# Install Mops (Motoko package manager)
npm install -g ic-mops
```

### 2. Verify Installation

```bash
# Check DFX version
dfx --version

# Check Node.js version
node --version

# Check npm version
npm --version

# Check mops version
mops --version
```

## Pre-Deployment Setup

### 1. Identity Management

```bash
# Create a new identity for mainnet deployment (if needed)
dfx identity new icp-pulse-mainnet-deploy

# Use the deployment identity
dfx identity use icp-pulse-mainnet-deploy

# Get your principal ID
dfx identity get-principal

# Check your identity's cycles balance
dfx cycles --network ic balance
```

### 2. Acquire Cycles

You'll need cycles to deploy and run your canister on mainnet. Options:

#### Option A: Convert ICP to Cycles
```bash
# Check your ICP balance first
dfx ledger --network ic balance

# Convert ICP to cycles (replace AMOUNT with actual ICP amount)
dfx ledger --network ic create-canister --amount AMOUNT
```

#### Option B: Use Cycles Faucet (for testing)
- Visit the [cycles faucet](https://faucet.dfinity.org/) if available for your region

### 3. Project Configuration

#### Update `dfx.json` for mainnet deployment:

```json
{
  "canisters": {
    "polls_surveys_backend": {
      "main": "backend/polls_surveys_backend.mo",
      "type": "motoko",
      "args": "--enhanced-orthogonal-persistence"
    },
    "polls_surveys_frontend": {
      "type": "assets",
      "source": ["frontend/dist/"]
    },
    "tokenmania": {
      "main": "backend/tokenmania.mo",
      "type": "motoko",
      "args": "--enhanced-orthogonal-persistence"
    },
  },
  "networks": {
    "local": {
      "bind": "127.0.0.1:4943",
      "type": "ephemeral"
    },
    "ic": {
      "providers": ["https://ic0.app"],
      "type": "persistent"
    }
  },
  "output_env_file": ".env",
  "defaults": {
    "build": {
      "packtool": "mops sources"
    }
  }
}
```

### 4. Environment Setup

#### Frontend Environment Variables
Create `frontend/.env.production`:

```bash
# Production environment variables
DFX_NETWORK=ic
NEXT_PUBLIC_DFX_NETWORK=ic
# Canister IDs will be populated after deployment
NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID=
POLLS_SURVEYS_BACKEND_CANISTER_ID=
```

## Platform Architecture

### Canister Overview

The ICP Pulse platform consists of 7 canisters working together:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Canister                          │
│              (Next.js Application Assets)                       │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├──────────────────────────────────────────────────┐
             │                                                  │
             ▼                                                  ▼
┌────────────────────────────┐              ┌─────────────────────────┐
│  polls_surveys_backend     │              │   Token Ecosystem       │
│  - Polls                   │              │                         │
│  - Surveys                 │              │  ┌──────────────────┐  │
│  - Voting                  │              │  │  tokenmania      │  │
│  - Quest triggers  ────────┼──────────────┼─▶│  (PULSE Token)   │  │
└────────────────────────────┘              │  └──────────────────┘  │
                                            │                         │
             ┌──────────────────────────────┤  ┌──────────────────┐  │
             │                              │  │  pulseg          │  │
             ▼                              │  │  (PULSEG Token)  │  │
┌────────────────────────────┐              │  └────────▲─────────┘  │
│      airdrop               │              │           │             │
│  - Quest system            │              │           │ mints       │
│  - Points tracking         │◀─────────────┤  ┌────────┴─────────┐  │
│  - Reward distribution     │              │  │  staking         │  │
└────────────────────────────┘              │  │  - Stake PULSE   │  │
                                            │  │  - Earn PULSEG   │  │
             ┌──────────────────────────────┤  └──────────────────┘  │
             │                              │                         │
             ▼                              │  ┌──────────────────┐  │
┌────────────────────────────┐              │  │  swap            │  │
│      External              │              │  │  - ckUSDC↔PULSE  │  │
│  - ckUSDC Token (mainnet)  │◀─────────────┴──┤  - Liquidity     │  │
└────────────────────────────┘                 └──────────────────┘  │
                                            └─────────────────────────┘
```

### Canister Dependencies

**Deployment Order is Critical:**

1. **polls_surveys_backend** - No dependencies (deploy first)
2. **tokenmania** - No dependencies (deploy second)
3. **pulseg** - Needs staking canister ID (deploy container, initialize after staking)
4. **staking** - Needs tokenmania & pulseg IDs
5. **airdrop** - Needs tokenmania & polls_surveys_backend IDs
6. **swap** - Needs tokenmania & ckUSDC IDs
7. **frontend** - Needs all backend canister IDs

### Key Features by Canister

#### polls_surveys_backend
- Create and manage polls/surveys
- Vote and submit responses
- Track user activity
- Trigger quest progress updates → airdrop canister

#### tokenmania (PULSE Token)
- ICRC-1 compliant utility token
- Used for platform rewards
- Stakeable for PULSEG
- Swappable with ckUSDC

#### pulseg (PULSEG Token)
- ICRC-1/ICRC-2 compliant governance token
- Minted by staking canister
- Used for governance voting
- Non-transferable initially

#### staking
- Stake PULSE to earn PULSEG
- Multiple lock periods (Flexible, 30d, 90d, 1yr)
- Variable APY based on lock period (5%-50%)
- Auto-claim rewards

#### airdrop
- Quest system with points-based rewards
- Proportional PULSE distribution
- Campaign management
- Activity tracking

#### swap
- Exchange ckUSDC for PULSE
- Fixed exchange rate (10,000 PULSE = 1 ckUSDC)
- Requires ICRC-2 approval
- Liquidity management

## Backend Deployment Steps

### Overview

The ICP Pulse platform consists of 6 backend canisters that must be deployed in a specific order due to dependencies:

1. **polls_surveys_backend** - Core platform for polls and surveys
2. **tokenmania** - PULSE token (ICRC-1 compliant utility token)
3. **pulseg** - PULSEG governance token (ICRC-1/ICRC-2 compliant)
4. **staking** - Staking canister (stake PULSE to earn PULSEG)
5. **airdrop** - Airdrop & quest system with points-based rewards
6. **swap** - Token swap (ckUSDC → PULSE)

### 1. Install Dependencies

```bash
# Install Motoko dependencies
mops install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Deploy Core Platform Canister

```bash
# Set network to mainnet (only needed once per session)
dfx start --clean --background --network ic

# Deploy polls_surveys_backend
dfx deploy polls_surveys_backend --network ic --with-cycles 2000000000000

# Get the canister ID (save this for later)
export BACKEND_CANISTER_ID=$(dfx canister --network ic id polls_surveys_backend)
echo "Backend Canister: $BACKEND_CANISTER_ID"

# Verify deployment
dfx canister --network ic status polls_surveys_backend
```

### 3. Deploy PULSE Token (tokenmania)

```bash
# Deploy PULSE token canister
dfx deploy tokenmania --network ic --with-cycles 1000000000000

# Get canister ID
export PULSE_CANISTER_ID=$(dfx canister --network ic id tokenmania)
echo "PULSE Token Canister: $PULSE_CANISTER_ID"

# Initialize PULSE token
# Replace YOUR_PRINCIPAL with your principal ID
YOUR_PRINCIPAL=$(dfx identity get-principal)
dfx canister --network ic call tokenmania initialize_token \
  '(100_000_000_000_000_000 : nat, "https://example.com/pulse-logo.png")'

# Verify token created
dfx canister --network ic call tokenmania token_created
```

### 4. Deploy PULSEG Governance Token

```bash
# Deploy PULSEG token canister
dfx deploy pulseg --network ic --with-cycles 1000000000000

# Get canister ID
export PULSEG_CANISTER_ID=$(dfx canister --network ic id pulseg)
echo "PULSEG Token Canister: $PULSEG_CANISTER_ID"

# Get staking canister ID (will deploy next, but need to plan ahead)
# For now, use a placeholder - you'll update this after deploying staking
```

### 5. Deploy Staking Canister

```bash
# Deploy staking canister
dfx deploy staking --network ic --with-cycles 1500000000000

# Get canister ID
export STAKING_CANISTER_ID=$(dfx canister --network ic id staking)
echo "Staking Canister: $STAKING_CANISTER_ID"

# Initialize staking canister with PULSE and PULSEG token canisters
dfx canister --network ic call staking initialize \
  "(principal \"$PULSE_CANISTER_ID\", principal \"$PULSEG_CANISTER_ID\")"

# Verify initialization
dfx canister --network ic call staking is_initialized
```

### 6. Configure PULSEG Token Authorization

```bash
# Now initialize PULSEG token with staking canister as authorized minter
dfx canister --network ic call pulseg initialize_token \
  "(10_000_000_000_000 : nat, \"https://example.com/pulseg-logo.png\", principal \"$STAKING_CANISTER_ID\")"

# Verify PULSEG token created
dfx canister --network ic call pulseg token_created

# Verify authorized minters
dfx canister --network ic call pulseg get_authorized_minters
```

### 7. Deploy Airdrop Canister

```bash
# Deploy airdrop canister
dfx deploy airdrop --network ic --with-cycles 1500000000000

# Get canister ID
export AIRDROP_CANISTER_ID=$(dfx canister --network ic id airdrop)
echo "Airdrop Canister: $AIRDROP_CANISTER_ID"

# Initialize airdrop canister with PULSE token and backend canisters
dfx canister --network ic call airdrop initialize \
  "(principal \"$PULSE_CANISTER_ID\", principal \"$BACKEND_CANISTER_ID\")"

# Verify initialization
dfx canister --network ic call airdrop is_initialized
```

### 8. Deploy Swap Canister

```bash
# Deploy swap canister
dfx deploy swap --network ic --with-cycles 1000000000000

# Get canister ID
export SWAP_CANISTER_ID=$(dfx canister --network ic id swap)
echo "Swap Canister: $SWAP_CANISTER_ID"

# Initialize swap canister with PULSE and ckUSDC token canisters
# Note: Replace ckUSDC_CANISTER_ID with actual ckUSDC canister on mainnet
# ckUSDC mainnet canister: xevnm-gaaaa-aaaar-qafnq-cai
export CKUSDC_CANISTER_ID="xevnm-gaaaa-aaaar-qafnq-cai"
dfx canister --network ic call swap initialize \
  "(principal \"$PULSE_CANISTER_ID\", principal \"$CKUSDC_CANISTER_ID\")"

# Verify initialization
dfx canister --network ic call swap isInitialized
```

### 9. Post-Deployment Configuration

#### 9.1 Create Airdrop Campaign

```bash
# Create an airdrop campaign (example: quest campaign)
dfx canister --network ic call airdrop create_campaign \
  '("Early Adopter Quest Campaign", "Complete quests to earn PULSE rewards", 100_000_000_000_000 : nat, 90 : nat)'

# This returns a campaign ID (e.g., 1)
# Save this for creating quests
export CAMPAIGN_ID=1
```

#### 9.2 Initialize Quests

```bash
# Run the quest initialization script
# First, update the CANISTER_ID in scripts/init-quests.sh
# Then run:
cd scripts
./init-quests.sh
cd ..

# Verify quests were created
dfx canister --network ic call airdrop get_campaign_quests "(1 : nat)"
```

#### 9.3 Fund Campaign with PULSE

```bash
# Transfer PULSE to airdrop canister for quest rewards
# Amount should match campaign totalAmount (100,000 PULSE = 100_000_000_000_000 in e8s)
dfx canister --network ic call tokenmania icrc1_transfer \
  "(record {
    to = record {
      owner = principal \"$AIRDROP_CANISTER_ID\";
      subaccount = null;
    };
    amount = 100_000_000_000_000 : nat;
    fee = null;
    memo = null;
    created_at_time = null;
  })"

# Verify airdrop canister balance
dfx canister --network ic call tokenmania icrc1_balance_of \
  "(record { owner = principal \"$AIRDROP_CANISTER_ID\"; subaccount = null })"
```

#### 9.4 Start Campaign

```bash
# Start the airdrop campaign
dfx canister --network ic call airdrop start_campaign "(1 : nat)"

# Verify campaign is active
dfx canister --network ic call airdrop get_campaign "(1 : nat)"
```

#### 9.5 Fund Swap Canister with PULSE Liquidity

```bash
# Transfer PULSE to swap canister for liquidity
# Example: 10,000,000 PULSE = 10_000_000_000_000_000 in e8s
dfx canister --network ic call tokenmania icrc1_transfer \
  "(record {
    to = record {
      owner = principal \"$SWAP_CANISTER_ID\";
      subaccount = null;
    };
    amount = 10_000_000_000_000_000 : nat;
    fee = null;
    memo = null;
    created_at_time = null;
  })"

# Verify swap canister PULSE balance
dfx canister --network ic call swap getPulseBalance
```

### 10. Verify All Deployments

```bash
# Check all canister statuses
echo "=== Canister Status Check ==="
dfx canister --network ic status polls_surveys_backend
dfx canister --network ic status tokenmania
dfx canister --network ic status pulseg
dfx canister --network ic status staking
dfx canister --network ic status airdrop
dfx canister --network ic status swap

# Test core functions
echo "=== Testing Core Functions ==="

# Test polls backend
dfx canister --network ic call polls_surveys_backend list_projects '(0, 10)'

# Test PULSE token
dfx canister --network ic call tokenmania icrc1_name
dfx canister --network ic call tokenmania icrc1_symbol
dfx canister --network ic call tokenmania icrc1_total_supply

# Test PULSEG token
dfx canister --network ic call pulseg icrc1_name
dfx canister --network ic call pulseg icrc1_symbol

# Test staking
dfx canister --network ic call staking get_staking_stats

# Test airdrop
dfx canister --network ic call airdrop get_active_campaigns

# Test swap
dfx canister --network ic call swap getExchangeRate
```

## Frontend Deployment Steps

### 1. Update Environment Variables

```bash
# Get all canister IDs
BACKEND_CANISTER_ID=$(dfx canister --network ic id polls_surveys_backend)
PULSE_CANISTER_ID=$(dfx canister --network ic id tokenmania)
PULSEG_CANISTER_ID=$(dfx canister --network ic id pulseg)
STAKING_CANISTER_ID=$(dfx canister --network ic id staking)
AIRDROP_CANISTER_ID=$(dfx canister --network ic id airdrop)
SWAP_CANISTER_ID=$(dfx canister --network ic id swap)

# Create/update frontend environment variables
cat > frontend/.env.production << EOF
# Network Configuration
DFX_NETWORK=ic
NEXT_PUBLIC_DFX_NETWORK=ic
NEXT_PUBLIC_IC_HOST=https://icp-api.io

# Backend Canisters
NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID=$BACKEND_CANISTER_ID
POLLS_SURVEYS_BACKEND_CANISTER_ID=$BACKEND_CANISTER_ID

# Token Canisters
NEXT_PUBLIC_TOKENMANIA_CANISTER_ID=$PULSE_CANISTER_ID
NEXT_PUBLIC_PULSEG_CANISTER_ID=$PULSEG_CANISTER_ID

# Feature Canisters
NEXT_PUBLIC_STAKING_CANISTER_ID=$STAKING_CANISTER_ID
NEXT_PUBLIC_AIRDROP_CANISTER_ID=$AIRDROP_CANISTER_ID
NEXT_PUBLIC_SWAP_CANISTER_ID=$SWAP_CANISTER_ID

# ckUSDC Canister (mainnet)
NEXT_PUBLIC_CKUSDC_CANISTER_ID=xevnm-gaaaa-aaaar-qafnq-cai
EOF

echo "✅ Environment variables updated in frontend/.env.production"
```

### 2. Build Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Verify build output
ls -la dist/

cd ..
```

### 3. Deploy Frontend

```bash
# Deploy frontend assets to mainnet
dfx deploy polls_surveys_frontend --network ic --with-cycles 500000000000

# Get frontend canister ID
dfx canister --network ic id polls_surveys_frontend
```

## Post-Deployment Verification

### 1. Test Canister Functions

```bash
# Test backend functionality
dfx canister --network ic call polls_surveys_backend list_projects '(0, 10)'

# Test creating a project (if implemented)
dfx canister --network ic call polls_surveys_backend create_project '("Test Project", "A test project for verification")'

# Test PULSE token transfers
dfx canister --network ic call tokenmania icrc1_balance_of \
  "(record { owner = principal \"$(dfx identity get-principal)\"; subaccount = null })"

# Test quest system
dfx canister --network ic call airdrop get_user_quests \
  "(principal \"$(dfx identity get-principal)\", 1 : nat)"

# Test staking stats
dfx canister --network ic call staking get_staking_stats

# Test swap rate
dfx canister --network ic call swap getExchangeRate
dfx canister --network ic call swap calculatePulseAmount "(1000000 : nat)"
```

### 2. Access Your Application

```bash
# Get the frontend URL
FRONTEND_URL="https://$(dfx canister --network ic id polls_surveys_frontend).ic0.app"
echo "Frontend URL: $FRONTEND_URL"

# Get Candid UI URLs for all canisters
echo ""
echo "=== Candid UI URLs ==="
echo "Backend: https://$(dfx canister --network ic id polls_surveys_backend).ic0.app"
echo "PULSE Token: https://$(dfx canister --network ic id tokenmania).ic0.app"
echo "PULSEG Token: https://$(dfx canister --network ic id pulseg).ic0.app"
echo "Staking: https://$(dfx canister --network ic id staking).ic0.app"
echo "Airdrop: https://$(dfx canister --network ic id airdrop).ic0.app"
echo "Swap: https://$(dfx canister --network ic id swap).ic0.app"
```

### 3. Verify Frontend Integration

1. Visit the frontend URL
2. Check that the landing page loads correctly
3. Connect your wallet (Internet Identity or Plug)
4. Test core features:
   - Create a poll or survey
   - Vote in existing polls
   - Check your wallet balance (PULSE/PULSEG)
   - Navigate to `/quests` to view quest system
   - Navigate to `/airdrop` to check eligibility
   - Navigate to `/staking` to test staking interface
   - Navigate to `/swap` to test token swap

### 4. Test Quest Completion Flow

```bash
# Simulate quest progress (as admin/backend)
# Replace USER_PRINCIPAL with an actual user principal
USER_PRINCIPAL="your-test-user-principal"

# Update quest progress for "Create First Poll"
dfx canister --network ic call airdrop update_quest_progress \
  "(principal \"$USER_PRINCIPAL\", 1 : nat, opt (1 : nat), null, null, null, null)"

# Check user's quests and points
dfx canister --network ic call airdrop get_user_quests \
  "(principal \"$USER_PRINCIPAL\", 1 : nat)"

dfx canister --network ic call airdrop get_user_points \
  "(principal \"$USER_PRINCIPAL\", 1 : nat)"
```

## Domain Configuration (Optional)

### 1. Custom Domain Setup

If you want to use a custom domain:

```bash
# Add custom domain to frontend canister
dfx canister --network ic call polls_surveys_frontend http_request_update '(record {
  method = "GET";
  url = "/";
  headers = vec {};
  body = blob "";
})'
```

### 2. DNS Configuration

Update your DNS records to point to your canister:
- Create a CNAME record pointing to `<canister-id>.ic0.app`
- Or use the boundary node IP addresses

## Monitoring and Maintenance

### 1. Monitor Cycles

```bash
# Check cycles balance regularly
dfx canister --network ic status polls_surveys_backend
dfx canister --network ic status polls_surveys_frontend

# Top up cycles when needed
dfx canister --network ic deposit-cycles 1000000000000 polls_surveys_backend
```

### 2. Backup Canister IDs

Save your canister IDs securely:

```bash
# Create a deployment info file
cat > deployment-info.md << EOF
# ICP Pulse Platform Deployment Information

## Mainnet Canister IDs

### Core Platform
- Backend (polls_surveys): $(dfx canister --network ic id polls_surveys_backend)
- Frontend: $(dfx canister --network ic id polls_surveys_frontend)

### Token Canisters
- PULSE Token (tokenmania): $(dfx canister --network ic id tokenmania)
- PULSEG Token: $(dfx canister --network ic id pulseg)

### Feature Canisters
- Staking: $(dfx canister --network ic id staking)
- Airdrop: $(dfx canister --network ic id airdrop)
- Swap: $(dfx canister --network ic id swap)

## Frontend URLs
- Main Application: https://$(dfx canister --network ic id polls_surveys_frontend).ic0.app

## Candid UI URLs (for testing/admin)
- Backend: https://$(dfx canister --network ic id polls_surveys_backend).ic0.app
- PULSE Token: https://$(dfx canister --network ic id tokenmania).ic0.app
- PULSEG Token: https://$(dfx canister --network ic id pulseg).ic0.app
- Staking: https://$(dfx canister --network ic id staking).ic0.app
- Airdrop: https://$(dfx canister --network ic id airdrop).ic0.app
- Swap: https://$(dfx canister --network ic id swap).ic0.app

## Deployment Date
- $(date)

## Principal ID
- $(dfx identity get-principal)

## Initial Configuration
- PULSE Total Supply: 1,000,000,000 PULSE (1e17 in e8s)
- PULSEG Initial Supply: 100,000 PULSEG (1e13 in e8s)
- Swap Rate: 10,000 PULSE per ckUSDC
- Quest Campaign: Early Adopter (100,000 PULSE pool)
EOF

echo "✅ Deployment info saved to deployment-info.md"
```

### 3. Update Deployment

For future updates:

```bash
# Update specific backend canister
dfx deploy polls_surveys_backend --network ic
dfx deploy tokenmania --network ic
dfx deploy pulseg --network ic
dfx deploy staking --network ic
dfx deploy airdrop --network ic
dfx deploy swap --network ic

# Or update all backend canisters at once
dfx deploy --network ic --no-wallet \
  polls_surveys_backend tokenmania pulseg staking airdrop swap

# Update frontend
cd frontend
npm run build
cd ..
dfx deploy polls_surveys_frontend --network ic

# Verify all updates
dfx canister --network ic status polls_surveys_backend
dfx canister --network ic status tokenmania
dfx canister --network ic status pulseg
dfx canister --network ic status staking
dfx canister --network ic status airdrop
dfx canister --network ic status swap
dfx canister --network ic status polls_surveys_frontend
```

## Troubleshooting

### Common Issues

1. **Insufficient Cycles**
   ```bash
   # Solution: Add more cycles
   dfx canister --network ic deposit-cycles AMOUNT CANISTER_NAME
   ```

2. **Build Failures**
   ```bash
   # Clean and rebuild
   dfx start --clean --background --network ic
   npm run build
   ```

3. **Network Connection Issues**
   ```bash
   # Verify network connectivity
   ping ic0.app
   dfx ping ic
   ```

4. **Frontend Not Loading**
   - Check that build output is in `frontend/dist/`
   - Verify environment variables are set correctly
   - Check browser console for errors

### Getting Help

- [Internet Computer Documentation](https://internetcomputer.org/docs)
- [DFX SDK Reference](https://internetcomputer.org/docs/current/references/cli-reference/)
- [Internet Computer Forum](https://forum.dfinity.org/)
- [Discord Community](https://discord.gg/cA7y6ezyE2)

## Security Considerations

1. **Identity Security**: Keep your deployment identity's seed phrase secure
2. **Cycles Management**: Monitor cycles balance to prevent canister freezing
3. **Access Control**: Implement proper authentication in your application
4. **Data Validation**: Ensure all user inputs are validated on the backend
5. **Rate Limiting**: Consider implementing rate limiting for public endpoints

## Cost Estimation

Approximate costs for mainnet deployment:

### Initial Deployment Costs
- **polls_surveys_backend**: 2T cycles (≈2 SDR)
- **tokenmania (PULSE)**: 1T cycles (≈1 SDR)
- **pulseg (PULSEG)**: 1T cycles (≈1 SDR)
- **staking**: 1.5T cycles (≈1.5 SDR)
- **airdrop**: 1.5T cycles (≈1.5 SDR)
- **swap**: 1T cycles (≈1 SDR)
- **polls_surveys_frontend**: 500B cycles (≈0.5 SDR)

**Total Initial Deployment**: ~9T cycles (≈9 SDR)

### Monthly Operating Costs (estimated)
- **Backend canisters**: 0.5-5 SDR/month (depends on activity)
- **Token canisters**: 0.1-1 SDR/month (depends on transactions)
- **Frontend**: 0.1-2 SDR/month (depends on traffic)

**Total Monthly**: ~0.7-8 SDR/month

### Additional Costs to Consider
- **PULSE token liquidity**: Fund swap canister with PULSE tokens
- **Quest rewards**: Fund airdrop campaigns with PULSE tokens
- **Gas fees**: ICRC-1 transfer fees (0.0001 PULSE per transfer)

## Next Steps After Deployment

1. Set up monitoring and alerting for cycles
2. Implement proper error handling and logging
3. Set up continuous deployment pipeline
4. Configure custom domain (optional)
5. Implement analytics and user tracking
6. Plan for scalability and performance optimization
7. Fund airdrop campaigns regularly
8. Monitor swap liquidity levels
9. Track staking metrics and APY performance
10. Regular security audits of token contracts

## Important Notes

### Quest System
- Quest progress is automatically tracked by polls_surveys_backend
- Users earn points when completing quests
- PULSE rewards are distributed proportionally based on points
- Users can only claim rewards once per campaign
- Early claimers get larger shares (dynamic distribution)

### Staking System
- Users must approve staking canister before staking
- Early unstaking applies 10% penalty
- PULSEG is minted by staking canister only
- Rewards accumulate continuously
- Lock periods: Flexible (5% APY), 30d (15%), 90d (30%), 1yr (50%)

### Swap System
- Users must approve swap canister for ckUSDC transfers
- Exchange rate: 10,000 PULSE = 1 ckUSDC
- Requires sufficient PULSE liquidity in swap canister
- Monitor and maintain liquidity levels

### Token Economics
- PULSE: Utility token (100M total supply recommended)
- PULSEG: Governance token (minted through staking)
- Transfer fees: 0.0001 tokens (10,000 e8s)
- All amounts use e8s (8 decimal places)

## Quick Reference

### Common Commands

```bash
# Check canister cycles balance
dfx canister --network ic status CANISTER_NAME

# Add cycles to canister
dfx canister --network ic deposit-cycles AMOUNT CANISTER_NAME

# Check token balance
dfx canister --network ic call tokenmania icrc1_balance_of \
  "(record { owner = principal \"YOUR_PRINCIPAL\"; subaccount = null })"

# Get quest progress
dfx canister --network ic call airdrop get_user_quests \
  "(principal \"USER_PRINCIPAL\", 1 : nat)"

# Check staking stats
dfx canister --network ic call staking get_staking_stats

# Get swap rate
dfx canister --network ic call swap getExchangeRate
```

### Token Decimals (e8s format)

| Amount | e8s Value | Example |
|--------|-----------|---------|
| 1 PULSE | 100,000,000 | `100_000_000 : nat` |
| 100 PULSE | 10,000,000,000 | `10_000_000_000 : nat` |
| 1,000 PULSE | 100,000,000,000 | `100_000_000_000 : nat` |
| 1M PULSE | 100,000,000,000,000 | `100_000_000_000_000 : nat` |

### Mainnet Canister IDs (External)

- **ckUSDC**: `xevnm-gaaaa-aaaar-qafnq-cai`
- **ICP Ledger**: `ryjl3-tyaaa-aaaaa-aaaba-cai`
- **Internet Identity**: `rdmx6-jaaaa-aaaaa-aaadq-cai`

---

**Important**: Always test thoroughly on the local network before deploying to mainnet. Mainnet deployment requires real cycles and cannot be easily reversed.

**Security**: Keep your identity seed phrases secure. Never commit them to version control. Use hardware wallets for production deployments when possible.