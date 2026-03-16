import { Toaster } from "@/components/ui/sonner";
import type { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { MobileHeader } from "./components/TopNav";
import TopNav from "./components/TopNav";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveUserProfile,
} from "./hooks/useQueries";
import AuthScreen from "./pages/AuthScreen";
import ChatPage from "./pages/ChatPage";
import FeedPage from "./pages/FeedPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import MembersPage from "./pages/MembersPage";
import ProfilePage from "./pages/ProfilePage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

const SUPER_ADMIN_EMAIL = "mdsaddamislamic@gmail.com";

export type Page = "feed" | "profile" | "members" | "member-profile" | "chat";

function AppInner() {
  const { identity, isInitializing } = useInternetIdentity();
  const [currentPage, setCurrentPage] = useState<Page>("feed");
  const [selectedMember, setSelectedMember] = useState<Principal | null>(null);
  const isAuthenticated = !!identity;
  const { actor, isFetching: actorFetching } = useActor();
  const saveProfile = useSaveUserProfile();
  const saveProfileRef = useRef(saveProfile);
  saveProfileRef.current = saveProfile;
  const autoSaveAttempted = useRef(false);

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

  const { data: callerEmail } = useQuery({
    queryKey: ["callerEmail"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerEmail();
    },
    enabled:
      !!actor &&
      !actorFetching &&
      isAuthenticated &&
      isFetched &&
      userProfile !== null,
    staleTime: 60_000,
  });

  const isSuperAdmin = callerEmail === SUPER_ADMIN_EMAIL;

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  useEffect(() => {
    if (!actor || actorFetching) return;
    actor.startAutoDeleteTimer().catch(() => {});
  }, [actor, actorFetching]);

  // Auto-save profile from signup data if available
  useEffect(() => {
    if (!actor || actorFetching || !isAuthenticated) return;
    if (!isFetched || userProfile !== null) return;
    if (autoSaveAttempted.current) return;

    const pendingRaw = localStorage.getItem("pendingSignupData");
    if (!pendingRaw) return;

    autoSaveAttempted.current = true;

    try {
      const pending = JSON.parse(pendingRaw) as {
        username: string;
        email: string;
        relation: string;
        age: string;
        photoDataUrl: string | null;
      };

      const bio = `Relation: ${pending.relation} | Age: ${pending.age}`;

      saveProfileRef.current
        .mutateAsync({
          username: pending.username,
          bio,
          profilePhotoId: undefined,
          coverPhotoId: undefined,
        })
        .then(async () => {
          if (pending.email && actor) {
            await actor.saveCallerEmail(pending.email).catch(() => {});
          }
          localStorage.removeItem("pendingSignupData");
          localStorage.removeItem("pendingSignupPhoto");
        })
        .catch(() => {
          autoSaveAttempted.current = false;
        });
    } catch {
      localStorage.removeItem("pendingSignupData");
    }
  }, [actor, actorFetching, isAuthenticated, isFetched, userProfile]);

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

  // Super Admin: show dedicated dashboard
  if (isSuperAdmin && userProfile !== null && !profileLoading) {
    return (
      <>
        <Toaster position="top-center" />
        <SuperAdminDashboard />
      </>
    );
  }

  // Status checks for normal users (only after profile loaded)
  if (!profileLoading && isFetched && userProfile !== null && userStatus) {
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

      {showProfileSetup && !localStorage.getItem("pendingSignupData") && (
        <ProfileSetupModal />
      )}
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
