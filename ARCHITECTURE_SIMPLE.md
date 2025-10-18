# TruePulse System Architecture - Simplified View

This is a simplified connectivity diagram showing how the different components and services in the TruePulse ecosystem connect to each other, without detailed interaction labels.

For the detailed version with interaction descriptions and data flows, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## System Component Connectivity

```mermaid
graph TB
    %% External Users and Services
    User[User/Web Browser]
    II[Internet Identity]
    OpenAI[OpenAI API]

    %% Frontend
    Frontend[polls_surveys_frontend<br/>Next.js Asset Canister]

    %% TruePulse Platform
    subgraph TruePulse["TruePulse Platform"]
        Backend[polls_surveys_backend]
        TokenMania[tokenmania<br/>PULSE Token]
        PulseG[pulseg<br/>Governance Token]
        Staking[staking]
        Airdrop[airdrop]
        Swap[swap]
    end

    %% IDO Platform
    subgraph IDO["IDO Platform"]
        IDOBackend[IDO Backend]
        IDOFrontend[IDO Frontend]
    end

    %% AI Gateway
    subgraph Gateway["AI Gateway"]
        Worker[Cloudflare Worker]
        DurableObj[Durable Object]
    end

    %% External Tokens
    subgraph ExternalTokens["External ICRC-1 Tokens"]
        ckBTC[ckBTC]
        ckETH[ckETH]
        ckUSDC[ckUSDC]
        CHAT[CHAT]
        SNS1[SNS1]
    end

    %% User connections
    User --> Frontend
    User --> II
    User --> IDOFrontend
    II --> Frontend
    II --> IDOFrontend

    %% Frontend connections
    Frontend --> Backend
    Frontend --> TokenMania
    Frontend --> Staking
    Frontend --> Airdrop
    Frontend --> Swap
    Frontend --> PulseG

    %% IDO connections
    IDOFrontend --> IDOBackend
    IDOBackend --> TokenMania
    IDOBackend --> ckUSDC

    %% Backend canister connections
    Backend --> Airdrop
    Backend --> TokenMania
    Backend --> ExternalTokens
    Backend -.-> Worker

    Staking --> PulseG
    Staking --> TokenMania

    Airdrop --> TokenMania

    Swap --> TokenMania
    Swap --> ckUSDC

    %% AI Gateway
    Worker --> DurableObj
    DurableObj --> OpenAI

    %% Color coding
    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef backend fill:#00d4aa,stroke:#333,stroke-width:2px,color:#000
    classDef token fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef external fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef gateway fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff
    classDef ido fill:#3498db,stroke:#333,stroke-width:2px,color:#fff

    class Frontend,IDOFrontend frontend
    class Backend,Staking,Airdrop,Swap,IDOBackend backend
    class TokenMania,PulseG,ckBTC,ckETH,ckUSDC,CHAT,SNS1 token
    class User,II,OpenAI external
    class Worker,DurableObj gateway
```

## Component Legend

### Color Coding
- **Blue** - Frontend/UI components
- **Green** - Backend canisters (business logic)
- **Orange** - Token canisters (ICRC-1)
- **Red** - External services
- **Purple** - AI Gateway (Cloudflare Workers)
- **Light Blue** - IDO platform components

### Connection Types
- **Solid lines** (→) - Direct connections/API calls
- **Dotted lines** (-.→) - HTTP outcalls or external integrations

## Quick Reference

### TruePulse Platform (6 Canisters)
1. `polls_surveys_backend` - Core business logic
2. `tokenmania` - PULSE utility token
3. `pulseg` - Governance token
4. `staking` - Token staking
5. `airdrop` - Quest & campaign management
6. `swap` - Token exchange

### IDO Platform (2 Canisters)
1. `IDO Backend` - Vested token sales
2. `IDO Frontend` - IDO web interface

### AI Gateway (Cloudflare Workers)
1. `Worker` - Request router
2. `Durable Object` - AI cache & consensus

### External Services
- Internet Identity - ICP authentication
- OpenAI API - AI content generation
- ICRC-1 Tokens - ckBTC, ckETH, ckUSDC, CHAT, SNS1

---

**Note**: This diagram shows connectivity only. For detailed information about data flows, interaction types, and system behavior, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).
