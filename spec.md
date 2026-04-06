# Saddam Islamic Family Network

## Current State
App fully functional with email/password auth, chat, admin dashboard, profiles. Recurring bug: `main.tsx` keeps getting `InternetIdentityProvider` and `useActor.ts` keeps getting `useInternetIdentity` after rebuilds, causing white screen and auth failures.

## Requested Changes (Diff)

### Add
- Console debug logs for login flow (already present in useEmailAuth.ts)

### Modify
- `main.tsx`: Replace `InternetIdentityProvider` with `EmailAuthProvider` (CRITICAL -- this is the white screen / auth crash root cause)
- `useActor.ts`: Replace `useInternetIdentity` with `useEmailAuth` (CRITICAL -- this causes actor to use wrong identity, breaking all backend calls including login)

### Remove
- Nothing

## Implementation Plan
1. Fix `main.tsx` -- use `EmailAuthProvider` from `./hooks/useEmailAuth`
2. Fix `useActor.ts` -- use `useEmailAuth` from `./useEmailAuth`
3. Validate: lint + typecheck + build
4. Deploy
