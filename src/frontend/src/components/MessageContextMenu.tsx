// MessageContextMenu.tsx — WhatsApp-style long press popup for chat messages.
// Isolated overlay component — does NOT modify any existing chat components.
// All backend calls are wrapped in try/catch with silent fail.

import { Download, Share2, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Backend, ExternalBlob } from "../backend";
import { useMessageReactions } from "../hooks/useMessageReactions";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

interface ChatMessageForMenu {
  id: string;
  sender: { toString(): string };
  content: string;
  imageBlobId?: ExternalBlob | null;
  _isVoice?: boolean;
  _localImageUrl?: string;
  _localAudioUrl?: string;
}

interface MessageContextMenuProps {
  message: ChatMessageForMenu;
  myPrincipal: string | undefined;
  actor: Backend | null;
  position: { x: number; y: number };
  onClose: () => void;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForEveryone: (messageId: string) => void;
}

export default function MessageContextMenu({
  message,
  myPrincipal,
  actor,
  position,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageContextMenuProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMe = message.sender.toString() === myPrincipal;

  // Use hook for optimistic reactions — instant UI update without refresh
  const { addReactionOptimistic } = useMessageReactions(
    message.id,
    actor,
    myPrincipal,
  );

  // Adjust position so the popup stays within the viewport
  const cardStyle = (() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const CARD_W = 240;
    const CARD_H = 320;
    let left = position.x;
    let top = position.y;

    if (left + CARD_W > W - 12) left = W - CARD_W - 12;
    if (left < 12) left = 12;
    if (top + CARD_H > H - 12) top = H - CARD_H - 12;
    if (top < 12) top = 12;

    return { left, top };
  })();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleReaction = async (emoji: string) => {
    // Optimistic update: instant UI feedback, no refresh needed
    await addReactionOptimistic(emoji);
    toast.success(`Reaction "${emoji}" add ho gaya`);
    onClose();
  };

  const handleDeleteForMe = async () => {
    if (!actor) return;
    try {
      await actor.deleteMessageForMe(message.id);
      onDeleteForMe(message.id);
    } catch {
      // silent fail
    }
    onClose();
  };

  const handleDeleteForEveryone = async () => {
    if (!actor) return;
    try {
      await actor.deleteMessageForEveryone(message.id);
      onDeleteForEveryone(message.id);
    } catch {
      // silent fail
    }
    onClose();
  };

  const handleShare = async () => {
    try {
      const shareData: ShareData = {};

      if (message._localImageUrl || message.imageBlobId) {
        const url =
          message._localImageUrl ??
          (message.imageBlobId ? message.imageBlobId.getDirectURL() : null);
        if (url) {
          shareData.url = url;
          shareData.text = message.content || undefined;
        } else {
          shareData.text = message.content;
        }
      } else {
        shareData.text = message.content;
      }

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          shareData.text ?? shareData.url ?? "",
        );
        toast.success("Message copied to clipboard");
      }
    } catch {
      // silent fail — user may have cancelled share
    }
    onClose();
  };

  // BUG 3 FIX: fetch+blob approach forces download instead of opening new tab
  const handleDownload = async () => {
    try {
      const url =
        message._localImageUrl ??
        message._localAudioUrl ??
        (message.imageBlobId ? message.imageBlobId.getDirectURL() : null);

      if (!url) {
        toast.error("Download URL not available");
        return;
      }

      const isVoice =
        message._isVoice || message.content === "🎤 Voice message";
      const filename = isVoice
        ? `voice_${message.id}.webm`
        : `image_${message.id}.jpg`;

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      // silent fail — no app crash
    }
    onClose();
  };

  const hasMedia = !!(
    message.imageBlobId ||
    message._localImageUrl ||
    message._localAudioUrl
  );

  return (
    // Full-screen overlay
    <div
      className="fixed inset-0 z-[9999]"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Enter" && onClose()}
      // Suppress native context menu on the overlay itself
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Popup card */}
      <div
        ref={cardRef}
        className="absolute rounded-2xl shadow-2xl overflow-hidden"
        style={{
          left: cardStyle.left,
          top: cardStyle.top,
          width: 240,
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        role="menu"
        aria-label="Message options"
        data-ocid="chat.context_menu"
      >
        {/* Close button */}
        <button
          type="button"
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors z-10"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Emoji Reaction Bar */}
        <div
          className="flex items-center justify-around px-3 py-3 border-b border-border"
          data-ocid="chat.context_menu.emoji_bar"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="text-xl hover:scale-125 transition-transform active:scale-110 p-1 rounded-lg hover:bg-muted"
              onClick={() => handleReaction(emoji)}
              aria-label={`React with ${emoji}`}
              data-ocid={`chat.context_menu.emoji.${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Options List */}
        <div className="py-1" data-ocid="chat.context_menu.options">
          {/* Delete for me */}
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left text-foreground"
            onClick={handleDeleteForMe}
            role="menuitem"
            data-ocid="chat.context_menu.delete_for_me"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>Delete for me</span>
          </button>

          {/* Delete for everyone — only if sender */}
          {isMe && (
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 transition-colors text-left text-red-400"
              onClick={handleDeleteForEveryone}
              role="menuitem"
              data-ocid="chat.context_menu.delete_for_everyone"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span>Delete for everyone</span>
            </button>
          )}

          {/* Share */}
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left text-foreground"
            onClick={handleShare}
            role="menuitem"
            data-ocid="chat.context_menu.share"
          >
            <Share2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>Share</span>
          </button>

          {/* Download — only if message has media */}
          {hasMedia && (
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left text-foreground"
              onClick={handleDownload}
              role="menuitem"
              data-ocid="chat.context_menu.download"
            >
              <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
