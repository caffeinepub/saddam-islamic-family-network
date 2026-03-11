import { useQueryClient } from "@tanstack/react-query";
import { Home, LogOut, MessageCircle, User, Users } from "lucide-react";
import type { Page } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import NotificationBell from "./NotificationBell";

interface BottomNavProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

export default function BottomNav({
  currentPage,
  setCurrentPage,
}: BottomNavProps) {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  if (!identity) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-islamic-dark border-t border-white/10 safe-area-pb">
      <div className="flex items-center">
        <button
          type="button"
          data-ocid="nav.home_link"
          onClick={() => setCurrentPage("feed")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            currentPage === "feed"
              ? "text-islamic-gold"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          type="button"
          data-ocid="nav.profile_link"
          onClick={() => setCurrentPage("profile")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            currentPage === "profile"
              ? "text-islamic-gold"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>

        <button
          type="button"
          data-ocid="nav.members_link"
          onClick={() => setCurrentPage("members")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            currentPage === "members" || currentPage === "member-profile"
              ? "text-islamic-gold"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Family</span>
        </button>

        <button
          type="button"
          data-ocid="nav.chat_link"
          onClick={() => setCurrentPage("chat")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            currentPage === "chat"
              ? "text-islamic-gold"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Chat</span>
        </button>

        <NotificationBell asNavTab />

        <button
          type="button"
          data-ocid="nav.logout_button"
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-white/50 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
