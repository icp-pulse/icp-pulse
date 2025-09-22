🚀 Deploy Your Test Token

  1. Install Dependencies

  cd /Users/east/workspace/icp/motoko-icp-pulse
  mops install

  2. Start Local DFX (if not running)

  dfx start --background --clean

  3. Deploy the Test Token

  dfx deploy test_token --network local

  4. Get Your Token's Canister ID

  dfx canister id test_token --network local

  5. Test Your Token

  # Get basic token info
  dfx canister call test_token icrc1_name --network local
  dfx canister call test_token icrc1_symbol --network local
  dfx canister call test_token icrc1_decimals --network local

  # Get your principal ID
  dfx identity get-principal

  # Mint some tokens to yourself (replace YOUR_PRINCIPAL)
  dfx canister call test_token mint '(principal "YOUR_PRINCIPAL", 1000000000000)' --network local

  # Check your balance
  dfx canister call test_token icrc1_balance_of '(record { owner = principal "YOUR_PRINCIPAL"; subaccount = null })' --network local

  🎯 Quick Testing Guide

  After deployment, you can:

  1. Copy the canister ID from the deployment output
  2. Use it in your poll creation form as the custom token canister
  3. Create a funded poll with your test token
  4. Vote and receive token rewards

  🌐 Alternative: Use Existing Test Tokens

  If you want to test immediately, here are some known ICRC-1 test tokens on mainnet:

  - ckBTC: mxzaz-hqaaa-aaaar-qaada-cai
  - ckETH: ss2fx-dyaaa-aaaar-qacoq-cai
  - CHAT: 2ouva-viaaa-aaaaq-aaamq-cai

  📋 Step-by-Step Testing Process

  1. Deploy: dfx deploy test_token
  2. Get Canister ID: Copy from output or use dfx canister id test_token
  3. Mint Tokens: Use the mint function to give yourself tokens
  4. Test Poll Creation: Use the canister ID in your poll form
  5. Test Voting: Vote and verify token rewards are distributed

  Your test token will have:
  - Name: "Test Poll Token"
  - Symbol: "TPT"
  - Decimals: 8
  - Supply: Mintable up to 10M tokens

  Would you like me to help you deploy this and test the integration? 🚀