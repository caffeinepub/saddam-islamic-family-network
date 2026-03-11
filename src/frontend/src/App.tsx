import { Toaster } from "@/components/ui/sonner";
import type { Principal } from "@icp-sdk/core/principal";
import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import ProfileSetupModal from "./components/ProfileSetupModal";
import TopNav from "./components/TopNav";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import AuthScreen from "./pages/AuthScreen";
import ChatPage from "./pages/ChatPage";
import FeedPage from "./pages/FeedPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import MembersPage from "./pages/MembersPage";
import ProfilePage from "./pages/ProfilePage";

export type Page = "feed" | "profile" | "members" | "member-profile" | "chat";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const [currentPage, setCurrentPage] = useState<Page>("feed");
  const [selectedMember, setSelectedMember] = useState<Principal | null>(null);
  const isAuthenticated = !!identity;
  const { actor, isFetching: actorFetching } = useActor();

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Start the auto-delete timer once the actor is ready (admin-only; errors silently ignored for regular users)
  useEffect(() => {
    if (!actor || actorFetching) return;
    actor.startAutoDeleteTimer().catch(() => {
      // Silently ignore — only admins can start this; regular users get a permission error
    });
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
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
