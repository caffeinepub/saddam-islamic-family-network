import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Edit,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import { type Theme, useTheme } from "../contexts/ThemeContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import NotificationBell from "./NotificationBell";

interface TopNavProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const THEME_LABELS: Record<Theme, string> = {
  default: "Default",
  islamic: "Islamic",
  dark: "Dark",
};

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  default: <Sun className="w-4 h-4" />,
  islamic: <Moon className="w-4 h-4" />,
  dark: <Moon className="w-4 h-4 fill-current" />,
};

export default function TopNav({ currentPage, setCurrentPage }: TopNavProps) {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { theme, cycleTheme } = useTheme();

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

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            data-ocid="nav.theme_toggle"
            onClick={cycleTheme}
            title={`Theme: ${THEME_LABELS[theme]} (click to change)`}
            className="gap-1.5 text-xs font-medium text-islamic-gold-light hover:bg-white/10 hover:text-white transition-colors"
          >
            {THEME_ICONS[theme]}
            <span>{THEME_LABELS[theme]}</span>
          </Button>

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

// Mobile-only header with hamburger menu
interface MobileHeaderProps {
  currentPage?: Page;
  setCurrentPage?: (page: Page) => void;
}

export function MobileHeader({
  currentPage = "feed",
  setCurrentPage,
}: MobileHeaderProps) {
  const { theme, cycleTheme } = useTheme();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const NEXT_THEME: Record<Theme, string> = {
    default: "Islamic",
    islamic: "Dark",
    dark: "Default",
  };

  const handleNavigate = (page: Page) => {
    if (setCurrentPage) setCurrentPage(page);
    setOpen(false);
  };

  const handleLogout = () => {
    clear();
    queryClient.clear();
    setOpen(false);
  };

  const menuItems: {
    icon: React.ReactNode;
    label: string;
    page: Page;
    ocid: string;
  }[] = [
    {
      icon: <Home className="w-5 h-5" />,
      label: "Home",
      page: "feed",
      ocid: "mobile_menu.home_link",
    },
    {
      icon: <User className="w-5 h-5" />,
      label: "Mera Profile",
      page: "profile",
      ocid: "mobile_menu.profile_link",
    },
    {
      icon: <Edit className="w-5 h-5" />,
      label: "Profile Edit Karo",
      page: "profile",
      ocid: "mobile_menu.edit_profile_link",
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Family Members",
      page: "members",
      ocid: "mobile_menu.members_link",
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      label: "Chat",
      page: "chat",
      ocid: "mobile_menu.chat_link",
    },
    {
      icon: <Bell className="w-5 h-5" />,
      label: "Notifications",
      page: "feed",
      ocid: "mobile_menu.home_link",
    },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-islamic-dark border-b border-white/10 shadow-lg md:hidden flex items-center px-4">
      {/* Hamburger Menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            data-ocid="mobile_menu.open_modal_button"
            aria-label="Open menu"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors mr-2 shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>
        </SheetTrigger>

        <SheetContent
          side="left"
          data-ocid="mobile_menu.sheet"
          className="w-72 p-0 border-r border-white/10 bg-islamic-dark flex flex-col"
        >
          {/* Drawer Header */}
          <SheetHeader className="p-0">
            <div className="bg-gradient-to-b from-islamic-green/30 to-transparent px-5 pt-6 pb-5 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/assets/generated/sifn-logo-transparent.dim_200x200.png"
                  alt="SIFN Logo"
                  className="w-12 h-12 rounded-full object-cover border-2 border-islamic-gold/60 shadow-lg"
                />
                <div>
                  <SheetTitle className="text-white font-display font-bold text-sm leading-tight text-left">
                    Saddam Islamic Family Network
                  </SheetTitle>
                  <p className="text-islamic-gold text-[11px] font-semibold mt-0.5">
                    SIFN
                  </p>
                </div>
              </div>
              <p className="text-islamic-gold-light text-sm font-arabic text-center tracking-wide">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
            </div>
          </SheetHeader>

          {/* Menu Items */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.ocid + item.label}
                type="button"
                data-ocid={item.ocid}
                onClick={() => handleNavigate(item.page)}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-sm font-medium transition-all ${
                  currentPage === item.page
                    ? "bg-islamic-green/20 text-islamic-gold border-r-2 border-islamic-gold"
                    : "text-white/75 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span
                  className={
                    currentPage === item.page
                      ? "text-islamic-gold"
                      : "text-white/50"
                  }
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="border-t border-white/10 p-4 space-y-2">
            {/* Theme toggle */}
            <button
              type="button"
              data-ocid="mobile_menu.theme_toggle"
              onClick={cycleTheme}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium text-islamic-gold-light hover:bg-white/10 hover:text-white transition-all"
            >
              <span className="text-lg leading-none">
                {theme === "default" ? "☀️" : theme === "islamic" ? "🌙" : "🌑"}
              </span>
              <div className="flex flex-col items-start">
                <span className="text-xs text-white/50 leading-none mb-0.5">
                  Theme
                </span>
                <span>
                  {theme === "default"
                    ? "Default"
                    : theme === "islamic"
                      ? "Islamic"
                      : "Dark"}
                </span>
              </div>
              <span className="ml-auto text-xs text-white/40">
                → {NEXT_THEME[theme]}
              </span>
            </button>

            {/* Logout */}
            <button
              type="button"
              data-ocid="mobile_menu.logout_button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/15 hover:text-red-300 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Brand */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img
          src="/assets/generated/sifn-logo-transparent.dim_200x200.png"
          alt="SIFN Logo"
          className="w-8 h-8 rounded-full object-cover border-2 border-islamic-gold/50 shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-white font-display font-bold text-xs leading-tight truncate">
            Saddam Islamic Family Network
          </span>
          <span className="text-islamic-gold-light text-xs font-arabic leading-tight">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </span>
        </div>
      </div>

      {/* Theme switcher on right */}
      <button
        type="button"
        onClick={cycleTheme}
        data-ocid="mobile_header.theme_toggle"
        title={`Switch to ${NEXT_THEME[theme]} theme`}
        className="ml-2 shrink-0 flex flex-col items-center gap-0.5 text-islamic-gold-light hover:text-white transition-colors p-1"
      >
        <span className="text-lg leading-none">
          {theme === "default" ? "☀️" : theme === "islamic" ? "🌙" : "🌑"}
        </span>
        <span className="text-[9px] font-medium leading-none uppercase tracking-wide">
          {theme === "default"
            ? "Default"
            : theme === "islamic"
              ? "Islamic"
              : "Dark"}
        </span>
      </button>
    </div>
  );
}
