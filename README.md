# ICP Online Polls & Surveys — Projects & Products

Monorepo scaffold for a production-ready starter where admins create Projects and Products, teams launch Polls (single-question) and Surveys (multi-question), and users vote/submit responses. Backend in Motoko, frontend in Next.js 14.

## Run locally

1) Install deps at root and frontend:

```
npm install
cd frontend && npm install
```

2) Start local replica and deploy canisters:

```
dfx start --clean --background
dfx deploy
```

3) Start frontend:

```
cd frontend
npm run dev
```

API health: open `/api/health`.

See `ABOUT.md` and `DOCS.md` for details and candid examples.
