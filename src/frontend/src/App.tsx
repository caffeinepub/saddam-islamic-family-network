import { Toaster } from "@/components/ui/sonner";
import type { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

export type Page = "feed" | "profile" | "members" | "member-profile" | "chat";

// Helper: extract value from Motoko optional (?T => [] | [T] in JS)
function fromOptional<T>(opt: [] | [T] | T | null | undefined): T | null {
  if (opt === null || opt === undefined) return null;
  if (Array.isArray(opt)) return opt.length > 0 ? (opt[0] as T) : null;
  return opt as T;
}

function AppInner() {
  const { identity, email: authEmail, isInitializing } = useEmailAuth();
  const [currentPage, setCurrentPage] = useState<Page>("feed");
  const [selectedMember, setSelectedMember] = useState<Principal | null>(null);
  const isAuthenticated = !!identity;
  const { actor, isFetching: actorFetching } = useActor();

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  // Check user status from backend
  const { data: userStatus } = useQuery({
    queryKey: ["callerStatus"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerStatus();
    },
    enabled:
      !!actor &&
      !actorFetching &&
      isAuthenticated &&
      isFetched &&
      userProfile !== null,
    staleTime: 30_000,
  });

  const { data: callerEmailRaw } = useQuery({
    queryKey: ["callerEmail"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerEmail();
    },
    enabled: !!actor && !actorFetching && isAuthenticated && isFetched,
    staleTime: 60_000,
  });

  // Use isSuperAdmin() backend method as the authoritative check
  const { data: isSuperAdminBackend } = useQuery({
    queryKey: ["isSuperAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isSuperAdmin();
    },
    enabled: !!actor && !actorFetching && isAuthenticated,
    staleTime: 60_000,
  });

  // Extract email: prefer local auth email, fallback to backend
  const callerEmail = authEmail ?? fromOptional(callerEmailRaw);

  // Super admin detection: use backend flag OR email match
  const isSuperAdmin =
    isSuperAdminBackend === true ||
    callerEmail?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  useEffect(() => {
    if (!actor || actorFetching) return;
    actor.startAutoDeleteTimer().catch(() => {});
  }, [actor, actorFetching]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center pattern-overlay">
        <div className="bg-islamic-surface/90 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-full border-4 border-islamic-green border-t-transparent animate-spin" />
          <p className="text-islamic-green font-semibold text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        <Toaster position="top-center" />
      </>
    );
  }

  // Super Admin: show dedicated dashboard (skip pending screen entirely)
  if (isSuperAdmin && userProfile !== null && !profileLoading) {
    return (
      <>
        <Toaster position="top-center" />
        <SuperAdminDashboard />
      </>
    );
  }

  // Status checks for normal users only (only after profile loaded)
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
              आपका account block किया गया है।
            </p>
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
              border: "1px solid rgba(251,191,36,0.3)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h2 className="text-white font-bold text-lg mb-2">
              Account Not Approved
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              आपका account approve नहीं हुआ है, कृपया फिर से request करें।
            </p>
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
            <p className="text-white/60 text-sm leading-relaxed">
              آپ کی request Super Admin کے پاس بھیج دی گئی ہے۔
            </p>
            <p className="text-white/50 text-xs mt-2">
              आपकी account request Super Admin के पास भेज दी गई है। Approve होने के
              बाद आप app use कर पाएंगे।
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
      <MobileHeader currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <TopNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="flex-1 pt-16 pb-20 md:pb-4">
        {currentPage === "feed" && <FeedPage />}
        {currentPage === "profile" && <ProfilePage />}
        {currentPage === "members" && (
          <MembersPage
            onSelectMember={(p) => {
              setSelectedMember(p);
              setCurrentPage("member-profile");
            }}
          />
        )}
        {currentPage === "member-profile" && selectedMember && (
          <MemberProfilePage
            principal={selectedMember}
            onBack={() => setCurrentPage("members")}
          />
        )}
        {currentPage === "chat" && <ChatPage />}
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
