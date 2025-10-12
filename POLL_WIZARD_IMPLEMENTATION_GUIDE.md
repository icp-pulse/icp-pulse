# Poll Creation Wizard - Implementation Guide

## Overview

This document provides a comprehensive guide for the new multi-step poll creation wizard and enhanced voting interface that has been implemented for the ICP Pulse platform.

## New Components Created

### 1. Multi-Step Wizard Infrastructure
**File:** `frontend/components/polls/poll-creation-wizard.tsx`

A reusable wizard component that provides:
- Step-by-step navigation with progress indicator
- Visual step completion states
- Validation before proceeding to next step
- Back/Next/Submit navigation
- Responsive design

### 2. Step Components

#### Step 1: Basic Information
**File:** `frontend/components/polls/wizard-steps/step-basic-info.tsx`

Collects:
- Poll question/title
- Description
- Project/category selection
- Duration/expiry date

Features:
- Helpful tips and validation
- Pre-filled title support (from landing page)
- Default 7-day expiry
- Minimum future date validation

#### Step 2: Poll Options
**File:** `frontend/components/polls/wizard-steps/step-poll-options.tsx`

Handles:
- Adding/removing poll options
- AI-powered option generation
- Visual drag indicators (UI only)
- Progress tracking (filled vs. total options)

Features:
- Minimum 2 options required
- Dynamic add/remove with validation
- AI integration with error handling
- Real-time progress feedback

#### Step 3: Configuration
**File:** `frontend/components/polls/wizard-steps/step-configuration.tsx`

Configures:
- Target number of respondents
- Poll visibility (public/private/invite-only)
- Anonymous voting toggle
- Multiple choice selection toggle

Features:
- Visual configuration summary
- Toggle switches for boolean options
- Helpful tooltips and descriptions
- Real-time configuration preview

#### Step 4: Funding & Rewards
**File:** `frontend/components/polls/wizard-steps/step-funding-rewards.tsx`

Manages:
- Enable/disable rewards
- Funding source selection (self-funded/crowdfunded/treasury-funded)
- Token selection (ICP, PULSE, custom ICRC tokens)
- Reward distribution type:
  - **Fixed Reward**: Fixed amount per vote
  - **Equal Split**: Total fund divided equally among target respondents
- Funding amounts and calculations

Features:
- Real-time reward calculations
- Visual funding summary
- Token approval flow for self-funded polls
- Support for multiple funding models
- Auto-calculation for equal-split distribution

### 3. Enhanced Voting Interface
**File:** `frontend/components/polls/enhanced-voting-interface.tsx`

Provides:
- Large, clear poll display
- Poll statistics (votes, time left, rewards)
- Visual reward banner when applicable
- Single/multiple choice support
- Real-time validation
- Success state after voting
- Blockchain confirmation message

### 4. Type Definitions
**File:** `frontend/components/polls/poll-form-types.ts`

Defines:
- Form schema with Zod validation
- TypeScript types for all form fields
- Enums for funding sources and distribution types

## Key Features Implemented

### Multi-Step Poll Creation
1. **Progressive Disclosure**: Information is collected in logical steps
2. **Smart Validation**: Each step validates before allowing progression
3. **Visual Progress**: Progress bar and step indicators
4. **Flexible Navigation**: Can navigate back to previous steps
5. **Context Preservation**: Form state maintained across steps

### Funding Models

#### 1. Self-Funded
- Creator provides entire reward pool upfront
- Requires token approval before poll creation
- Supports ICP, PULSE, and custom ICRC tokens
- Automatic approval flow handling

#### 2. Crowdfunded
- Initial funding from creator
- Open for community contributions
- Collaborative reward pool
- Real-time tracking of contributors

#### 3. Treasury-Funded (New)
- Funded from project treasury
- Requires governance approval
- Enterprise/DAO use cases
- Transparent treasury allocation

### Reward Distribution Types

#### 1. Fixed Reward Per Vote
- Each voter receives a fixed amount
- Max votes = Total fund ÷ Reward amount
- Current implementation compatible
- Predictable rewards

#### 2. Equal Split (New)
- Total fund split equally among target respondents
- Reward = Total fund ÷ Target respondents
- Fair distribution model
- Requires target respondent count

### Enhanced Voting Experience
- Clear poll information display
- Visual reward indicators
- Real-time vote submission
- Success confirmation with reward details
- Blockchain transparency message

## Integration Instructions

### Step 1: Enable the New Wizard

Replace the current poll creation page with the new wizard:

```bash
# Backup current implementation
mv frontend/app/polls/new/page.tsx frontend/app/polls/new/page-old.tsx

# Activate new wizard
mv frontend/app/polls/new/page-new.tsx frontend/app/polls/new/page.tsx
```

### Step 2: Update Backend (Required)

The backend needs to be extended to support new fields:

#### Required Backend Changes:

1. **Add to Poll type:**
   ```motoko
   type PollConfig = {
     maxResponses: ?Nat;
     visibility: Text; // "public" | "private" | "invite-only"
     allowAnonymous: Bool;
     allowMultiple: Bool;
     rewardDistributionType: Text; // "fixed" | "equal-split"
   };
   ```

2. **Update `create_poll` function:**
   - Accept new configuration parameters
   - Store poll configuration
   - Handle equal-split reward calculation

3. **Update `create_custom_token_poll` function:**
   - Support treasury-funded polls
   - Handle reward distribution type
   - Store configuration

#### Optional Backend Enhancements:

1. **Treasury Integration:**
   ```motoko
   public shared(msg) func create_treasury_funded_poll(
     projectId: ProjectId,
     title: Text,
     description: Text,
     options: [Text],
     closesAt: Time,
     requestedFund: Nat,
     rewardPerVote: Nat,
     config: PollConfig
   ) : async Result.Result<PollId, Text>
   ```

2. **Governance Approval:**
   - Add approval workflow for treasury-funded polls
   - Track approval status
   - Notify on approval/rejection

### Step 3: Test the Implementation

1. **Test Poll Creation:**
   ```bash
   # Navigate to poll creation
   open http://localhost:3000/polls/new

   # Test each step:
   # - Fill basic information
   # - Add multiple options
   # - Try AI generation
   # - Configure settings
   # - Test funding options
   ```

2. **Test Funding Models:**
   - Self-funded with PULSE tokens
   - Self-funded with ICP
   - Crowdfunded poll
   - Equal-split vs. fixed rewards

3. **Test Voting Interface:**
   ```bash
   # Create a poll with rewards
   # Vote on the poll
   # Verify reward distribution
   # Check success state
   ```

## File Structure

```
frontend/
├── components/
│   └── polls/
│       ├── poll-creation-wizard.tsx          # Main wizard container
│       ├── poll-form-types.ts                # Type definitions
│       ├── enhanced-voting-interface.tsx     # Enhanced voting UI
│       └── wizard-steps/
│           ├── step-basic-info.tsx           # Step 1
│           ├── step-poll-options.tsx         # Step 2
│           ├── step-configuration.tsx        # Step 3
│           └── step-funding-rewards.tsx      # Step 4
└── app/
    └── polls/
        └── new/
            ├── page.tsx                       # Current implementation
            ├── page-new.tsx                   # New wizard (activate this)
            └── page-old.tsx                   # Backup (after migration)
```

## Benefits of the New Implementation

### User Experience
- **Reduced Cognitive Load**: Information divided into digestible steps
- **Clear Progress**: Users always know where they are
- **Fewer Errors**: Step-by-step validation prevents mistakes
- **Guided Experience**: Tips and help text at each step
- **Visual Feedback**: Real-time validation and calculations

### Feature Improvements
- **Multiple Funding Models**: Self, crowdfunded, and treasury options
- **Flexible Rewards**: Fixed or equal-split distribution
- **Better Configuration**: Clear settings organization
- **Enhanced Voting**: More engaging and informative interface

### Developer Benefits
- **Modular Architecture**: Each step is a separate component
- **Reusable Wizard**: Can be adapted for surveys/other forms
- **Type Safety**: Full TypeScript coverage
- **Maintainable**: Clear separation of concerns

## Migration Checklist

- [ ] Review all new components
- [ ] Test wizard navigation
- [ ] Verify form validation
- [ ] Test AI option generation
- [ ] Update backend schema
- [ ] Implement reward distribution types
- [ ] Add treasury funding support
- [ ] Test token approval flows
- [ ] Verify voting interface
- [ ] Test reward distribution
- [ ] Update documentation
- [ ] Deploy to testnet
- [ ] User acceptance testing
- [ ] Deploy to mainnet

## Future Enhancements

### Planned Features
1. **Drag-and-drop option reordering**
2. **Poll templates**
3. **Draft saving (localStorage)**
4. **Poll preview before submission**
5. **Advanced scheduling**
6. **Conditional logic** (show options based on previous answers)
7. **Poll duplication**
8. **Batch poll creation**

### Backend Requirements
1. **Poll configuration storage**
2. **Treasury integration**
3. **Governance workflow**
4. **Equal-split reward calculation**
5. **Enhanced analytics**

## Support and Issues

If you encounter any issues during implementation:

1. Check the component file headers for usage examples
2. Review type definitions in `poll-form-types.ts`
3. Verify backend API compatibility
4. Test with different wallet types (Plug, Internet Identity)
5. Check browser console for errors

## Conclusion

This implementation provides a significantly improved poll creation experience with support for multiple funding models, flexible reward distribution, and a guided step-by-step interface. The modular architecture makes it easy to extend and maintain, while providing users with a clear and intuitive experience.

The enhanced voting interface complements the creation wizard by providing voters with clear information about rewards, poll details, and blockchain transparency.

For questions or issues, please refer to the individual component files which contain detailed comments and usage examples.
