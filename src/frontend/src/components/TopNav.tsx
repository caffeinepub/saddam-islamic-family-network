import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Home, LogOut, MessageCircle, Moon, User, Users } from "lucide-react";
import type { Page } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import NotificationBell from "./NotificationBell";

interface TopNavProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

export default function TopNav({ currentPage, setCurrentPage }: TopNavProps) {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    clear();
    queryClient.clear();
  };

  if (!identity) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-islamic-dark border-b border-white/10 shadow-lg hidden md:flex items-center">
      <div className="max-w-4xl mx-auto w-full px-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/sifn-logo-transparent.dim_200x200.png"
            alt="SIFN Logo"
            className="w-9 h-9 rounded-full object-cover border-2 border-islamic-gold/50"
          />
          <div className="flex flex-col">
            <span className="text-white font-display font-bold text-sm leading-tight">
              Saddam Islamic Family Network
            </span>
            <span className="text-islamic-gold-light text-xs font-arabic leading-tight">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            data-ocid="nav.home_link"
            onClick={() => setCurrentPage("feed")}
            className={`gap-2 text-sm font-medium transition-colors ${
              currentPage === "feed"
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-ocid="nav.profile_link"
            onClick={() => setCurrentPage("profile")}
            className={`gap-2 text-sm font-medium transition-colors ${
              currentPage === "profile"
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-ocid="nav.members_link"
            onClick={() => setCurrentPage("members")}
            className={`gap-2 text-sm font-medium transition-colors ${
              currentPage === "members" || currentPage === "member-profile"
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Family</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-ocid="nav.chat_link"
            onClick={() => setCurrentPage("chat")}
            className={`gap-2 text-sm font-medium transition-colors ${
              currentPage === "chat"
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat</span>
          </Button>
          <NotificationBell />
          <div className="w-px h-6 bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            data-ocid="nav.logout_button"
            onClick={handleLogout}
            className="gap-2 text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}

// Mobile-only header for branding
export function MobileHeader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-islamic-dark border-b border-white/10 shadow-lg md:hidden flex items-center px-4">
      <div className="flex items-center gap-3">
        <img
          src="/assets/generated/sifn-logo-transparent.dim_200x200.png"
          alt="SIFN Logo"
          className="w-8 h-8 rounded-full object-cover border-2 border-islamic-gold/50"
        />
        <div className="flex flex-col">
          <span className="text-white font-display font-bold text-xs leading-tight">
            Saddam Islamic Family Network
          </span>
          <span className="text-islamic-gold-light text-xs font-arabic leading-tight">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </span>
        </div>
      </div>
      <Moon className="ml-auto text-islamic-gold-light w-5 h-5" />
    </div>
  );
}
