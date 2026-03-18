import type { Identity } from "@icp-sdk/core/agent";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import {
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const SESSION_KEY = "sifn_email_session";

interface StoredSession {
  email: string;
  seedHex: string;
}

export type EmailAuthContextType = {
  identity: Identity | undefined;
  email: string | undefined;
  isInitializing: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  clear: () => void;
};

const EmailAuthContext = createContext<EmailAuthContextType | undefined>(
  undefined,
);

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveSeed(
  email: string,
  password: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(`sifn:${email.toLowerCase().trim()}`),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

export async function deriveIdentity(
  email: string,
  password: string,
): Promise<Ed25519KeyIdentity> {
  const seed = await deriveSeed(email, password);
  return Ed25519KeyIdentity.generate(seed);
}

export function EmailAuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const { email: storedEmail, seedHex } = JSON.parse(
            stored,
          ) as StoredSession;
          const seed = hexToBytes(seedHex);
          const id = Ed25519KeyIdentity.generate(seed);
          if (!cancelled) {
            setIdentity(id);
            setEmail(storedEmail);
          }
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (emailInput: string, password: string): Promise<boolean> => {
      setIsLoggingIn(true);
      try {
        const { createActorWithConfig } = await import("../config");
        const { getSecretParameter } = await import("../utils/urlParams");

        const id = await deriveIdentity(emailInput, password);
        const actor = await createActorWithConfig({
          agentOptions: { identity: id },
        });
        const adminToken = getSecretParameter("caffeineAdminToken") || "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (actor as any)._initializeAccessControlWithSecret(adminToken);

        // Verify account exists (correct password → same principal → same profile)
        const profile = await actor.getCallerUserProfile();
        if (profile === null) {
          console.warn("[EmailAuth] No profile found for this identity");
          return false;
        }

        // Persist session using derived seed
        const seed = await deriveSeed(emailInput, password);
        const seedHex = bytesToHex(seed);
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            email: emailInput,
            seedHex,
          } satisfies StoredSession),
        );

        setIdentity(id);
        setEmail(emailInput);
        return true;
      } catch (e) {
        console.error("[EmailAuth] Login error:", e);
        return false;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIdentity(undefined);
    setEmail(undefined);
  }, []);

  const value = useMemo(
    () => ({ identity, email, isInitializing, isLoggingIn, login, clear }),
    [identity, email, isInitializing, isLoggingIn, login, clear],
  );

  return createElement(EmailAuthContext.Provider, { value, children });
}

export function useEmailAuth(): EmailAuthContextType {
  const ctx = useContext(EmailAuthContext);
  if (!ctx)
    throw new Error("useEmailAuth must be used within EmailAuthProvider");
  return ctx;
}
