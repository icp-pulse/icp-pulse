# Admin UI Guide - Airdrop Campaign Manager

## Overview

You now have a full-featured admin UI at `/admin/airdrops` for managing PULSE token airdrop campaigns without using the CLI.

## Features

### 1. **Campaign Creation**
Create new airdrop campaigns directly from the UI:

- **Campaign Name**: Descriptive name (e.g., "Early Adopter Rewards Q1 2025")
- **Duration**: Number of days (90 recommended, cannot be changed later)
- **Description**: Campaign details users will see
- **Total Pool**: Total PULSE tokens to distribute

**Steps:**
1. Click "New Campaign" button
2. Fill in campaign details
3. Click "Create Campaign"
4. Campaign is created in "Pending" status

### 2. **Campaign Management**

#### Dashboard Stats
View at-a-glance metrics:
- Total campaigns
- Active campaigns count
- Pending campaigns count
- Total allocated tokens

#### Campaign Cards
Each campaign displays:
- **Status Badge**: Pending (yellow), Active (green), or Completed (gray)
- **Campaign ID**: Unique identifier
- **Stats Grid**:
  - Total Pool: Total campaign tokens
  - Allocated: Tokens allocated to users (% of pool)
  - Claimed: Tokens claimed by users
  - Participants: Number of users with allocations
- **Progress Bar**: Visual allocation progress
- **Timeline**: Created date, start date, end date

### 3. **Manual Allocations**

Add allocations to specific users:

**Steps:**
1. Find your campaign card
2. Click "Add Allocation" button
3. Fill in:
   - **Principal ID**: User's principal
   - **Amount**: PULSE tokens to allocate
   - **Reason**: Why they're receiving this (e.g., "Early adopter")
4. Click "Add"
5. Allocation is added immediately

**Example:**
```
Principal: 7aiiu-rkwon-btjqa-c5sel-564ua-q74km-yacm7-vtglq-hzgtb-wv5y5-rae
Amount: 100
Reason: Platform founder
```

### 4. **Starting Campaigns**

Campaigns must be started before users can claim:

**Requirements:**
- Campaign must be funded (PULSE tokens transferred to airdrop canister)
- At least one allocation must exist

**Steps:**
1. Go to "Pending Campaigns" section
2. Click "Start Campaign" button
3. Campaign moves to "Active" status
4. Users can now claim their allocations

### 5. **Viewing Allocations**

Check who has allocations and their amounts:

1. Click "View Allocations" on any campaign card
2. See allocation count
3. Use provided CLI command for detailed list

## Complete Workflow

### Creating and Launching a Campaign

#### Step 1: Create Campaign (UI)
1. Navigate to `/admin/airdrops`
2. Click "New Campaign"
3. Fill in:
   - Name: "Early Adopter Rewards Q1 2025"
   - Duration: 90 days
   - Description: "Thank you for being an early supporter!"
   - Total Pool: 500000 PULSE
4. Click "Create Campaign"
5. Note the Campaign ID (e.g., #1)

#### Step 2: Add Allocations (UI or CLI)

**Option A: Manual UI Allocation**
1. Find campaign card
2. Click "Add Allocation"
3. Add users one by one

**Option B: Bulk CLI Allocation**
Use the auto-allocation functions for multiple users:

```bash
dfx canister call airdrop auto_allocate_early_adopters '(
  1 : nat,
  vec { 1 : nat; 2 : nat; 3 : nat },
  vec { 1 : nat; 2 : nat },
  vec {
    principal "user1-principal";
    principal "user2-principal";
  },
  1735689600000000000 : int,
  10_000_000_000 : nat
)' --network ic
```

**Option C: Batch Manual Allocation (CLI)**
```bash
dfx canister call airdrop batch_add_allocations '(
  1 : nat,
  vec {
    record {
      principal "user1-principal";
      10_000_000_000 : nat;
      "Early adopter"
    };
    record {
      principal "user2-principal";
      5_000_000_000 : nat;
      "Active user"
    };
  }
)' --network ic
```

#### Step 3: Fund Campaign (CLI Required)
Transfer PULSE tokens to the airdrop canister:

```bash
dfx canister call tokenmania icrc1_transfer '(
  record {
    to = record {
      owner = principal "27ftn-piaaa-aaaao-a4p6a-cai";
      subaccount = null;
    };
    amount = 50_000_000_000_000 : nat;
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
  }
)' --network ic
```

**Note**: Amount must be in smallest unit (multiply by 10^8)
- 500,000 PULSE = 50_000_000_000_000

#### Step 4: Start Campaign (UI)
1. Go to "Pending Campaigns" section
2. Find your campaign
3. Click "Start Campaign"
4. Campaign becomes active!

#### Step 5: Monitor (UI)
- Watch claims in real-time
- See allocation progress
- Track participant count

## UI vs CLI

| Task | UI Available | CLI Required | Best Method |
|------|--------------|--------------|-------------|
| Create campaign | ✅ Yes | Yes | UI (easier) |
| View campaigns | ✅ Yes | Yes | UI (visual) |
| Manual allocation (single) | ✅ Yes | Yes | UI (faster) |
| Bulk allocation | ❌ No | Yes | CLI (auto_allocate) |
| Fund campaign | ❌ No | Yes | CLI (token transfer) |
| Start campaign | ✅ Yes | Yes | UI (one click) |
| View allocations | ⚠️ Partial | Yes | CLI (detailed list) |
| Monitor progress | ✅ Yes | Yes | UI (real-time) |

## Fixing Your Current Campaign

Your current campaign (ID #1) has 0 allocations. Fix it using the UI:

### Quick Fix - Add Yourself

1. Go to `/admin/airdrops`
2. Find "Early Adopter Rewards Q1 2025" (Campaign #1)
3. Click "Add Allocation"
4. Fill in:
   ```
   Principal: 7aiiu-rkwon-btjqa-c5sel-564ua-q74km-yacm7-vtglq-hzgtb-wv5y5-rae
   Amount: 1000
   Reason: Platform founder - Early Adopter Rewards Q1 2025
   ```
5. Click "Add"
6. Refresh page - you should see:
   - Allocated: 1000 PULSE
   - Participants: 1 user

### Add More Users

Repeat the process for each user, or use CLI for bulk:

```bash
dfx canister call airdrop batch_add_allocations '(
  1 : nat,
  vec {
    record {
      principal "7aiiu-rkwon-btjqa-c5sel-564ua-q74km-yacm7-vtglq-hzgtb-wv5y5-rae";
      100_000_000_000 : nat;
      "Platform founder"
    };
  }
)' --network ic
```

## Environment Variables

The UI reads these from your environment:

- `NEXT_PUBLIC_AIRDROP_CANISTER_ID`: Airdrop canister ID
- `NEXT_PUBLIC_DFX_NETWORK`: Network (local or ic)
- `NEXT_PUBLIC_ADMIN_PRINCIPALS`: Your admin principal

Already configured in `.env.local`:
```bash
NEXT_PUBLIC_AIRDROP_CANISTER_ID="27ftn-piaaa-aaaao-a4p6a-cai"
NEXT_PUBLIC_ADMIN_PRINCIPALS="7aiiu-rkwon-btjqa-c5sel-564ua-q74km-yacm7-vtglq-hzgtb-wv5y5-rae"
```

## Next Steps

1. ✅ **Fix Campaign #1**: Add allocations using UI
2. ✅ **Test Claim**: Visit `/airdrop` to see if you can claim
3. 🔄 **Deploy**: Rebuild and deploy frontend with new UI
4. 📢 **Announce**: Let users know about the airdrop

## Deployment

After making changes, deploy the updated frontend:

```bash
cd frontend
npm run build
cd ..
dfx deploy polls_surveys_frontend --network ic
```

## Troubleshooting

### "Failed to create campaign"
- Check you're connected with admin principal
- Verify wallet has ICP for gas fees

### "Failed to add allocation"
- Verify principal format is correct
- Check campaign exists and is not expired
- Ensure amount is greater than 0

### "Failed to start campaign"
- Campaign must have at least 1 allocation
- Campaign must be funded with PULSE tokens
- Check campaign is in "Pending" status

### Can't See Admin Page
- Verify you're logged in with admin principal
- Check `NEXT_PUBLIC_ADMIN_PRINCIPALS` env variable
- Clear browser cache and re-login

## Advanced: Custom Allocation Logic

For complex allocation logic, continue using CLI:

### Tier-Based Allocation
```bash
dfx canister call airdrop auto_allocate_by_engagement '(
  1 : nat,
  vec { 1 : nat; 2 : nat; 3 : nat },
  vec { 1 : nat; 2 : nat },
  vec { principal "user1"; principal "user2" },
  vec {
    record { "Bronze"; 5 : nat; 1 : nat };
    record { "Silver"; 20 : nat; 2 : nat };
    record { "Gold"; 50 : nat; 5 : nat };
    record { "Platinum"; 100 : nat; 10 : nat };
  }
)' --network ic
```

### Activity-Based (Early Adopters)
```bash
dfx canister call airdrop auto_allocate_early_adopters '(
  1 : nat,
  vec { 1 : nat; 2 : nat; 3 : nat },
  vec { 1 : nat; 2 : nat },
  vec { principal "user1"; principal "user2" },
  1735689600000000000 : int,
  10_000_000_000 : nat
)' --network ic
```

## Summary

The admin UI makes campaign management much easier:

- ✅ Create campaigns without CLI
- ✅ Add manual allocations with forms
- ✅ Start campaigns with one click
- ✅ Monitor progress in real-time
- ✅ Professional, modern interface

For bulk operations and complex allocation logic, continue using the CLI commands documented in:
- `AUTO_ALLOCATION_GUIDE.md`
- `EARLY_ADOPTER_CAMPAIGN_GUIDE.md`
- `FIX_ALLOCATION.md`
