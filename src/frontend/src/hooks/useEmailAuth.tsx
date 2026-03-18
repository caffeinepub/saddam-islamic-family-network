import { Ed25519KeyIdentity } from "@dfinity/identity";
import type { Identity } from "@icp-sdk/core/agent";
import {
  type PropsWithChildren,
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

/** Derives a stable Ed25519 identity from email + password using PBKDF2. */
export async function deriveIdentity(
  email: string,
  password: string,
): Promise<Ed25519KeyIdentity> {
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
      salt: enc.encode(email.trim().toLowerCase()),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Ed25519KeyIdentity.generate(new Uint8Array(bits));
}

export type EmailAuthContext = {
  identity: Identity | undefined;
  email: string | undefined;
  isInitializing: boolean;
  isLoggingIn: boolean;
  isLoginError: boolean;
  loginError?: Error;
  /** Derive identity from email+password and store session. Returns true on success. */
  login: (email: string, password: string) => Promise<boolean>;
  /** Clear session / logout. */
  clear: () => void;
};

const Ctx = createContext<EmailAuthContext | undefined>(undefined);

function assertCtx(
  ctx: EmailAuthContext | undefined,
): asserts ctx is EmailAuthContext {
  if (!ctx)
    throw new Error(
      "EmailAuthProvider is not present. Wrap your component tree with it.",
    );
}

export function useEmailAuth(): EmailAuthContext {
  const ctx = useContext(Ctx);
  assertCtx(ctx);
  return ctx;
}

export function EmailAuthProvider({ children }: PropsWithChildren<object>) {
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<Error | undefined>(undefined);

  // Restore session on mount
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      setIsInitializing(false);
      return;
    }
    try {
      const { email: storedEmail, password: storedPassword } = JSON.parse(
        raw,
      ) as { email: string; password: string };
      deriveIdentity(storedEmail, storedPassword)
        .then((id) => {
          setIdentity(id);
          setEmail(storedEmail);
          setIsInitializing(false);
        })
        .catch(() => {
          localStorage.removeItem(SESSION_KEY);
          setIsInitializing(false);
        });
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setIsInitializing(false);
    }
  }, []);

  const login = useCallback(
    async (inputEmail: string, inputPassword: string): Promise<boolean> => {
      setIsLoggingIn(true);
      setLoginError(undefined);
      try {
        const id = await deriveIdentity(inputEmail, inputPassword);
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ email: inputEmail.trim(), password: inputPassword }),
        );
        setIdentity(id);
        setEmail(inputEmail.trim());
        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Authentication failed");
        setLoginError(error);
        return false;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    // Clear all signup/pending data too
    localStorage.removeItem("pendingSignupData");
    localStorage.removeItem("pendingSignupPhoto");
    setIdentity(undefined);
    setEmail(undefined);
    setLoginError(undefined);
  }, []);

  const value = useMemo<EmailAuthContext>(
    () => ({
      identity,
      email,
      isInitializing,
      isLoggingIn,
      isLoginError: !!loginError,
      loginError,
      login,
      clear,
    }),
    [identity, email, isInitializing, isLoggingIn, loginError, login, clear],
  );

  return createElement(Ctx.Provider, { value, children });
}
