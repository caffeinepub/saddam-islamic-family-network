// useActor.ts — provides a Backend actor instance using email-derived identity.
// CRITICAL: MUST use useEmailAuth (NEVER useInternetIdentity) — white screen prevention.

import { useEffect, useRef, useState } from "react";
import type { Backend } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useEmailAuth } from "./useEmailAuth";

interface UseActorResult {
  actor: Backend | null;
  isFetching: boolean;
}

export function useActor(): UseActorResult {
  const { identity, isInitializing } = useEmailAuth();
  const [actor, setActor] = useState<Backend | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    let cancelled = false;

    if (isInitializing) {
      setIsFetching(true);
      return;
    }

    if (!identity) {
      setActor(null);
      setIsFetching(false);
      return;
    }

    setIsFetching(true);

    (async () => {
      try {
        const newActor = await createActorWithConfig({
          agentOptions: { identity },
        });

        // Initialize access control with secret token if available
        try {
          const adminToken = getSecretParameter("caffeineAdminToken") || "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (newActor as any)._initializeAccessControlWithSecret(
            adminToken,
          );
        } catch {
          // Silent fail — token may not be needed for normal users
        }

        if (!cancelled) {
          setActor(newActor);
        }
      } catch (err) {
        console.error("[useActor] Failed to create actor:", err);
        if (!cancelled) {
          setActor(null);
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity, isInitializing]);

  return { actor, isFetching };
}
