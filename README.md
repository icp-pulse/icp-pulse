# TruePulse – Decentralized Polls & Surveys on ICP

## 🚀 Project Summary
TruePulse is a decentralized polls & surveys platform built on the **Internet Computer Protocol (ICP)**.  
It enables communities, DAOs, and organizations to create transparent, incentivized, and tamper-proof polls — ensuring fair participation and verifiable results without relying on centralized intermediaries.

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
- ✅ **On-chain poll creation** – polls and responses stored securely on ICP canisters.
- ✅ **Incentivized participation** – voters earn rewards (tokens/NFTs) for engagement.
- ✅ **Transparent results** – verifiable, immutable tallying of poll outcomes.
- ✅ **Community ownership** – no central authority, decisions powered by participants.

---

## 🛠️ Tech Stack
- **Backend:** Motoko & Rust canisters on ICP  
- **Frontend:** React + Vite + TailwindCSS  
- **Smart Contracts:** Deployed on ICP mainnet/testnet  
- **Wallet Integration:** Plug / Stoic / NFID support  
- **Deployment:** Internet Computer + IPFS (static assets)

---

## 📺 Demo
- **Demo Video (Functional, <10 min):** [Link here]  
- **Pitch Video (Team + Solution + Roadmap):** [Link here]  
- **Live Demo (if applicable):** [https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io](https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io)  

---

## 📂 Repository Structure
```
root/
 ├── src/            # Frontend (React + Tailwind)
 ├── canisters/      # Motoko/Rust canisters
 ├── docs/           # Pitch deck, whitepaper, diagrams
 ├── test/           # Unit & integration tests
 ├── package.json    # Frontend dependencies
 └── README.md       # This file
```

---

## ⚡ Key Features
- Create polls directly on ICP canisters  
- Submit responses securely on-chain  
- Reward distribution (tokenized incentives)  
- Results dashboard (real-time, verifiable)  
- Poll lifecycle management (activate/deactivate, modify)  

---

## 📖 How to Run Locally

### 1. Prerequisites
- Node.js >= 18
- DFX SDK (`dfx` latest version)
- Git

### 2. Clone & Install
```bash
git clone https://github.com/icp-pulse/icp-pulse.git
cd icp-pulse
npm install
```

### 3. Start Local ICP Environment
```bash
dfx start --background
dfx deploy
```

### 4. Run Frontend
```bash
cd frontend
npm run dev
```
Access at: `http://localhost:3000`

---

## 🧪 Tests
Run unit and integration tests:
```bash
npm run test
```

---

## 🌍 Roadmap
- **Q3 2025** – Launch poll creation & voting MVP  
- **Q4 2025** – Add incentivized rewards via tokens/NFTs  
- **Q1 2026** – DAO governance module for community funds  
- **Q2 2026** – Multi-chain integration (Ethereum, TON, etc.)  

---

## 👥 Team
- **East (Co-Founder):** 20+ yrs project management, software development, tech advisory across fintech, insurance, construction, energy  
- **Adam (Co-Founder):** Product + technical strategy, blockchain ecosystem builder  
- **Oscar (Backend):** Backend architecture & canister integrations  

---

## 📄 License
MIT License – free to use, modify, and distribute.

---

## 📬 Contact
- Telegram: [@eastmaels](http://t.me/eastmaels) | [@muhammedadam123](http://t.me/muhammedadam123)  
- DoraHacks Submission: [Link here]  
