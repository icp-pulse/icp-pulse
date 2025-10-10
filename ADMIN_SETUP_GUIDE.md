# Admin Access Setup Guide

## Overview

The admin routes are protected using client-side authentication checks. Only authorized principals can access admin pages.

## Setup Steps

### 1. Get Your Principal ID

First, you need to find your principal ID. There are several ways:

#### Option A: Use Internet Identity / NFID

1. Connect to your app with Internet Identity or NFID
2. Open browser console (F12)
3. Run:
   ```javascript
   // If using the app, this should log your principal
   console.log(window.ic?.plug?.principalId || 'Not connected via Plug')
   ```

#### Option B: Use dfx CLI

```bash
# Get your dfx identity principal
dfx identity get-principal

# Or get principal for a specific identity
dfx identity use <identity-name>
dfx identity get-principal
```

#### Option C: From the Frontend

Add this temporarily to your code:

```tsx
// In any component
import { useIcpAuth } from '@/components/IcpAuthProvider'

export function ShowMyPrincipal() {
  const { principalText } = useIcpAuth()

  return <div>My Principal: {principalText}</div>
}
```

### 2. Add Principal to Admin List

Edit `frontend/lib/admin-config.ts`:

```typescript
export const ADMIN_PRINCIPALS: string[] = [
  // Add your principal ID here
  'your-principal-id-here',

  // You can add multiple admins
  'another-admin-principal',

  // Environment variable principals are automatically added
]
```

**Example:**
```typescript
export const ADMIN_PRINCIPALS: string[] = [
  '2vxsx-fae-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q',
  'abc123-xyz-bbbbb-bbbbb-bbbbb-bbbbb-bbbbb-bbbbb-bbbbb-r',
]
```

### 3. Using Environment Variables (Optional)

You can also set admin principals via environment variable:

**Create/update `.env.local`:**
```bash
# Comma-separated list of admin principals
NEXT_PUBLIC_ADMIN_PRINCIPALS=principal1,principal2,principal3
```

**Example:**
```bash
NEXT_PUBLIC_ADMIN_PRINCIPALS=2vxsx-fae-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q,abc123-xyz-bbbbb-bbbbb-bbbbb-bbbbb-bbbbb-bbbbb-bbbbb-r
```

### 4. Rebuild Frontend

After adding your principal:

```bash
cd frontend
npm run build
# or
npm run dev  # for development
```

### 5. Test Admin Access

1. Navigate to `/admin` or `/admin/airdrops`
2. If not authenticated, you'll be redirected to home
3. If authenticated but not admin, you'll see "Unauthorized Access" page
4. If you're an admin, you'll see the admin interface

## Admin Routes

The following routes are protected:

- `/admin` - Main admin dashboard
- `/admin/airdrops` - Airdrop administration
- Any future `/admin/*` routes

## How Protection Works

### AdminGuard Component

All admin routes are wrapped in `<AdminGuard>`:

```tsx
<AdminGuard>
  {/* Admin content */}
</AdminGuard>
```

**Protection Flow:**
1. Checks if user is authenticated
2. If not → Redirect to home
3. If authenticated → Check if principal is in admin list
4. If not admin → Show "Unauthorized" page
5. If admin → Show admin content

### Layout-Level Protection

The admin layout (`app/admin/layout.tsx`) has AdminGuard, so **all** admin routes are automatically protected:

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  )
}
```

### useIsAdmin Hook

You can check admin status in any component:

```tsx
import { useIsAdmin } from '@/components/AdminGuard'

function MyComponent() {
  const isAdmin = useIsAdmin()

  return (
    <div>
      {isAdmin && <button>Admin Only Action</button>}
    </div>
  )
}
```

## Security Considerations

### ⚠️ Important Notes:

1. **Client-Side Only**: This protection is client-side only. Always validate admin status on the backend canister as well.

2. **Canister-Level Protection**: Ensure your backend canisters also check caller permissions:
   ```motoko
   // In your canister
   private var owner : Principal = Principal.fromText("your-admin-principal");

   public shared ({ caller }) func admin_function() : async Result<Text, Text> {
     if (not Principal.equal(caller, owner)) {
       return #err("Only owner can call this function");
     };
     // ... admin logic
   }
   ```

3. **Environment Variables**:
   - `.env.local` is NOT committed to git (good for local dev)
   - For production, set via Vercel/deployment platform
   - Never commit principals to public repos if they're sensitive

## Production Deployment

### Option 1: Hardcode in Source

Add principals directly to `admin-config.ts` (if repo is private):

```typescript
export const ADMIN_PRINCIPALS: string[] = [
  'production-admin-1',
  'production-admin-2',
]
```

### Option 2: Environment Variables

On your deployment platform (Vercel, etc.):

1. Go to project settings
2. Add environment variable: `NEXT_PUBLIC_ADMIN_PRINCIPALS`
3. Value: `principal1,principal2,principal3`
4. Redeploy

## Troubleshooting

### "Unauthorized Access" Page

**Issue**: You see unauthorized even though you're logged in

**Solutions**:
1. Check your principal is correctly added to `ADMIN_PRINCIPALS`
2. Verify no typos in the principal ID
3. Check environment variable is set correctly
4. Rebuild the frontend: `npm run build`
5. Clear browser cache and re-login

### Can't Find Your Principal

**Solution**: Add this debug component:

```tsx
// components/DebugPrincipal.tsx
"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'

export function DebugPrincipal() {
  const { principalText, isAuthenticated } = useIcpAuth()

  if (!isAuthenticated) return <div>Not authenticated</div>

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded">
      <div className="text-xs">Your Principal:</div>
      <div className="font-mono text-sm">{principalText}</div>
      <button
        onClick={() => navigator.clipboard.writeText(principalText || '')}
        className="mt-2 text-xs bg-blue-600 px-2 py-1 rounded"
      >
        Copy
      </button>
    </div>
  )
}
```

Add to any page temporarily:
```tsx
import { DebugPrincipal } from '@/components/DebugPrincipal'

export default function Page() {
  return (
    <>
      {/* Your page content */}
      <DebugPrincipal />
    </>
  )
}
```

### Principal Changes on Different Wallets

**Issue**: Different principal with II vs Plug vs NFID

**Explanation**: Each auth method can give different principals. Add all your principals:

```typescript
export const ADMIN_PRINCIPALS: string[] = [
  'my-ii-principal',      // Internet Identity
  'my-plug-principal',    // Plug Wallet
  'my-nfid-principal',    // NFID
]
```

## Testing Locally

### Test as Admin:

1. Get your local dfx identity principal: `dfx identity get-principal`
2. Add it to `ADMIN_PRINCIPALS`
3. Run `npm run dev`
4. Connect with Internet Identity (local)
5. Navigate to `/admin/airdrops`

### Test as Non-Admin:

1. Remove your principal from `ADMIN_PRINCIPALS`
2. Rebuild and connect
3. Try accessing `/admin/airdrops`
4. Should see "Unauthorized Access" page

## Quick Reference

### Files Modified:
- ✅ `frontend/lib/admin-config.ts` - Admin principal list
- ✅ `frontend/components/AdminGuard.tsx` - Protection component
- ✅ `frontend/app/admin/layout.tsx` - Admin layout with guard
- ✅ `frontend/app/admin/airdrops/page.tsx` - Airdrop admin page

### Commands:
```bash
# Get principal
dfx identity get-principal

# Set env variable (Linux/Mac)
export NEXT_PUBLIC_ADMIN_PRINCIPALS=principal1,principal2

# Rebuild frontend
cd frontend && npm run build

# Deploy
dfx deploy polls_surveys_frontend --network ic
```

## Next Steps

1. ✅ Add your principal to admin list
2. ✅ Test admin access works
3. 🚧 Implement full admin UI components (see `ADMIN_AIRDROP_INTERFACE.md`)
4. 🚧 Add backend permission checks in canisters
5. 🚧 Set up production admin principals

---

**Need Help?**

- Check if principal is correct: Copy it from the "Unauthorized" page
- Verify environment variable is loaded: Add `console.log(process.env.NEXT_PUBLIC_ADMIN_PRINCIPALS)` in `admin-config.ts`
- Clear all caches: Browser cache, localStorage, sessionStorage
