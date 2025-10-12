# Backend Update Summary - Poll Configuration Enhancement

## Overview

This document summarizes the backend updates made to support the new poll creation wizard with enhanced configuration options.

## New Types Added

### 1. FundingType (Line 86)
```motoko
type FundingType = { #SelfFunded; #Crowdfunded; #TreasuryFunded };
```
Defines three funding models:
- **SelfFunded**: Creator provides entire reward pool upfront
- **Crowdfunded**: Initial funding from creator, open for community contributions
- **TreasuryFunded**: Funded from project treasury (requires governance approval)

### 2. RewardDistributionType (Line 88)
```motoko
type RewardDistributionType = { #Fixed; #EqualSplit };
```
Defines reward distribution methods:
- **Fixed**: Each voter receives a fixed amount per vote
- **EqualSplit**: Total fund divided equally among target respondents

### 3. PollConfig (Lines 90-96)
```motoko
type PollConfig = {
  maxResponses: ?Nat;              // Target number of respondents
  allowAnonymous: Bool;            // Allow anonymous voting
  allowMultiple: Bool;             // Allow multiple choice selection
  visibility: Text;                // "public" | "private" | "invite-only"
  rewardDistributionType: RewardDistributionType; // How rewards are distributed
};
```

## Updated Types

### Poll Type (Lines 152-168)
Added new field:
```motoko
config : ?PollConfig; // Poll configuration
```

### FundingInfo Type (Lines 98-111)
Already supported the new `fundingType: FundingType` field.

## Function Updates

### 1. create_poll (Lines 407-520)

**New Parameters Added:**
```motoko
maxResponses : ?Nat,
allowAnonymous : ?Bool,
allowMultiple : ?Bool,
visibility : ?Text,
rewardDistributionType : ?Text
```

**Key Changes:**
- Parses and validates reward distribution type
- Creates PollConfig object from parameters
- Implements equal-split reward calculation:
  - For Equal Split: `rewardPerResponse = totalFund / targetResponses`
  - For Fixed: `maxResponses = totalFund / rewardPerVote`
- Stores config in Poll object

**Lines 459-474:** Equal-split calculation logic
```motoko
let (calculatedMaxResponses, calculatedRewardPerResponse) : (Nat, Nat64) = switch (distribution_type) {
  case (#EqualSplit) {
    let targetResponses = switch (maxResponses) {
      case (?target) target;
      case null 100; // Default to 100 if not specified
    };
    let rewardPerResp : Nat64 = if (targetResponses > 0) {
      totalFund / Nat64.fromNat(targetResponses)
    } else { 0 : Nat64 };
    (targetResponses, rewardPerResp)
  };
  case (#Fixed) {
    let maxResp = if (reward > 0) { Nat64.toNat(totalFund / reward) } else { 0 };
    (maxResp, reward)
  };
};
```

### 2. create_custom_token_poll (Lines 523-688)

**New Parameters Added:**
```motoko
maxResponses : ?Nat,
allowAnonymous : ?Bool,
allowMultiple : ?Bool,
visibility : ?Text,
rewardDistributionType : ?Text
```

**Key Changes:**
- Supports treasury-funded polls (lines 560-562)
- Creates PollConfig object (lines 569-576)
- Implements equal-split reward calculation (lines 624-642)
- Adds config field to Poll creation (line 677)

**Treasury-Funded Support:**
```motoko
let funding_type = if (fundingType == "crowdfunded") { #Crowdfunded }
                  else if (fundingType == "treasury-funded") { #TreasuryFunded }
                  else { #SelfFunded };
```

### 3. fund_poll (Lines 690-804)

**Updated Switch Statement (Lines 702-705):**
Added TreasuryFunded case to prevent public contributions to treasury-funded polls:
```motoko
case (#TreasuryFunded) {
  return #err("Poll is treasury-funded and does not accept public contributions")
};
```

## Frontend Integration

### Updated Files

**frontend/app/polls/new/page-new.tsx**

**Lines 52-56:** Extract new configuration fields
```typescript
const {
  title, description, projectId, expiresAt, options,
  fundingEnabled, fundingSource, selectedToken, totalFundAmount, rewardPerVote,
  maxResponses, allowAnonymous, allowMultiple, visibility, rewardDistributionType
} = values
```

**Lines 165-169:** Pass configuration to create_custom_token_poll
```typescript
maxResponses ? [BigInt(maxResponses)] : [],
allowAnonymous ? [allowAnonymous] : [],
allowMultiple ? [allowMultiple] : [],
visibility ? [visibility] : [],
rewardDistributionType ? [rewardDistributionType] : []
```

**Lines 194-198:** Pass configuration to create_poll
```typescript
maxResponses ? [BigInt(maxResponses)] : [],
allowAnonymous ? [allowAnonymous] : [],
allowMultiple ? [allowMultiple] : [],
visibility ? [visibility] : [],
rewardDistributionType ? [rewardDistributionType] : []
```

## Breaking Changes

### Backend API Changes

Both `create_poll` and `create_custom_token_poll` functions now require **5 additional parameters**:

1. `maxResponses : ?Nat` - Target number of respondents
2. `allowAnonymous : ?Bool` - Allow anonymous voting
3. `allowMultiple : ?Bool` - Allow multiple choice selection
4. `visibility : ?Text` - Poll visibility ("public", "private", "invite-only")
5. `rewardDistributionType : ?Text` - Distribution type ("fixed", "equal-split")

### TypeScript Declaration Updates Required

The TypeScript declaration files need to be regenerated to reflect the new function signatures:

```bash
dfx generate polls_surveys_backend
```

This will update:
- `src/declarations/polls_surveys_backend/polls_surveys_backend.did.d.ts`
- `src/declarations/polls_surveys_backend/polls_surveys_backend.did.js`

## Deployment Steps

### 1. Deploy Backend Updates

```bash
# Build the backend
dfx build polls_surveys_backend

# Deploy to local network (for testing)
dfx deploy polls_surveys_backend

# Deploy to IC mainnet (when ready)
dfx deploy --network ic polls_surveys_backend
```

### 2. Update TypeScript Declarations ✅ COMPLETED

```bash
# Regenerate TypeScript declarations
dfx generate polls_surveys_backend
```

**Status**: TypeScript declarations have been successfully regenerated and now include:
- `PollConfig` interface (maxResponses, allowAnonymous, allowMultiple, visibility, rewardDistributionType)
- `FundingType` with TreasuryFunded option
- `RewardDistributionType` enum
- Updated `create_poll` signature with 5 new optional parameters
- Updated `create_custom_token_poll` signature with 5 new optional parameters

### 3. Activate Frontend Wizard

The new wizard is ready in `frontend/app/polls/new/page-new.tsx`. To activate it:

```bash
# Backup current implementation
mv frontend/app/polls/new/page.tsx frontend/app/polls/new/page-old.tsx

# Activate new wizard
mv frontend/app/polls/new/page-new.tsx frontend/app/polls/new/page.tsx
```

### 4. Build and Deploy Frontend

```bash
# Build frontend
npm run build

# Deploy (follow your deployment process)
```

## Testing Checklist

### Backend Testing

- [ ] Create poll with fixed reward distribution
- [ ] Create poll with equal-split reward distribution
- [ ] Create self-funded poll with custom token
- [ ] Create crowdfunded poll
- [ ] Attempt to fund treasury-funded poll (should fail)
- [ ] Vote on poll with equal-split distribution
- [ ] Vote on poll with fixed distribution
- [ ] Verify reward calculations are correct
- [ ] Test anonymous voting configuration
- [ ] Test multiple choice configuration

### Frontend Testing

- [ ] Navigate through all 4 wizard steps
- [ ] Fill basic information
- [ ] Add poll options
- [ ] Generate options with AI
- [ ] Configure poll settings (visibility, anonymous, multiple choice)
- [ ] Configure funding (self/crowdfunded/treasury)
- [ ] Select reward distribution type
- [ ] Submit poll and verify creation
- [ ] Verify poll displays correctly after creation

## Backward Compatibility

### Database Migration

**No migration required** - The new `config` field is optional (`?PollConfig`), so existing polls without this field will continue to work.

### Frontend Compatibility

Old frontend code calling `create_poll` or `create_custom_token_poll` without the new parameters will fail. All calling code must be updated.

## Known Issues & Warnings

### Motoko Compiler Warnings

Several unused identifier warnings remain (these are non-critical):
- Line 1048: unused identifier `e`
- Line 1405: unused identifier `createReward`
- Line 1696: unused identifier `msg`
- Line 1757: unused identifier `error`
- Lines 1769-1771: unused identifiers in `parseOpenAIResponse`

These can be cleaned up in a future update.

## Future Enhancements

### Planned Features

1. **Treasury Integration**
   - Implement treasury withdrawal logic for TreasuryFunded polls
   - Add governance approval workflow

2. **Anonymous Voting**
   - Implement anonymous voting using zero-knowledge proofs or commitment schemes
   - Track votes without linking to voter identity

3. **Multiple Choice Voting**
   - Update vote function to accept multiple option IDs
   - Implement ranked choice voting

4. **Private/Invite-Only Polls**
   - Add whitelist management for invite-only polls
   - Implement access control checks

5. **Enhanced Analytics**
   - Track polls by configuration type
   - Monitor reward distribution efficiency
   - Report on funding model performance

## Support

For questions or issues:
1. Review component documentation in `POLL_WIZARD_IMPLEMENTATION_GUIDE.md`
2. Check individual component files for detailed comments
3. Review type definitions in `frontend/components/polls/poll-form-types.ts`

## Summary

The backend has been successfully updated to support:
- ✅ Three funding models (self, crowdfunded, treasury)
- ✅ Two reward distribution types (fixed, equal-split)
- ✅ Poll configuration options (anonymous, multiple choice, visibility, target respondents)
- ✅ Equal-split reward calculation logic
- ✅ Treasury-funded poll protection
- ✅ Frontend integration with new parameters

All critical compilation errors have been resolved. The implementation is ready for testing and deployment.
