// useMessageReactions.ts — lightweight hook to fetch reactions for a single message.
// Supports optimistic update: reactions reflect instantly on click, no refresh needed.

import { useEffect, useRef, useState } from "react";
import type { Backend } from "../backend";

interface ReactionEntry {
  principal: string;
  emoji: string;
}

interface EmojiCount {
  emoji: string;
  count: number;
}

interface UseMessageReactionsResult {
  reactionCounts: EmojiCount[];
  myReaction: string | null;
  isLoading: boolean;
  addReactionOptimistic: (emoji: string) => Promise<void>;
}

// Cache to avoid re-fetching on re-renders; key = messageId
const reactionsCache = new Map<string, [string, string][]>();

export function useMessageReactions(
  messageId: string,
  actor: Backend | null,
  myPrincipal: string | undefined,
): UseMessageReactionsResult {
  const [reactions, setReactions] = useState<ReactionEntry[]>(() => {
    const cached = reactionsCache.get(messageId);
    if (cached) {
      return cached.map(([principal, emoji]) => ({ principal, emoji }));
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const actorRef = useRef(actor);
  actorRef.current = actor;

  useEffect(() => {
    if (!actor || !messageId) return;

    // Skip temp messages (not yet saved)
    if (messageId.startsWith("temp-")) return;

    // Use cache if available
    if (reactionsCache.has(messageId)) {
      const cached = reactionsCache.get(messageId)!;
      setReactions(cached.map(([principal, emoji]) => ({ principal, emoji })));
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    actor
      .getMessageReactions(messageId)
      .then((result) => {
        if (cancelled) return;
        reactionsCache.set(messageId, result);
        setReactions(
          result.map(([principal, emoji]) => ({ principal, emoji })),
        );
      })
      .catch(() => {
        // silent fail
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [messageId, actor]);

  // Optimistic addReaction: update local state instantly, then sync backend
  const addReactionOptimistic = async (emoji: string): Promise<void> => {
    if (!myPrincipal) return;

    // Apply optimistic update synchronously before awaiting backend
    setReactions((prev) => {
      // Remove any existing reaction from this user
      const withoutMine = prev.filter((r) => r.principal !== myPrincipal);
      // Find current reaction by this user
      const myOldReaction = prev.find((r) => r.principal === myPrincipal);
      // Toggle: if clicking same emoji again, remove it; otherwise add new
      if (myOldReaction?.emoji === emoji) {
        // Toggle off — update cache too
        const updated = withoutMine;
        reactionsCache.set(
          messageId,
          updated.map((r) => [r.principal, r.emoji]),
        );
        return updated;
      }
      // Add new reaction
      const updated = [...withoutMine, { principal: myPrincipal, emoji }];
      reactionsCache.set(
        messageId,
        updated.map((r) => [r.principal, r.emoji]),
      );
      return updated;
    });

    // Sync with backend (silent fail — optimistic state already applied)
    try {
      const a = actorRef.current;
      if (a) {
        await a.addReaction(messageId, emoji);
        // Re-fetch to sync with real server state
        const result = await a.getMessageReactions(messageId);
        reactionsCache.set(messageId, result);
        setReactions(
          result.map(([principal, em]) => ({ principal, emoji: em })),
        );
      }
    } catch {
      // silent fail — optimistic state remains visible
    }
  };

  const reactionCounts: EmojiCount[] = [];
  const emojiMap = new Map<string, number>();
  for (const r of reactions) {
    emojiMap.set(r.emoji, (emojiMap.get(r.emoji) ?? 0) + 1);
  }
  for (const [emoji, count] of emojiMap) {
    reactionCounts.push({ emoji, count });
  }

  const myReaction =
    reactions.find((r) => r.principal === myPrincipal)?.emoji ?? null;

  return { reactionCounts, myReaction, isLoading, addReactionOptimistic };
}

// Call this to invalidate cache after adding/removing a reaction
export function invalidateReactionCache(messageId: string): void {
  reactionsCache.delete(messageId);
}
