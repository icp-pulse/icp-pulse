# Analytics Setup Guide

This guide explains how to set up analytics for your TruePulse project using PostHog and DappRadar integration.

## PostHog Analytics Setup

### 1. Create PostHog Account

1. Go to [PostHog](https://posthog.com) and sign up for a free account
2. Create a new project for TruePulse
3. Copy your Project API Key from the project settings

### 2. Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# PostHog Analytics Configuration
NEXT_PUBLIC_POSTHOG_KEY=phc_your_actual_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 3. Analytics Events Tracked

The implementation automatically tracks these events:

#### Authentication Events
- `user_login` - When user connects via Internet Identity
- `user_logout` - When user disconnects

#### Poll Events
- `poll_created` - When a new poll is created
- `poll_voted` - When user votes on a poll
- `poll_viewed` - When user views a poll
- `poll_results_viewed` - When user views poll results

#### Survey Events
- `survey_created` - When a new survey is created
- `survey_submitted` - When user submits survey responses
- `survey_viewed` - When user views a survey

#### Reward Events
- `reward_claimed` - When user claims token rewards
- `rewards_page_viewed` - When user visits rewards page

#### Navigation Events
- `page_viewed` - Automatic page view tracking

#### Error Events
- `error_occurred` - When errors happen in the application

### 4. User Identification

Users are automatically identified using their ICP Principal when they authenticate.

## DappRadar Integration

### 1. DappRadar API Endpoint

A DappRadar-compatible API endpoint has been created at `/api/dappradar` that provides:

- Unique Active Wallets (UAW)
- Transaction counts
- Historical data
- Dapp metadata

### 2. Metrics Tracked for DappRadar

- **UAW**: Unique users who interact with polls/surveys
- **Transactions**: Poll votes + survey submissions + reward claims
- **Volume**: Not applicable for governance dapps
- **Balance**: Not applicable for governance dapps

### 3. Submit to DappRadar

1. Visit [DappRadar's submission portal](https://dappradar.com/submit-dapp)
2. Submit your dapp details:
   - **Name**: TruePulse
   - **Category**: Governance
   - **Blockchain**: Internet Computer (ICP)
   - **API Endpoint**: `https://your-domain.com/api/dappradar`
   - **Smart Contract Address**: Your backend canister ID

## Testing Analytics

### 1. Local Testing

1. Set up your PostHog project and add the API key to `.env.local`
2. Start your development server: `npm run dev`
3. Open browser developer tools and go to Network tab
4. Perform actions like login, creating polls, voting
5. Check PostHog dashboard for incoming events

### 2. Production Testing

1. Deploy with environment variables configured
2. Test all user flows
3. Verify events in PostHog dashboard
4. Check DappRadar API endpoint: `https://your-domain.com/api/dappradar`

## Analytics Dashboard Setup

### PostHog Dashboard Recommendations

Create these dashboards in PostHog:

1. **User Engagement Dashboard**
   - Daily/Weekly/Monthly active users
   - User retention cohorts
   - Session duration and frequency

2. **Poll & Survey Analytics**
   - Poll creation rate
   - Voting participation rate
   - Survey completion rate
   - Popular poll topics

3. **Rewards Analytics**
   - Reward claim rate
   - Average reward amounts
   - Token distribution patterns

4. **Error Monitoring**
   - Error frequency by type
   - Error rates by component
   - Failed operations tracking

## Privacy & Compliance

- User identification uses ICP Principals (pseudonymous)
- No personal data is collected
- Events track user interactions, not personal information
- Users can opt out via browser settings

## Next Steps

1. Set up PostHog account and configure environment variables
2. Deploy and test analytics tracking
3. Submit to DappRadar for ecosystem visibility
4. Create custom dashboards for insights
5. Set up alerts for critical metrics

## Support

For analytics implementation issues:
- Check browser console for errors
- Verify environment variables are set correctly
- Ensure PostHog project is active
- Test with PostHog's debug mode enabled