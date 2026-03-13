import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type PrivateChatView = "member-list" | "conversation";

// Chat message type matching backend declaration
interface ChatMessageView {
  id: string;
  sender: Principal;
  content: string;
  createdTimestamp: bigint;
  recipient?: Principal;
}

// Extended actor interface covering chat APIs declared in backend.d.ts
interface ChatActor {
  sendGroupMessage(content: string): Promise<void>;
  sendPrivateMessage(recipient: Principal, content: string): Promise<void>;
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// WhatsApp-style message tick: single gray = sending/optimistic, double green = confirmed
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

// ── Group Chat ─────────────────────────────────────────────────────────────
function GroupChat() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [profileMap, setProfileMap] = useState<
    Record<string, UserProfile | null>
  >({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!actor) return;
    const chatActor = asChatActor(actor);
    const msgs = await chatActor.getGroupMessages(BigInt(0), BigInt(50));
    const sorted = [...msgs].sort((a, b) =>
      a.createdTimestamp < b.createdTimestamp ? -1 : 1,
    );
    setMessages(sorted);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll-to-bottom trigger
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!actor || !input.trim()) return;
    const content = input.trim();
    setSending(true);
    setInput("");

    // Optimistic update: add message to local state immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageView = {
      id: tempId,
      sender: identity!.getPrincipal(),
      content,
      createdTimestamp: BigInt(Date.now()) * BigInt(1_000_000),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await asChatActor(actor).sendGroupMessage(content);
      // Refresh after short delay to get real message from backend
      setTimeout(() => fetchMessages(), 500);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message. Please try again.");
      // Remove optimistic message and restore input on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
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
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-islamic-green text-white rounded-tr-sm"
                        : "bg-card border border-border text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="flex flex-row items-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(msg.createdTimestamp)}
                    </span>
                    {isMe && <MessageTick messageId={msg.id} />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-card px-3 py-3 flex gap-2">
        {isFetching && !actor && (
          <p
            className="text-xs text-muted-foreground self-center"
            data-ocid="chat.group.loading_state"
          >
            Connecting...
          </p>
        )}
        <Input
          data-ocid="chat.group.input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message\u2026"
          className="flex-1"
          disabled={sending || !actor}
        />
        <Button
          data-ocid="chat.group.primary_button"
          onClick={handleSend}
          disabled={sending || !input.trim() || !actor}
          size="icon"
          className="bg-islamic-green hover:bg-islamic-green/90 text-white"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Private Chat ────────────────────────────────────────────────────────────
function PrivateChat() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
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
  const bottomRef = useRef<HTMLDivElement>(null);

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
      setMessages(sorted);
    },
    [actor],
  );

  useEffect(() => {
    if (!selectedMember || !actor) return;
    fetchConversation(selectedMember);
    const id = setInterval(() => fetchConversation(selectedMember), 3000);
    return () => clearInterval(id);
  }, [selectedMember, actor, fetchConversation]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll-to-bottom trigger
  useEffect(() => {
    if (view === "conversation") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  const openConversation = (member: Principal) => {
    setSelectedMember(member);
    setMessages([]);
    setInput("");
    setView("conversation");
  };

  const handleSend = async () => {
    if (!actor || !selectedMember || !input.trim()) return;
    const content = input.trim();
    setSending(true);
    setInput("");

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageView = {
      id: tempId,
      sender: identity!.getPrincipal(),
      content,
      createdTimestamp: BigInt(Date.now()) * BigInt(1_000_000),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await asChatActor(actor).sendPrivateMessage(selectedMember, content);
      setTimeout(() => fetchConversation(selectedMember), 500);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
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
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? "bg-islamic-green text-white rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex flex-row items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.createdTimestamp)}
                      </span>
                      {isMe && <MessageTick messageId={msg.id} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card px-3 py-3 flex gap-2">
          {isFetching && !actor && (
            <p
              className="text-xs text-muted-foreground self-center"
              data-ocid="chat.private.loading_state"
            >
              Connecting...
            </p>
          )}
          <Input
            data-ocid="chat.private.input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Message ${partnerName}\u2026`}
            className="flex-1"
            disabled={sending || !actor}
          />
          <Button
            data-ocid="chat.private.primary_button"
            onClick={handleSend}
            disabled={sending || !input.trim() || !actor || !selectedMember}
            size="icon"
            className="bg-islamic-green hover:bg-islamic-green/90 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">
          Family Members
        </h3>
        <p className="text-xs text-muted-foreground">
          Select a member to start a private chat
        </p>
      </div>
      <ScrollArea className="flex-1" data-ocid="chat.members.list">
        {loadingMembers && (
          <div
            className="flex flex-col gap-3 p-4"
            data-ocid="chat.members.loading_state"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}
        {!loadingMembers && members.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="chat.members.empty_state"
          >
            <Users className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              No other family members yet
            </p>
          </div>
        )}
        <div className="divide-y divide-border">
          {members.map((member, idx) => {
            const profile = memberProfiles[member.toString()];
            const name =
              profile?.username ?? `${member.toString().slice(0, 10)}...`;
            return (
              <button
                key={member.toString()}
                type="button"
                data-ocid={`chat.members.item.${idx + 1}`}
                onClick={() => openConversation(member)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-islamic-green text-white">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {name}
                  </p>
                  <p className="text-xs text-muted-foreground">Tap to chat</p>
                </div>
                <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main ChatPage ────────────────────────────────────────────────────────────
export default function ChatPage() {
  return (
    <div className="max-w-2xl mx-auto w-full h-[calc(100vh-8rem)] flex flex-col px-2 md:px-4">
      <div className="flex items-center gap-3 py-4">
        <div className="w-9 h-9 rounded-full bg-islamic-green flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-foreground">
            Family Chat
          </h1>
          <p className="text-xs text-muted-foreground">
            Stay connected with your family
          </p>
        </div>
      </div>

      <Tabs defaultValue="group" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-2 mb-3">
          <TabsTrigger
            value="group"
            data-ocid="chat.group.tab"
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Family Group
          </TabsTrigger>
          <TabsTrigger
            value="private"
            data-ocid="chat.private.tab"
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Private Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="group" className="flex-1 min-h-0 m-0">
          <div className="h-full border border-border rounded-xl bg-background overflow-hidden flex flex-col">
            <GroupChat />
          </div>
        </TabsContent>

        <TabsContent value="private" className="flex-1 min-h-0 m-0">
          <div className="h-full border border-border rounded-xl bg-background overflow-hidden flex flex-col">
            <PrivateChat />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
