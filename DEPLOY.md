# ICP Polls & Surveys - Mainnet Deployment Guide

This guide walks through deploying the ICP Polls & Surveys application to the Internet Computer Protocol (ICP) mainnet.

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

## Backend Deployment Steps

### 1. Install Dependencies

```bash
# Install Motoko dependencies
mops install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Build and Deploy Backend

```bash
# Set network to mainnet
dfx start --clean --background --network ic

# Deploy the backend canister to mainnet
dfx deploy polls_surveys_backend --network ic --with-cycles 1000000000000

# Note: Adjust cycles amount based on your needs
# 1T cycles ≈ 1 SDR (Special Drawing Rights)
```

### 3. Verify Backend Deployment

```bash
# Get canister ID
dfx canister --network ic id polls_surveys_backend

# Check canister status
dfx canister --network ic status polls_surveys_backend

# Test a basic function
dfx canister --network ic call polls_surveys_backend list_projects '(0, 10)'
```

## Frontend Deployment Steps

### 1. Update Environment Variables

```bash
# Get the backend canister ID
BACKEND_CANISTER_ID=$(dfx canister --network ic id polls_surveys_backend)

# Update frontend environment variables
echo "NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID=$BACKEND_CANISTER_ID" >> frontend/.env.production
echo "POLLS_SURVEYS_BACKEND_CANISTER_ID=$BACKEND_CANISTER_ID" >> frontend/.env.production
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
```

### 2. Access Your Application

```bash
# Get the frontend URL
echo "Frontend URL: https://$(dfx canister --network ic id polls_surveys_frontend).ic0.app"

# Get the Candid UI URL for backend testing
echo "Backend Candid UI: https://$(dfx canister --network ic id polls_surveys_backend).ic0.app"
```

### 3. Verify Frontend Integration

1. Visit the frontend URL
2. Check that the landing page loads correctly
3. Navigate to `/admin` and verify connection to backend
4. Test creating a project, survey, or poll

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
# Deployment Information

## Mainnet Canister IDs
- Backend: $(dfx canister --network ic id polls_surveys_backend)
- Frontend: $(dfx canister --network ic id polls_surveys_frontend)

## URLs
- Frontend: https://$(dfx canister --network ic id polls_surveys_frontend).ic0.app
- Backend Candid UI: https://$(dfx canister --network ic id polls_surveys_backend).ic0.app

## Deployment Date
- $(date)

## Principal ID
- $(dfx identity get-principal)
EOF
```

### 3. Update Deployment

For future updates:

```bash
# Update backend
dfx deploy polls_surveys_backend --network ic

# Update frontend
cd frontend
npm run build
cd ..
dfx deploy polls_surveys_frontend --network ic
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

- **Backend Canister**: 1T cycles (≈1 SDR) for deployment + ongoing compute/storage costs
- **Frontend Canister**: 500B cycles (≈0.5 SDR) for deployment + HTTP request costs
- **Monthly Operating Costs**: Variable based on usage (typically 0.1-10 SDR/month)

## Next Steps After Deployment

1. Set up monitoring and alerting for cycles
2. Implement proper error handling and logging
3. Set up continuous deployment pipeline
4. Configure custom domain (optional)
5. Implement analytics and user tracking
6. Plan for scalability and performance optimization

---

**Important**: Always test thoroughly on the local network before deploying to mainnet. Mainnet deployment requires real cycles and cannot be easily reversed.