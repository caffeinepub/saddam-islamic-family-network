# Saddam Islamic Family Network - Super Admin System

## Current State
App has: news feed, profile system, group/private chat, notifications, theme switcher, hamburger menu, signup/login with relation+age+photo. UserProfile has: username, bio, profilePhotoId, coverPhotoId. No user status or admin management exists.

## Requested Changes (Diff)

### Add
- `email` field to UserProfile
- `signupDate` stored per user (Time.now() on first profile save)
- `UserStatus` type: `#pending | #approved | #rejected | #blocked`
- `UserAdminRole` type: `#none | #helperAdmin | #superAdmin`
- `userStatuses` map: Principal -> UserStatus
- `userAdminRoles` map: Principal -> UserAdminRole
- `getCallerStatus()` query: returns caller's current status
- `getAllUsersAdminView()` query: returns full user list with profile + status + role + signupDate (super admin / helper admin only)
- `updateUserStatus(user, status)` update: admin/superAdmin only
- `setHelperAdmin(user, isHelper)` update: superAdmin only
- Backend constant: SUPER_ADMIN_EMAIL = "mdsaddamislamic@gmail.com"
- Backend helper: `isSuperAdmin(caller)` checks if caller's stored email == SUPER_ADMIN_EMAIL
- Super admin auto-approved on saveCallerUserProfile
- New users default to #pending on saveCallerUserProfile
- Frontend: SuperAdminDashboard page
- Frontend: App.tsx routing to SuperAdminDashboard if email matches super admin
- Frontend: Login/access blocking for rejected/blocked users

### Modify
- `UserProfile`: add `email: Text` field
- `saveCallerUserProfile`: on first save, set status=pending (or approved if super admin email), set signupDate
- App.tsx: after login, check if user's email == super admin email -> route to SuperAdminDashboard
- AuthScreen signup: pass email in profile save

### Remove
- Nothing removed

## Implementation Plan
1. Update backend main.mo: add email to UserProfile, add status/role/signupDate maps, add admin query/update methods, add SUPER_ADMIN_EMAIL check
2. Regenerate backend bindings
3. Update frontend App.tsx to detect super admin and block rejected/blocked users
4. Create SuperAdminDashboard.tsx with user list, status badges, 3-dot action menu
5. Update AuthScreen to pass email in signup profile data
6. Validate and build
