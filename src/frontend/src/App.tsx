import { Toaster } from "@/components/ui/sonner";
import type { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { Component, type ReactNode, useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { MobileHeader } from "./components/TopNav";
import TopNav from "./components/TopNav";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useActor } from "./hooks/useActor";
import { useEmailAuth } from "./hooks/useEmailAuth";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import AuthScreen from "./pages/AuthScreen";
import ChatPage from "./pages/ChatPage";
import FeedPage from "./pages/FeedPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import MembersPage from "./pages/MembersPage";
import ProfilePage from "./pages/ProfilePage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

const SUPER_ADMIN_EMAIL = "mdsaddamislamic@gmail.com";

export type Page =
  | "feed"
  | "profile"
  | "members"
  | "member-profile"
  | "chat"
  | "admin-dashboard";

function fromOptional<T>(opt: [] | [T] | T | null | undefined): T | null {
  if (opt === null || opt === undefined) return null;
  if (Array.isArray(opt)) return opt.length > 0 ? (opt[0] as T) : null;
  return opt as T;
}

class PageErrorBoundary extends Component<
  { children: ReactNode; pageName?: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; pageName?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(
      `[PageErrorBoundary] ${this.props.pageName ?? "page"} crashed:`,
      error,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-white font-bold text-lg mb-2">
            Something went wrong
          </h3>
          <p className="text-white/50 text-sm mb-4">
            This page couldn't load. Please try refreshing.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "white",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        <p className="text-green-400 font-semibold text-sm">{label}</p>
      </div>
    </div>
  );
}

function AppInner() {
  const { identity, email: authEmail, isInitializing, clear } = useEmailAuth();
  const [currentPage, setCurrentPage] = useState<Page>("feed");
  const [selectedMember, setSelectedMember] = useState<Principal | null>(null);
  const [signupAfterReject, setSignupAfterReject] = useState(false);
  const isAuthenticated = !!identity;
  const { actor, isFetching: actorFetching } = useActor();

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    isError: profileError,
  } = useGetCallerUserProfile();

  const { data: userStatus } = useQuery({
    queryKey: ["callerStatus"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerStatus();
      } catch {
        return null;
      }
    },
    enabled:
      !!actor &&
      !actorFetching &&
      isAuthenticated &&
      isFetched &&
      userProfile !== null,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: callerEmailRaw } = useQuery({
    queryKey: ["callerEmail"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerEmail();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && isAuthenticated && isFetched,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: isSuperAdminBackend } = useQuery({
    queryKey: ["isSuperAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isSuperAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !actorFetching && isAuthenticated,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: callerAdminRole } = useQuery({
    queryKey: ["callerAdminRole"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerAdminRole();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && isAuthenticated && isFetched,
    staleTime: 60_000,
    retry: 1,
  });

  const callerEmail = authEmail ?? fromOptional(callerEmailRaw);

  const isSuperAdmin =
    isSuperAdminBackend === true ||
    callerEmail?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const isHelperAdmin =
    callerAdminRole !== null &&
    callerAdminRole !== undefined &&
    "helperAdmin" in (callerAdminRole as object);

  const isAnyAdmin = isSuperAdmin || isHelperAdmin;

  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    isFetched &&
    userProfile === null &&
    !profileError;

  useEffect(() => {
    if (!actor || actorFetching) return;
    actor.startAutoDeleteTimer().catch(() => {});
  }, [actor, actorFetching]);

  if (isInitializing) {
    return <Spinner label="Loading app…" />;
  }

  if (!isAuthenticated) {
    return (
      <PageErrorBoundary pageName="AuthScreen">
        <AuthScreen initialTab={signupAfterReject ? "signup" : "signin"} />
        <Toaster position="top-center" />
      </PageErrorBoundary>
    );
  }

  if (profileLoading && !isFetched) {
    return <Spinner label="Loading profile…" />;
  }

  if (
    !isSuperAdmin &&
    !profileLoading &&
    isFetched &&
    userProfile !== null &&
    userStatus
  ) {
    if ("blocked" in userStatus) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{
            background: "linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 100%)",
          }}
        >
          <div
            className="max-w-sm w-full rounded-2xl p-8 text-center"
            style={{
              background: "rgba(10,46,26,0.85)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h2 className="text-white font-bold text-lg mb-2">
              Account Blocked
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              آپ کا اکاؤنٹ بلاک کیا گیا ہے۔
            </p>
            <p className="text-white/50 text-xs mt-2">
              Aapka account block kiya gaya hai. Family admin se contact karein.
            </p>
            <button
              type="button"
              onClick={() => clear()}
              className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold text-white/70 border border-white/20 hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }

    if ("rejected" in userStatus) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{
            background: "linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 100%)",
          }}
        >
          <div
            className="max-w-sm w-full rounded-2xl p-8 text-center"
            style={{
              background: "rgba(10,46,26,0.85)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-white font-bold text-lg mb-2">
              Account Rejected
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-1">
              Aapka account approve nahi hua.
            </p>
            <p className="text-white/50 text-xs leading-relaxed mb-5">
              Please dubara signup karein. Same email se naya account bana sakte
              hain.
            </p>
            <button
              type="button"
              onClick={() => {
                setSignupAfterReject(true);
                clear();
              }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
              }}
            >
              Dobara Signup Karein
            </button>
            <button
              type="button"
              onClick={() => clear()}
              className="mt-3 w-full py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }

    if ("pending" in userStatus) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{
            background: "linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 100%)",
          }}
        >
          <div
            className="max-w-sm w-full rounded-2xl p-8 text-center"
            style={{
              background: "rgba(10,46,26,0.85)",
              border: "1px solid rgba(251,191,36,0.3)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">
              Pending Approval
            </h2>
            <p className="text-white/70 text-sm mb-1">
              Aapka account review ke liye bhej diya gaya hai.
            </p>
            <p className="text-white/50 text-xs mt-2 leading-relaxed">
              Admin approve karne ke baad aap app use kar sakte hain.
            </p>
            <button
              type="button"
              onClick={() => clear()}
              className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold text-white/70 border border-white/20 hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
      <MobileHeader
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isAnyAdmin={isAnyAdmin}
      />
      <TopNav
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isAnyAdmin={isAnyAdmin}
      />

      <main className="flex-1 pt-16 pb-20 md:pb-4">
        {currentPage === "feed" && (
          <PageErrorBoundary pageName="FeedPage">
            <FeedPage />
          </PageErrorBoundary>
        )}
        {currentPage === "profile" && (
          <PageErrorBoundary pageName="ProfilePage">
            <ProfilePage
              setCurrentPage={setCurrentPage}
              isAnyAdmin={isAnyAdmin}
            />
          </PageErrorBoundary>
        )}
        {currentPage === "admin-dashboard" && (
          <PageErrorBoundary pageName="AdminDashboard">
            <SuperAdminDashboard onBack={() => setCurrentPage("profile")} />
          </PageErrorBoundary>
        )}
        {currentPage === "members" && (
          <PageErrorBoundary pageName="MembersPage">
            <MembersPage
              onSelectMember={(p) => {
                setSelectedMember(p);
                setCurrentPage("member-profile");
              }}
            />
          </PageErrorBoundary>
        )}
        {currentPage === "member-profile" && selectedMember && (
          <PageErrorBoundary pageName="MemberProfilePage">
            <MemberProfilePage
              principal={selectedMember}
              onBack={() => setCurrentPage("members")}
            />
          </PageErrorBoundary>
        )}
        {currentPage === "chat" && (
          <PageErrorBoundary pageName="ChatPage">
            <ChatPage />
          </PageErrorBoundary>
        )}
      </main>

      <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
