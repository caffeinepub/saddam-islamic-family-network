import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Send,
  Square,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useEmailAuth } from "../hooks/useEmailAuth";

type PrivateChatView = "member-list" | "conversation";

interface ChatMessageView {
  id: string;
  sender: Principal;
  content: string;
  createdTimestamp: bigint;
  recipient?: Principal;
  imageBlobId?: ExternalBlob | null;
  _localImageUrl?: string;
  _localAudioUrl?: string;
  _uploading?: boolean;
  _isVoice?: boolean;
  _failed?: boolean;
}

interface ChatActor {
  sendGroupMessage(
    content: string,
    imageBlobId: ExternalBlob | null,
  ): Promise<void>;
  sendPrivateMessage(
    recipient: Principal,
    content: string,
    imageBlobId: ExternalBlob | null,
  ): Promise<void>;
  getGroupMessages(page: bigint, pageSize: bigint): Promise<ChatMessageView[]>;
  getPrivateMessages(
    other: Principal,
    page: bigint,
    pageSize: bigint,
  ): Promise<ChatMessageView[]>;
  getAllUsers(): Promise<Principal[]>;
  getUserProfile(user: Principal): Promise<UserProfile | null>;
}

function asChatActor(actor: unknown): ChatActor {
  return actor as ChatActor;
}

function formatTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function MessageTick({ messageId }: { messageId: string }) {
  const isPending = messageId.startsWith("temp-");
  if (isPending) {
    return <Check className="w-3 h-3 text-white/60 flex-shrink-0" />;
  }
  return (
    <CheckCheck
      className="w-3 h-3 flex-shrink-0"
      style={{ color: "#4fc87a" }}
    />
  );
}

// Audio bubble -- WhatsApp style
function AudioBubble({ src, isMe }: { src: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play();
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 min-w-[180px] ${
        isMe ? "" : ""
      }`}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: voice playback, captions not applicable */}
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onLoadedMetadata={(e) =>
          setDuration(Math.round((e.target as HTMLAudioElement).duration))
        }
        onTimeUpdate={(e) =>
          setCurrent(Math.round((e.target as HTMLAudioElement).currentTime))
        }
      />
      <button
        type="button"
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isMe
            ? "bg-white/20 hover:bg-white/30"
            : "bg-islamic-green/20 hover:bg-islamic-green/30"
        } transition-colors`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-6 mb-1">
          {(
            [
              3, 5, 8, 12, 7, 10, 14, 6, 9, 13, 5, 11, 8, 4, 10, 7, 12, 5, 9, 6,
            ] as const
          ).map((height, i) => {
            const filled = duration > 0 && (current / duration) * 20 > i;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length waveform bars, order never changes
                key={i}
                className="rounded-full flex-shrink-0"
                style={{
                  width: 2,
                  height: height,
                  background: filled
                    ? isMe
                      ? "rgba(255,255,255,0.9)"
                      : "#16a34a"
                    : isMe
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(22,163,74,0.35)",
                  transition: "background 0.1s",
                }}
              />
            );
          })}
        </div>
        <span
          className={`text-[10px] ${isMe ? "text-white/60" : "text-muted-foreground"}`}
        >
          {formatDuration(playing ? current : duration)}
        </span>
      </div>
    </div>
  );
}

function MessageImage({ msg }: { msg: ChatMessageView; isMe?: boolean }) {
  const [imgUrl, setImgUrl] = useState<string | undefined>(msg._localImageUrl);

  useEffect(() => {
    if (msg._localImageUrl) {
      setImgUrl(msg._localImageUrl);
      return;
    }
    if (msg.imageBlobId) {
      try {
        setImgUrl(msg.imageBlobId.getDirectURL());
      } catch {
        setImgUrl(undefined);
      }
    }
  }, [msg.imageBlobId, msg._localImageUrl]);

  if (!imgUrl && !msg._uploading) return null;

  const handleClick = () => {
    if (imgUrl) window.open(imgUrl, "_blank");
  };

  return (
    <div
      className="rounded-xl overflow-hidden max-w-[200px] cursor-pointer"
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {msg._uploading ? (
        <div className="w-[200px] h-[150px] bg-black/20 flex items-center justify-center rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-white/70" />
        </div>
      ) : imgUrl ? (
        <img
          src={imgUrl}
          alt="Shared"
          className="rounded-xl object-cover max-h-[300px] w-full"
          style={{ maxWidth: 200 }}
        />
      ) : null}
    </div>
  );
}

// ── Voice Recorder Hook ────────────────────────────────────────────────────
function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        for (const t of stream.getTracks()) {
          t.stop();
        }
      };

      mr.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Please allow mic permission.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      for (const t of mediaRecorderRef.current.stream?.getTracks() ?? []) {
        t.stop();
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingSeconds(0);
  }, [audioUrl]);

  const clearAudio = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
  }, [audioUrl]);

  return {
    isRecording,
    recordingSeconds,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
  };
}

// ── Input Bar (Photo + Voice) ──────────────────────────────────────────────
interface InputBarProps {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onFileSelect: (file: File) => void;
  onRemoveImage: () => void;
  selectedImage: File | null;
  previewUrl: string | null;
  uploadProgress: number;
  sending: boolean;
  disabled: boolean;
  ocidPrefix: string;
  // Voice
  voice: ReturnType<typeof useVoiceRecorder>;
  onSendVoice: () => void;
}

function InputBar({
  input,
  onInputChange,
  onSend,
  onFileSelect,
  onRemoveImage,
  selectedImage,
  previewUrl,
  uploadProgress,
  sending,
  disabled,
  ocidPrefix,
  voice,
  onSendVoice,
}: InputBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Recorded audio preview bar
  if (voice.audioUrl && !voice.isRecording) {
    return (
      <div className="border-t border-border bg-card">
        <div className="px-3 py-3 flex gap-2 items-center">
          <button
            type="button"
            onClick={voice.cancelRecording}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
          <div
            className="flex-1 rounded-xl overflow-hidden"
            style={{
              background: "rgba(22,163,74,0.1)",
              border: "1px solid rgba(22,163,74,0.25)",
            }}
          >
            <AudioBubble src={voice.audioUrl} isMe={false} />
          </div>
          <Button
            onClick={onSendVoice}
            disabled={sending}
            size="icon"
            className="bg-islamic-green hover:bg-islamic-green/90 text-white flex-shrink-0"
            data-ocid={`${ocidPrefix}.primary_button`}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Recording in progress
  if (voice.isRecording) {
    return (
      <div className="border-t border-border bg-card">
        <div className="px-3 py-3 flex gap-2 items-center">
          <button
            type="button"
            onClick={voice.cancelRecording}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center gap-2 px-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-foreground font-medium">
              Recording… {formatDuration(voice.recordingSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={voice.stopRecording}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
            data-ocid={`${ocidPrefix}.stop_record_button`}
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card">
      {previewUrl && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-xl border-2 border-islamic-green/40"
            />
            {sending && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex flex-col items-center justify-center gap-1 px-1">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <Progress value={uploadProgress} className="h-1 w-14" />
              </div>
            )}
            {!sending && (
              <button
                type="button"
                onClick={onRemoveImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center shadow"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="absolute bottom-1 left-1 right-1">
              <p className="text-[10px] text-white/80 truncate text-center">
                {selectedImage?.name}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-3 py-3 flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelect(f);
            e.target.value = "";
          }}
        />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          className="text-muted-foreground hover:text-islamic-green flex-shrink-0"
          data-ocid={`${ocidPrefix}.upload_button`}
        >
          <ImageIcon className="w-5 h-5" />
        </Button>

        <Input
          data-ocid={`${ocidPrefix}.input`}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={previewUrl ? "Add a caption…" : "Type a message…"}
          className="flex-1"
          disabled={sending || disabled}
        />

        {/* Show send button if there is text/image, else mic button */}
        {input.trim() || previewUrl ? (
          <Button
            data-ocid={`${ocidPrefix}.primary_button`}
            onClick={onSend}
            disabled={sending || disabled}
            size="icon"
            className="bg-islamic-green hover:bg-islamic-green/90 text-white flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={voice.startRecording}
            disabled={disabled || sending}
            className="bg-islamic-green hover:bg-islamic-green/90 text-white flex-shrink-0"
            data-ocid={`${ocidPrefix}.mic_button`}
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Group Chat ─────────────────────────────────────────────────────────────
function GroupChat() {
  const { actor, isFetching } = useActor();
  const { identity } = useEmailAuth();
  const myPrincipal = identity?.getPrincipal().toString();

  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [profileMap, setProfileMap] = useState<
    Record<string, UserProfile | null>
  >({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceRecorder();

  const handleFileSelect = (file: File) => {
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const fetchMessages = useCallback(async () => {
    if (!actor) return;
    const chatActor = asChatActor(actor);
    const msgs = await chatActor.getGroupMessages(BigInt(0), BigInt(50));
    const sorted = [...msgs].sort((a, b) =>
      a.createdTimestamp < b.createdTimestamp ? -1 : 1,
    );
    setMessages((prev) => {
      const optimistic = prev.filter((m) => m.id.startsWith("temp-"));
      const merged = [...sorted];
      for (const opt of optimistic) {
        const isConfirmed = sorted.some(
          (m) =>
            m.sender.toString() === opt.sender.toString() &&
            m.content === opt.content &&
            Math.abs(
              Number(m.createdTimestamp) - Number(opt.createdTimestamp),
            ) < 30_000_000_000,
        );
        if (!isConfirmed) merged.push(opt);
      }
      return merged.sort((a, b) =>
        a.createdTimestamp < b.createdTimestamp ? -1 : 1,
      );
    });

    const uniqueSenders = sorted
      .map((m) => m.sender.toString())
      .filter((s, i, arr) => arr.indexOf(s) === i);

    setProfileMap((prev) => {
      const missing = uniqueSenders.filter((s) => !(s in prev));
      if (missing.length === 0) return prev;
      Promise.all(
        missing.map((s) => {
          const principal = sorted.find(
            (m) => m.sender.toString() === s,
          )!.sender;
          return chatActor.getUserProfile(principal).then((p) => ({ s, p }));
        }),
      ).then((results) => {
        setProfileMap((p2) => {
          const next = { ...p2 };
          for (const { s, p } of results) next[s] = p ?? null;
          return next;
        });
      });
      return prev;
    });
  }, [actor]);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 3000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (
    content: string,
    file: File | null,
    capturedPreview: string | null,
  ) => {
    if (!actor) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageView = {
      id: tempId,
      sender: identity!.getPrincipal(),
      content,
      createdTimestamp: BigInt(Date.now()) * BigInt(1_000_000),
      _localImageUrl: capturedPreview ?? undefined,
      _uploading: !!file,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      let imageBlob: ExternalBlob | null = null;
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        imageBlob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
          setUploadProgress(pct),
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
        );
      }
      await asChatActor(actor).sendGroupMessage(content, imageBlob);
      // Keep optimistic message visible; just clear uploading flag
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
      );
      if (capturedPreview) URL.revokeObjectURL(capturedPreview);
      // Fetch immediately and again after 2s as ICP query fallback
      fetchMessages();
      setTimeout(() => fetchMessages(), 2000);
    } catch (err) {
      console.error("Failed to send:", err);
      toast.error("Failed to send. Please try again.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, _uploading: false, _failed: true } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content && !selectedImage) return;
    const capturedFile = selectedImage;
    const capturedPreview = previewUrl;
    setInput("");
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    await sendMessage(content, capturedFile, capturedPreview);
  };

  const handleSendVoice = async () => {
    if (!voice.audioBlob || !actor) return;
    const blob = voice.audioBlob;
    const localUrl = voice.audioUrl;
    voice.clearAudio();

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageView = {
      id: tempId,
      sender: identity!.getPrincipal(),
      content: "🎤 Voice message",
      createdTimestamp: BigInt(Date.now()) * BigInt(1_000_000),
      _localAudioUrl: localUrl ?? undefined,
      _uploading: true,
      _isVoice: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const audioExternalBlob = ExternalBlob.fromBytes(bytes);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
      );
      // Store voice as image blob with special prefix in content
      await asChatActor(actor).sendGroupMessage(
        "🎤 Voice message",
        audioExternalBlob,
      );
      // Keep optimistic message visible; just clear uploading flag
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
      );
      if (localUrl) URL.revokeObjectURL(localUrl);
      // Fetch immediately and again after 2s as ICP query fallback
      fetchMessages();
      setTimeout(() => fetchMessages(), 2000);
    } catch (err) {
      console.error("Failed to send voice:", err);
      toast.error("Failed to send voice message.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, _uploading: false, _failed: true } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-4" data-ocid="chat.group.panel">
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="chat.group.empty_state"
          >
            <Users className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              No messages yet. Be the first to say Assalamualaikum!
            </p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const isMe = msg.sender.toString() === myPrincipal;
            const profile = profileMap[msg.sender.toString()];
            const name =
              profile?.username ?? `${msg.sender.toString().slice(0, 8)}...`;
            // Declare hasVoice first so hasImage can use it
            const hasVoice =
              msg._isVoice ||
              (msg.content === "🎤 Voice message" && !!msg.imageBlobId);
            const hasImage =
              !!(msg.imageBlobId || msg._localImageUrl) && !hasVoice;
            let voiceSrc = msg._localAudioUrl;
            if (!voiceSrc && msg.imageBlobId && hasVoice) {
              try {
                voiceSrc = msg.imageBlobId.getDirectURL();
              } catch {
                voiceSrc = undefined;
              }
            }
            return (
              <div
                key={msg.id}
                data-ocid={`chat.group.item.${idx + 1}`}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMe && (
                  <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-islamic-green text-white text-xs">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {!isMe && (
                    <span className="text-xs font-semibold text-accent-foreground mb-1">
                      {name}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl text-sm leading-relaxed overflow-hidden ${
                      isMe
                        ? "bg-islamic-green text-white rounded-tr-sm"
                        : "bg-card border border-border text-foreground rounded-tl-sm"
                    } ${hasImage || hasVoice ? "p-1" : "px-3 py-2"}`}
                  >
                    {hasVoice && voiceSrc && (
                      <AudioBubble src={voiceSrc} isMe={isMe} />
                    )}
                    {hasVoice && msg._uploading && (
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Uploading voice…</span>
                      </div>
                    )}
                    {hasImage && <MessageImage msg={msg} isMe={isMe} />}
                    {msg.content && !hasVoice && (
                      <p className={hasImage ? "px-2 pb-1 pt-1 text-sm" : ""}>
                        {msg.content}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(msg.createdTimestamp)}
                    </span>
                    {isMe && <MessageTick messageId={msg.id} />}
                  </div>
                  {msg._failed && (
                    <span className="text-[10px] text-red-400 mt-0.5">
                      ⚠ Failed to send
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {isFetching && !actor && (
        <p
          className="text-xs text-muted-foreground text-center py-1"
          data-ocid="chat.group.loading_state"
        >
          Connecting...
        </p>
      )}

      <InputBar
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        onFileSelect={handleFileSelect}
        onRemoveImage={handleRemoveImage}
        selectedImage={selectedImage}
        previewUrl={previewUrl}
        uploadProgress={uploadProgress}
        sending={sending}
        disabled={!actor}
        ocidPrefix="chat.group"
        voice={voice}
        onSendVoice={handleSendVoice}
      />
    </div>
  );
}

// ── Private Chat ────────────────────────────────────────────────────────────
function PrivateChat() {
  const { actor, isFetching } = useActor();
  const { identity } = useEmailAuth();
  const myPrincipal = identity?.getPrincipal().toString();

  const [view, setView] = useState<PrivateChatView>("member-list");
  const [members, setMembers] = useState<Principal[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, UserProfile | null>
  >({});
  const [selectedMember, setSelectedMember] = useState<Principal | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceRecorder();

  const handleFileSelect = (file: File) => {
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  useEffect(() => {
    if (!actor) return;
    const chatActor = asChatActor(actor);
    setLoadingMembers(true);
    chatActor
      .getAllUsers()
      .then(async (principals) => {
        const others = principals.filter((p) => p.toString() !== myPrincipal);
        setMembers(others);
        const profiles = await Promise.all(
          others.map((p) =>
            chatActor
              .getUserProfile(p)
              .then((pr) => ({ key: p.toString(), pr })),
          ),
        );
        const map: Record<string, UserProfile | null> = {};
        for (const { key, pr } of profiles) map[key] = pr ?? null;
        setMemberProfiles(map);
      })
      .finally(() => setLoadingMembers(false));
  }, [actor, myPrincipal]);

  const fetchConversation = useCallback(
    async (other: Principal) => {
      if (!actor) return;
      const msgs = await asChatActor(actor).getPrivateMessages(
        other,
        BigInt(0),
        BigInt(50),
      );
      const sorted = [...msgs].sort((a, b) =>
        a.createdTimestamp < b.createdTimestamp ? -1 : 1,
      );
      setMessages((prev) => {
        const optimistic = prev.filter((m) => m.id.startsWith("temp-"));
        const merged = [...sorted];
        for (const opt of optimistic) {
          const isConfirmed = sorted.some(
            (m) =>
              m.sender.toString() === opt.sender.toString() &&
              m.content === opt.content &&
              Math.abs(
                Number(m.createdTimestamp) - Number(opt.createdTimestamp),
              ) < 30_000_000_000,
          );
          if (!isConfirmed) merged.push(opt);
        }
        return merged.sort((a, b) =>
          a.createdTimestamp < b.createdTimestamp ? -1 : 1,
        );
      });
    },
    [actor],
  );

  useEffect(() => {
    if (!selectedMember || !actor) return;
    fetchConversation(selectedMember);
    const id = setInterval(() => fetchConversation(selectedMember), 3000);
    return () => clearInterval(id);
  }, [selectedMember, actor, fetchConversation]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new message
  useEffect(() => {
    if (view === "conversation") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  const openConversation = (member: Principal) => {
    setSelectedMember(member);
    setMessages([]);
    setInput("");
    handleRemoveImage();
    voice.clearAudio();
    setView("conversation");
  };

  const sendMessage = async (
    content: string,
    file: File | null,
    capturedPreview: string | null,
  ) => {
    if (!actor || !selectedMember) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageView = {
      id: tempId,
      sender: identity!.getPrincipal(),
      content,
      createdTimestamp: BigInt(Date.now()) * BigInt(1_000_000),
      _localImageUrl: capturedPreview ?? undefined,
      _uploading: !!file,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      let imageBlob: ExternalBlob | null = null;
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        imageBlob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
          setUploadProgress(pct),
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
        );
      }
      await asChatActor(actor).sendPrivateMessage(
        selectedMember,
        content,
        imageBlob,
      );
      // Keep optimistic message visible; just clear uploading flag
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
      );
      if (capturedPreview) URL.revokeObjectURL(capturedPreview);
      // Fetch immediately and again after 2s as ICP query fallback
      fetchConversation(selectedMember);
      setTimeout(() => fetchConversation(selectedMember), 2000);
    } catch (err) {
      console.error("Failed to send:", err);
      toast.error("Failed to send. Please try again.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, _uploading: false, _failed: true } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content && !selectedImage) return;
    const capturedFile = selectedImage;
    const capturedPreview = previewUrl;
    setInput("");
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    await sendMessage(content, capturedFile, capturedPreview);
  };

  const handleSendVoice = async () => {
    if (!voice.audioBlob || !actor || !selectedMember) return;
    const blob = voice.audioBlob;
    const localUrl = voice.audioUrl;
    voice.clearAudio();

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageView = {
      id: tempId,
      sender: identity!.getPrincipal(),
      content: "🎤 Voice message",
      createdTimestamp: BigInt(Date.now()) * BigInt(1_000_000),
      _localAudioUrl: localUrl ?? undefined,
      _uploading: true,
      _isVoice: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const audioExternalBlob = ExternalBlob.fromBytes(bytes);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
      );
      await asChatActor(actor).sendPrivateMessage(
        selectedMember,
        "🎤 Voice message",
        audioExternalBlob,
      );
      // Keep optimistic message visible; just clear uploading flag
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _uploading: false } : m)),
      );
      if (localUrl) URL.revokeObjectURL(localUrl);
      // Fetch immediately and again after 2s as ICP query fallback
      fetchConversation(selectedMember);
      setTimeout(() => fetchConversation(selectedMember), 2000);
    } catch (err) {
      console.error("Failed to send voice:", err);
      toast.error("Failed to send voice message.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, _uploading: false, _failed: true } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  if (view === "conversation" && selectedMember) {
    const partnerProfile = memberProfiles[selectedMember.toString()];
    const partnerName =
      partnerProfile?.username ?? `${selectedMember.toString().slice(0, 8)}...`;
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card">
          <Button
            data-ocid="chat.private.secondary_button"
            variant="ghost"
            size="icon"
            onClick={() => setView("member-list")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-islamic-green text-white text-sm">
              {getInitials(partnerName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-foreground">
              {partnerName}
            </p>
            <p className="text-xs text-muted-foreground">Family Member</p>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-4" data-ocid="chat.private.panel">
          {messages.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              data-ocid="chat.private.empty_state"
            >
              <MessageCircle className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                Start a conversation with {partnerName}
              </p>
            </div>
          )}
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const isMe = msg.sender.toString() === myPrincipal;
              // Declare hasVoice first so hasImage can use it
              const hasVoice =
                msg._isVoice ||
                (msg.content === "🎤 Voice message" && !!msg.imageBlobId);
              const hasImage =
                !!(msg.imageBlobId || msg._localImageUrl) && !hasVoice;
              let voiceSrc = msg._localAudioUrl;
              if (!voiceSrc && msg.imageBlobId && hasVoice) {
                try {
                  voiceSrc = msg.imageBlobId.getDirectURL();
                } catch {
                  voiceSrc = undefined;
                }
              }
              return (
                <div
                  key={msg.id}
                  data-ocid={`chat.private.item.${idx + 1}`}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`rounded-2xl text-sm leading-relaxed overflow-hidden ${
                        isMe
                          ? "bg-islamic-green text-white rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      } ${hasImage || hasVoice ? "p-1" : "px-3 py-2"}`}
                    >
                      {hasVoice && voiceSrc && (
                        <AudioBubble src={voiceSrc} isMe={isMe} />
                      )}
                      {hasVoice && msg._uploading && (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Uploading voice…</span>
                        </div>
                      )}
                      {hasImage && <MessageImage msg={msg} isMe={isMe} />}
                      {msg.content && !hasVoice && (
                        <p className={hasImage ? "px-2 pb-1 pt-1 text-sm" : ""}>
                          {msg.content}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.createdTimestamp)}
                      </span>
                      {isMe && <MessageTick messageId={msg.id} />}
                    </div>
                    {msg._failed && (
                      <span className="text-[10px] text-red-400 mt-0.5">
                        ⚠ Failed to send
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <InputBar
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onFileSelect={handleFileSelect}
          onRemoveImage={handleRemoveImage}
          selectedImage={selectedImage}
          previewUrl={previewUrl}
          uploadProgress={uploadProgress}
          sending={sending}
          disabled={!actor}
          ocidPrefix="chat.private"
          voice={voice}
          onSendVoice={handleSendVoice}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">
          Family Members
        </h3>
        <p className="text-xs text-muted-foreground">
          Select a member to start a private chat
        </p>
      </div>
      <ScrollArea className="flex-1" data-ocid="chat.private.panel">
        {loadingMembers && (
          <div
            className="flex items-center justify-center py-12"
            data-ocid="chat.private.loading_state"
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loadingMembers && members.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="chat.private.empty_state"
          >
            <Users className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              No family members found
            </p>
          </div>
        )}
        <div>
          {members.map((member, idx) => {
            const profile = memberProfiles[member.toString()];
            const name =
              profile?.username ?? `${member.toString().slice(0, 8)}...`;
            return (
              <button
                key={member.toString()}
                type="button"
                data-ocid={`chat.private.item.${idx + 1}`}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50"
                onClick={() => openConversation(member)}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-islamic-green text-white">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.bio ? profile.bio.slice(0, 40) : "Family Member"}
                  </p>
                </div>
                <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </ScrollArea>
      {isFetching && !actor && (
        <p
          className="text-xs text-muted-foreground text-center py-2"
          data-ocid="chat.private.loading_state"
        >
          Connecting...
        </p>
      )}
    </div>
  );
}

// ── ChatPage ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  return (
    <div
      className="flex flex-col h-[calc(100vh-64px)] max-w-2xl mx-auto"
      data-ocid="chat.page"
    >
      <Tabs
        defaultValue="group"
        className="flex flex-col flex-1 overflow-hidden"
      >
        <TabsList
          className="w-full rounded-none border-b border-border bg-card px-4 shrink-0"
          data-ocid="chat.tab"
        >
          <TabsTrigger value="group" className="flex-1 gap-2">
            <Users className="w-4 h-4" />
            Family Group
          </TabsTrigger>
          <TabsTrigger value="private" className="flex-1 gap-2">
            <MessageCircle className="w-4 h-4" />
            Private Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="group"
          className="flex-1 overflow-hidden mt-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <GroupChat />
        </TabsContent>

        <TabsContent
          value="private"
          className="flex-1 overflow-hidden mt-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <PrivateChat />
        </TabsContent>
      </Tabs>
    </div>
  );
}
