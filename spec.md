# Saddam Islamic Family Network (SIFN)

## Current State

The app is a full-stack family social network with email/password auth, chat (group + private), photo sharing, voice messages, admin dashboard, and an Islamic green/gold theme.

Two separate bugs exist right now:

**Bug A – White screen (recurring):**
- `src/frontend/src/hooks/useActor.ts` imports `useInternetIdentity` instead of `useEmailAuth`
- `src/frontend/src/main.tsx` wraps with `<InternetIdentityProvider>` instead of `<EmailAuthProvider>`
- This crash makes the whole app blank

**Bug B – Chat photo and voice messages disappear after 1–2 seconds:**
Root causes:
1. In `GroupChat.sendMessage` and `PrivateChat.sendMessage`, after the backend call succeeds the optimistic message is immediately removed (`setMessages(prev => prev.filter(m => m.id !== tempId))`) BEFORE the re-fetch completes. If the ICP query returns stale data (does not yet include the just-sent message), the message is gone with no fallback.
2. Same issue in `handleSendVoice` for both GroupChat and PrivateChat.
3. `hasImage` is computed as `!!(msg.imageBlobId || msg._localImageUrl) && !msg._isVoice`. For voice messages fetched from the backend, `msg._isVoice` is `undefined` (falsy), so `hasImage` evaluates to `true` even for voice messages. This causes `MessageImage` to also try to render voice blobs as images, showing a broken img element alongside or instead of the audio bubble.
4. On send failure, the optimistic message is silently removed. The user's requirement is to show an error state instead.

## Requested Changes (Diff)

### Add
- `_failed?: boolean` field to the local `ChatMessageView` interface in `ChatPage.tsx`
- Small error-state indicator in the message bubble (red exclamation icon) when `msg._failed === true`

### Modify

**`src/frontend/src/hooks/useActor.ts`:**
- Replace `import { useInternetIdentity } from "./useInternetIdentity"` with `import { useEmailAuth } from "./useEmailAuth"`
- Replace `const { identity } = useInternetIdentity()` with `const { identity } = useEmailAuth()`

**`src/frontend/src/main.tsx`:**
- Remove `import { InternetIdentityProvider } from "./hooks/useInternetIdentity"`
- Add `import { EmailAuthProvider } from "./hooks/useEmailAuth"`
- Replace `<InternetIdentityProvider>` / `</InternetIdentityProvider>` with `<EmailAuthProvider>` / `</EmailAuthProvider>`

**`src/frontend/src/pages/ChatPage.tsx` – merge logic fix:**

In `GroupChat.fetchMessages` and `PrivateChat.fetchConversation`, replace the current `setMessages` merge block with a smarter merge that keeps optimistic messages until they are confirmed in the backend. A message is confirmed when a backend message exists with the same `sender`, same `content`, and a timestamp within 30 seconds:

```
setMessages((prev) => {
  const optimistic = prev.filter((m) => m.id.startsWith("temp-"));
  const merged = [...sorted];
  for (const opt of optimistic) {
    const isConfirmed = sorted.some(
      (m) =>
        m.sender.toString() === opt.sender.toString() &&
        m.content === opt.content &&
        Math.abs(Number(m.createdTimestamp) - Number(opt.createdTimestamp)) < 30_000_000_000
    );
    if (!isConfirmed) merged.push(opt);
  }
  return merged.sort((a, b) => (a.createdTimestamp < b.createdTimestamp ? -1 : 1));
});
```

**`src/frontend/src/pages/ChatPage.tsx` – send success fix:**

In `GroupChat.sendMessage` and `PrivateChat.sendMessage`, replace:
```
setMessages((prev) => prev.filter((m) => m.id !== tempId));
setTimeout(() => fetchMessages(), 500);
```
With:
```
// Keep optimistic; mark as no longer uploading
setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _uploading: false } : m));
if (capturedPreview) URL.revokeObjectURL(capturedPreview);
// Fetch immediately and again after 2s as ICP query fallback
fetchMessages();
setTimeout(() => fetchMessages(), 2000);
```
(Remove the standalone `if (capturedPreview) URL.revokeObjectURL(capturedPreview)` that was already there before the old filter line.)

Same change in `GroupChat.handleSendVoice` and `PrivateChat.handleSendVoice`.

**`src/frontend/src/pages/ChatPage.tsx` – send failure fix:**

In all four send error handlers, replace:
```
setMessages((prev) => prev.filter((m) => m.id !== tempId));
```
With:
```
setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _uploading: false, _failed: true } : m));
```

**`src/frontend/src/pages/ChatPage.tsx` – hasImage/hasVoice fix:**

In the message rendering in both GroupChat and PrivateChat, change:
```javascript
const hasImage = !!(msg.imageBlobId || msg._localImageUrl) && !msg._isVoice;
```
To:
```javascript
const hasVoice = msg._isVoice || (msg.content === '🎤 Voice message' && !!msg.imageBlobId);
const hasImage = !!(msg.imageBlobId || msg._localImageUrl) && !hasVoice;
```
(The existing `hasVoice` line below should be removed since it's now declared above. Fix the variable order so `hasVoice` is declared first, then `hasImage` uses it.)

### Remove
- Nothing is removed from the UI or feature set

## Implementation Plan

1. Fix `useActor.ts`: swap `useInternetIdentity` → `useEmailAuth`
2. Fix `main.tsx`: swap `InternetIdentityProvider` → `EmailAuthProvider`
3. Fix `ChatPage.tsx`:
   a. Add `_failed?: boolean` to `ChatMessageView` interface
   b. Fix `hasVoice`/`hasImage` variable ordering in both GroupChat and PrivateChat render blocks
   c. Update `fetchMessages` merge logic in GroupChat
   d. Update `fetchConversation` merge logic in PrivateChat
   e. Fix `sendMessage` success path in GroupChat (don't remove optimistic, call fetchMessages)
   f. Fix `sendMessage` success path in PrivateChat
   g. Fix `handleSendVoice` success path in GroupChat
   h. Fix `handleSendVoice` success path in PrivateChat
   i. Fix all four error handlers to mark `_failed` instead of removing
   j. Add a small red error indicator in message bubble rendering for `_failed` messages
4. Run lint + typecheck + build; fix any issues
