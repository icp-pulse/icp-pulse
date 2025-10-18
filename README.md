# TruePulse – Decentralized Polls & Surveys on ICP

🎉 **Now Live on ICP Mainnet!** 🎉

* [Live App (Mainnet)](https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io/)
* [Demo Video (Regional)](https://youtu.be/UPu3-1xkLNo)
* [Pitchdeck](https://www.canva.com/design/DAGxLqA2h3U/5uTAN5rb1lzDqD7qiNl5Yg/view?utm_content=DAGxLqA2h3U&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=ha53a44d899)
* [Pitchdeck Video](https://youtu.be/tGnw1th9j10)

### Previous Demos
* [Demo Video](https://youtu.be/sonGyeNZkjA)


## 🚀 Project Summary
TruePulse is a decentralized polls & surveys platform built on the **Internet Computer Protocol (ICP)**.
It enables communities, DAOs, and organizations to create transparent, incentivized, and tamper-proof polls — ensuring fair participation and verifiable results without relying on centralized intermediaries.

### 🎁 New Features
- **Token Rewards System**: Users earn PULSE tokens for participating in polls and surveys
- **Governance Token (PULSEG)**: Stake PULSE to earn governance tokens for platform voting rights
- **Token Staking**: Lock PULSE tokens to earn PULSEG and participate in governance
- **ICRC-1 Token Integration**: Support for multiple tokens including ckBTC, ckETH, ckUSDC, CHAT, SNS1
- **Internet Identity Auth**: Secure, decentralized authentication
- **Real-time Rewards**: Automatic reward creation and secure claiming process
- **AI-Powered Generation**: Create poll options using AI via Cloudflare Workers integration

---

## 🎯 Problem Statement
Traditional online survey and polling platforms (e.g., Google Forms, SurveyMonkey) suffer from:
- ❌ **Centralized control** – admins can manipulate data.
- ❌ **Lack of incentives** – participants often have no motivation to engage.
- ❌ **Limited transparency** – results are not verifiable or trustless.
- ❌ **Privacy concerns** – personal data is harvested and misused.

---

## 💡 Our Solution
TruePulse leverages **ICP smart contracts** to deliver:
- ✅ **On-chain poll creation** – polls and responses stored securely on ICP canisters
- ✅ **Token rewards system** – users earn PULSE and other ICRC-1 tokens for participation
- ✅ **Governance token (PULSEG)** – stake PULSE to earn voting rights in platform decisions
- ✅ **Transparent results** – verifiable, immutable tallying of poll outcomes
- ✅ **Secure rewards claiming** – cryptographically secure token distribution
- ✅ **Multi-token support** – PULSE, ckBTC, ckETH, ckUSDC, and custom tokens
- ✅ **AI-powered content generation** – create poll options using GPT-4o-mini via deterministic gateway
- ✅ **Community ownership** – no central authority, decisions powered by participants

---

## 🛠️ Tech Stack
- **Backend:** Motoko smart contracts on ICP mainnet (6 canisters)
- **Frontend:** Next.js 14 + React + TailwindCSS + TypeScript
- **Authentication:** Internet Identity integration
- **Token Standard:** ICRC-1/ICRC-2 compatible tokens
- **Smart Contracts:** Enhanced orthogonal persistence
- **AI Gateway:** Cloudflare Workers + Durable Objects (deterministic AI responses)
- **AI Model:** OpenAI GPT-4o-mini for content generation
- **Deployment:** ICP mainnet canisters
- **UI Framework:** shadcn/ui + Radix UI components

---

## 📺 Demo & Live Application
- **🚀 Live App (Mainnet):** [https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io](https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io)
- **Demo Video (Functional):** [[Link](https://youtu.be/sonGyeNZkjA)]
- **Pitch Video (Team + Solution + Roadmap):** [[Link](https://youtu.be/tGnw1th9j10)]
- **Pitch Deck:** [Link](https://www.canva.com/design/DAGxLqA2h3U/5uTAN5rb1lzDqD7qiNl5Yg/view?utm_content=DAGxLqA2h3U&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=ha53a44d899)

### 🏗️ Mainnet Canisters
- **Backend:** `u2j5c-sqaaa-aaaao-a4o6q-cai`
- **Frontend:** `utkw6-eyaaa-aaaao-a4o7a-cai`
- **PULSE Token (tokenmania):** `zix77-6qaaa-aaaao-a4pwq-cai`
- **Airdrop:** `27ftn-piaaa-aaaao-a4p6a-cai`
- **PULSEG Governance Token:** (deployed)
- **Staking:** (deployed)
- **Swap:** (deployed)

---

## 📚 Documentation

### 🚀 Getting Started
- **[README.md](./README.md)** - Project overview and quick start guide (this file)
- **[BUILD.md](./BUILD.md)** - Build instructions and configuration
- **[DEVELOP.md](./DEVELOP.md)** - Development workflow and best practices
- **[DEPLOY.md](./DEPLOY.md)** - Comprehensive deployment guide
- **[MAINNET_DEPLOYMENT_INFO.md](./MAINNET_DEPLOYMENT_INFO.md)** - Current mainnet deployment details

### 🏗️ Architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture with component interactions and data flows
- **[ARCHITECTURE_SIMPLE.md](./ARCHITECTURE_SIMPLE.md)** - Simplified connectivity diagram for quick reference

### 🎁 Airdrop & Rewards System
- **[AUTO_ALLOCATION_GUIDE.md](./AUTO_ALLOCATION_GUIDE.md)** - Automatic airdrop allocation based on user activity
- **[EARLY_ADOPTER_CAMPAIGN_GUIDE.md](./EARLY_ADOPTER_CAMPAIGN_GUIDE.md)** - Setting up early adopter reward campaigns
- **[FIX_ALLOCATION.md](./FIX_ALLOCATION.md)** - Troubleshooting allocation issues
- **[FRONTEND_AIRDROP_GUIDE.md](./FRONTEND_AIRDROP_GUIDE.md)** - Frontend integration for airdrops
- **[ADMIN_UI_GUIDE.md](./ADMIN_UI_GUIDE.md)** - Admin interface for managing campaigns
- **[ADMIN_AIRDROP_INTERFACE.md](./ADMIN_AIRDROP_INTERFACE.md)** - Admin UI specifications

### 🔐 Admin & Security
- **[ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)** - Setting up admin access and permissions

### 🎯 Features & Implementation
- **[STAKING_IMPLEMENTATION.md](./STAKING_IMPLEMENTATION.md)** - Token staking system implementation
- **[ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md)** - Analytics integration and tracking
- **[TPOLLS.md](./TPOLLS.md)** - Poll functionality and technical details
- **[01_Plan_Funding.md](./01_Plan_Funding.md)** - Funding mechanism and planning

### 📊 Market Research
- **[Online Survey Software Market Report](./docs/online_survey_software_market_report.md)** - Market analysis and industry insights

---

## 📂 Repository Structure
```
motoko-icp-pulse/
├── backend/                        # Motoko smart contracts (6 canisters)
│   ├── polls_surveys_backend.mo   # Main backend canister with rewards system
│   ├── tokenmania.mo              # PULSE utility token (ICRC-1 compatible)
│   ├── pulseg.mo                  # PULSEG governance token (ICRC-1 compatible)
│   ├── staking.mo                 # Token staking and governance token minting
│   ├── airdrop.mo                 # Airdrop campaign and quest management
│   └── swap.mo                    # Token swap (ckUSDC ↔ PULSE)
├── frontend/                       # Next.js frontend application
│   ├── app/                       # Next.js app router pages
│   │   ├── admin/                # Admin dashboard pages
│   │   │   └── airdrops/        # Airdrop campaign manager
│   │   ├── airdrop/              # User airdrop claim page
│   │   ├── polls/                # Poll-related pages
│   │   ├── projects/             # Project management pages
│   │   ├── surveys/              # Survey pages
│   │   ├── rewards/              # Rewards claiming page
│   │   ├── wallet/               # Wallet and token management
│   │   └── survey-response/      # Survey response page
│   ├── components/               # Reusable React components
│   │   ├── admin/               # Admin-specific components
│   │   ├── landing/             # Landing page components
│   │   ├── layout/              # Layout components
│   │   ├── polls/               # Poll components
│   │   ├── projects/            # Project components
│   │   ├── surveys/             # Survey components
│   │   └── ui/                  # shadcn/ui components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries and configurations
│   │   ├── icp.ts              # ICP integration utilities
│   │   ├── staking.ts          # Staking and airdrop utilities
│   │   ├── tokens.ts           # Token utilities and hooks
│   │   ├── admin-config.ts     # Admin access configuration
│   │   └── types.ts            # TypeScript type definitions
│   └── utils/                   # Helper utilities
├── src/declarations/            # Generated ICP canister declarations
├── docs/                        # Documentation and market reports
├── dfx.json                     # DFX configuration
├── mops.toml                   # Motoko package manager config
├── package.json                # Root dependencies
└── *.md                        # Documentation files (see above)
```

---

## ⚡ Key Features

### 🗳️ Polls & Surveys
- **On-chain Creation**: Create polls and surveys directly on ICP canisters
- **Secure Voting**: Submit responses securely on-chain with cryptographic verification
- **Real-time Results**: Live, verifiable results dashboard
- **Project Management**: Organize polls and surveys under projects for better structure
- **Multiple Question Types**: Support for single-choice, multi-choice, Likert scale, text, and rating questions

### 🎁 Token Rewards System
- **Automatic Rewards**: Users automatically earn tokens when participating in funded polls
- **ICRC-1 Compatible**: Support for PULSE token and other standard tokens (ckBTC, ckETH, ckUSDC, CHAT, SNS1)
- **Secure Claiming**: Cryptographically secure reward claiming process
- **Real-time Tracking**: View pending and claimed rewards in the dedicated rewards page
- **Flexible Funding**: Poll creators can set custom reward amounts per participant

### 🏛️ Governance & Staking
- **Stake PULSE Tokens**: Lock your PULSE tokens to participate in platform governance
- **Earn PULSEG**: Receive governance tokens (PULSEG) by staking PULSE
- **Voting Rights**: Use PULSEG to vote on platform decisions and proposals
- **Flexible Unstaking**: Unlock your staked PULSE tokens anytime
- **ICRC-1 Governance Token**: PULSEG follows ICRC-1/ICRC-2 standards

### 🤖 AI-Powered Features
- **Poll Option Generation**: Use AI to generate creative poll options
- **Deterministic Responses**: Cloudflare Workers ensure consistent AI outputs for ICP consensus
- **GPT-4o-mini Integration**: Powered by OpenAI's latest efficient model
- **Cached Results**: Identical requests return cached responses for speed and cost efficiency

### 🔐 Security & Authentication
- **Internet Identity**: Secure, decentralized authentication without passwords
- **Principal-based Access**: Cryptographic identity verification
- **Enhanced Persistence**: Data survives canister upgrades with stable memory
- **Anti-manipulation**: Immutable on-chain data prevents tampering

### 🌐 User Experience
- **Modern UI**: Clean, responsive interface built with Next.js and shadcn/ui
- **Mobile Friendly**: Optimized for all device sizes
- **Real-time Updates**: Live updates for voting results and reward status
- **Admin Dashboard**: Comprehensive management interface for creators  

---

## 📖 How to Run Locally

### 1. Prerequisites
- Node.js >= 18
- DFX SDK (version 0.29.0 or later)
- Mops (Motoko package manager): `npm install -g ic-mops`
- Git

### 2. Clone & Install
```bash
git clone https://github.com/icp-pulse/motoko-icp-pulse.git
cd motoko-icp-pulse
```

### 3. Install Dependencies
```bash
# Install Motoko dependencies
mops install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 4. Start Local ICP Environment
```bash
# Start local replica
dfx start --clean --background

# Deploy all canisters (backend, frontend, and PULSE token)
dfx deploy
```

### 5. Run Frontend Development Server
```bash
cd frontend
npm run dev
```
Access at: `http://localhost:3000`

### 6. Access Local Candid Interfaces
- **Backend**: `http://127.0.0.1:4943/?canisterId=<frontend-canister>&id=<backend-canister>`
- **PULSE Token**: `http://127.0.0.1:4943/?canisterId=<frontend-canister>&id=<tokenmania-canister>`

Use `dfx canister id <canister-name>` to get canister IDs.

## 🚢 Deployment & Development

### Mainnet Deployment
See `DEPLOY.md` for comprehensive deployment instructions or `MAINNET_DEPLOYMENT_INFO.md` for current deployment details.

**Quick Deploy to Mainnet:**
```bash
# Ensure you have sufficient cycles (minimum 2T cycles recommended)
dfx cycles --network ic balance

# Deploy backend
dfx deploy polls_surveys_backend --network ic --with-cycles 1000000000000

# Deploy PULSE token
dfx deploy tokenmania --network ic --with-cycles 1000000000000

# Build and deploy frontend
cd frontend && npm run build && cd ..
dfx deploy polls_surveys_frontend --network ic
```

### Development Workflow
1. **Local Development**: Use `dfx start --clean --background` for isolated testing
2. **Testing**: Run comprehensive tests before mainnet deployment
3. **Staging**: Test on ICP testnet before mainnet deployment
4. **Monitoring**: Use `dfx canister --network ic status <canister-name>` to monitor cycles

### Key Configuration Files
- **`dfx.json`**: Canister configuration and network settings
- **`mops.toml`**: Motoko package dependencies
- **`frontend/.env.production`**: Production environment variables
- **`frontend/lib/types.ts`**: TypeScript type definitions

---

## 🌍 Roadmap

### ✅ Completed (Q4 2024 - Q1 2025)
- **MVP Launch**: Project, survey, and poll administration & voting
- **Mainnet Deployment**: Live on ICP mainnet with full functionality
- **Token Rewards System**: PULSE token integration with automatic rewards
- **Governance Token (PULSEG)**: Staking system with governance token rewards
- **ICRC-1 Support**: Multi-token support including ckBTC, ckETH, ckUSDC
- **Internet Identity Auth**: Secure, decentralized authentication
- **Rewards Interface**: Dedicated page for claiming and tracking rewards
- **AI Gateway**: Cloudflare Workers integration for deterministic AI responses
- **Token Swap**: ckUSDC ↔ PULSE exchange functionality

### 🔄 In Progress (Q1 2025)
- **Enhanced Token Support**: Additional ICRC-1 tokens integration
- **Advanced Analytics**: Detailed voting and participation analytics
- **Mobile App**: React Native mobile application
- **API Documentation**: Comprehensive developer documentation

### 🎯 Upcoming (Q2-Q4 2025)
- **DAO Governance Module**: Community-driven fund management
- **NFT Rewards**: Non-fungible token rewards for special achievements
- **Advanced Poll Types**: Ranked choice voting, weighted voting
- **Multi-language Support**: Internationalization for global reach
- **Enterprise Features**: White-label solutions for organizations

### 🚀 Future Vision (2026+)
- **Multi-chain Integration**: Ethereum, Polygon, TON network support
- **AI-powered Insights**: Machine learning for poll optimization
- **Decentralized Storage**: IPFS integration for large-scale data
- **Cross-chain Rewards**: Bridge tokens across different blockchains  

---

## 👥 Team
- **East (Co-Founder & Lead Developer):** 20+ years in project management, software development, and tech advisory across fintech, insurance, construction, and energy sectors. Led the development of the rewards system and mainnet deployment.
- **Adam (Co-Founder & Strategy):** Product and technical strategy, blockchain ecosystem builder with extensive experience in decentralized systems.
- **Oscar (Backend Architect):** Backend architecture specialist focused on canister integrations and smart contract optimization.

## 🏆 Achievements
- **🎯 Successfully deployed to ICP mainnet** with full functionality (6 canisters)
- **🏗️ Built production-ready rewards system** with ICRC-1 token integration
- **🏛️ Governance token (PULSEG)** with staking mechanism for community voting
- **🤖 AI-powered content generation** via deterministic Cloudflare Workers gateway
- **🔐 Implemented secure authentication** using Internet Identity
- **⚡ Optimized for performance** with enhanced orthogonal persistence
- **📱 Modern, responsive UI** using Next.js 14 and shadcn/ui
- **🎁 Live token rewards** system with real-time claiming
- **💱 Token swap functionality** between ckUSDC and PULSE

---

## 📄 License
MIT License – free to use, modify, and distribute.

---

## 🔗 Related Projects

TruePulse is part of a broader ecosystem:

### IDO Platform (motoko-icp-ido)
- Vested token sales with multiple pools (Private, Public, Team, Advisors, Liquidity)
- TGE (Token Generation Event) management with cliff and vesting schedules
- ckUSDC-based contributions for PULSE token allocation
- Location: `/Users/east/workspace/icp/motoko-icp-ido`

### AI Gateway (icp-pulse-ai-gateway)
- Deterministic AI response gateway for ICP HTTP outcalls
- Cloudflare Workers + Durable Objects architecture
- OpenAI GPT-4o-mini integration with response caching
- HMAC signature verification for consensus
- Location: `/Users/east/workspace/icp/icp-pulse-ai-gateway`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system integration diagrams.

---

## 📬 Contact
- Telegram: [@eastmaels](http://t.me/eastmaels) | [@muhammedadam123](http://t.me/muhammedadam123)
- DoraHacks Submission: [TruePulse](https://dorahacks.io/buidl/31834/)
