import { Bell, Heart, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { NotificationView } from "../backend";
import { NotificationType } from "../backend";
import {
  useGetMyNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../hooks/useQueries";

function formatRelativeTime(timestamp: bigint): string {
  const now = Date.now();
  // ICP timestamps are in nanoseconds
  const createdMs = Number(timestamp / 1_000_000n);
  const diffMs = now - createdMs;

  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  }
  if (diffMs < 86_400_000) {
    const hours = Math.floor(diffMs / 3_600_000);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diffMs / 86_400_000);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

interface NotificationItemProps {
  notification: NotificationView;
  index: number;
  onRead: (id: string) => void;
}

function NotificationItem({
  notification,
  index,
  onRead,
}: NotificationItemProps) {
  const isLike = notification.notifType === NotificationType.like;

  return (
    <button
      type="button"
      data-ocid={`notification.item.${index}`}
      onClick={() => {
        if (!notification.isRead) {
          onRead(notification.id);
        }
      }}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5 cursor-pointer ${
        notification.isRead ? "opacity-70" : "bg-white/8"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 ${
          isLike
            ? "bg-rose-500/20 text-rose-400"
            : "bg-blue-500/20 text-blue-400"
        }`}
      >
        {isLike ? (
          <Heart className="w-4 h-4 fill-current" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white/90 text-sm leading-snug">
          {isLike
            ? "Someone liked your post"
            : "Someone commented on your post"}
        </p>
        <p className="text-white/40 text-xs mt-0.5">
          {formatRelativeTime(notification.createdTimestamp)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-islamic-gold mt-2" />
      )}
    </button>
  );
}

interface NotificationBellProps {
  /** When true, renders as a bottom-nav tab item (vertical layout) */
  asNavTab?: boolean;
}

export default function NotificationBell({
  asNavTab = false,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: notifications = [] } = useGetMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllRead.mutate();
    }
  };

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const trigger = asNavTab ? (
    <button
      ref={buttonRef}
      type="button"
      data-ocid="notification.bell_button"
      onClick={() => setOpen((v) => !v)}
      className={`relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
        open ? "text-islamic-gold" : "text-white/50 hover:text-white/80"
      }`}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      aria-haspopup="true"
      aria-expanded={open}
    >
      <div className="relative">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">Alerts</span>
    </button>
  ) : (
    <button
      ref={buttonRef}
      type="button"
      data-ocid="notification.bell_button"
      onClick={() => setOpen((v) => !v)}
      className="relative flex items-center justify-center w-9 h-9 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-islamic-gold/60"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      aria-haspopup="true"
      aria-expanded={open}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none shadow-md">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative">
      {trigger}

      {open && (
        <div
          ref={panelRef}
          data-ocid="notification.dropdown_menu"
          role="menu"
          aria-label="Notifications panel"
          className={`absolute z-[100] w-80 max-h-80 overflow-y-auto rounded-xl bg-islamic-surface border border-white/10 shadow-2xl shadow-black/60 flex flex-col ${
            asNavTab
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : "top-full mt-2 right-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-islamic-surface z-10">
            <h3 className="text-white font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                data-ocid="notification.mark_all_button"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="text-islamic-gold text-xs font-medium hover:text-islamic-gold-light transition-colors disabled:opacity-50"
              >
                {markAllRead.isPending ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div
              data-ocid="notification.empty_state"
              className="flex flex-col items-center justify-center py-10 px-4 gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Bell className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-white/40 text-sm text-center">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notif, i) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  index={i + 1}
                  onRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
