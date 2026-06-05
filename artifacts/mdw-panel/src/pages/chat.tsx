import { useEffect, useRef, useState, useCallback } from "react";
import { useGetChatMessages, useSendChatMessage } from "@workspace/api-client-react";
import type { ChatMessage } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Wifi, WifiOff, Trash2, ShieldOff, Shield, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const USER_COLORS = [
  "text-cyan-400","text-violet-400","text-emerald-400","text-amber-400",
  "text-rose-400","text-sky-400","text-fuchsia-400","text-lime-400",
  "text-orange-400","text-pink-400",
];

function getUserColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// Extend ChatMessage tipe lokal supaya bisa pakai userRole
interface ChatMsg extends ChatMessage {
  userRole?: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mutingLoading, setMutingLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMutation = useSendChatMessage();

  const { data: history, isLoading } = useGetChatMessages({ limit: 50 });

  useEffect(() => {
    if (history) setMessages(history as ChatMsg[]);
  }, [history]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const token = localStorage.getItem("mdw_token");
    if (!token) return;

    const url = `${BASE}/api/chat/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener("connected", (e) => {
      setConnected(true);
      try {
        const d = JSON.parse(e.data);
        if (typeof d.muted === "boolean") setMuted(d.muted);
      } catch { /* ignore */ }
    });

    es.addEventListener("message", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "online_count") {
          setOnline(data.count);
        } else if (data.type === "chat") {
          const msg: ChatMsg = {
            id: data.id, userId: data.userId, username: data.username,
            userRole: data.userRole ?? "user",
            message: data.message, createdAt: data.createdAt,
          };
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else if (data.type === "message_deleted") {
          setMessages((prev) => prev.filter((m) => m.id !== data.id));
        } else if (data.type === "chat_muted") {
          setMuted(data.muted);
          toast({
            title: data.muted ? "⛔ Chat dinonaktifkan oleh admin" : "✅ Chat diaktifkan kembali",
          });
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => setConnected(false);
    return () => { es.close(); setConnected(false); };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(
      { data: { message: text } },
      {
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? "Gagal mengirim pesan";
          toast({ title: msg, variant: "destructive" });
          setInput(text);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("mdw_token");
      await fetch(`${BASE}/api/chat/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      toast({ title: "Gagal menghapus pesan", variant: "destructive" });
    }
  };

  const handleToggleMute = async () => {
    setMutingLoading(true);
    try {
      const token = localStorage.getItem("mdw_token");
      const r = await fetch(`${BASE}/api/chat/mute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      setMuted(data.muted);
      toast({ title: data.muted ? "⛔ Chat dinonaktifkan" : "✅ Chat diaktifkan" });
    } catch {
      toast({ title: "Gagal mengubah status chat", variant: "destructive" });
    } finally {
      setMutingLoading(false);
    }
  };

  const canSend = connected && !sendMutation.isPending && (isAdmin || !muted);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-primary" size={24} />
          <div>
            <h1 className="text-2xl font-black font-mono text-foreground tracking-tight">GRUP CHAT</h1>
            <p className="text-muted-foreground font-mono text-xs">Chat real-time dengan semua user</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleMute}
              disabled={mutingLoading}
              className={`font-mono text-xs flex items-center gap-1.5 ${
                muted
                  ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                  : "border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/60"
              }`}
            >
              {muted ? <ShieldOff size={13} /> : <Shield size={13} />}
              {muted ? "AKTIFKAN CHAT" : "NONAKTIFKAN"}
            </Button>
          )}
          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Users size={13} /><span>{online} online</span>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-xs ${connected ? "text-emerald-400" : "text-red-400"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{connected ? "TERHUBUNG" : "TERPUTUS"}</span>
          </div>
        </div>
      </div>

      {/* Mute banner */}
      {muted && (
        <div className={`mb-3 px-4 py-2 rounded-lg border font-mono text-xs flex-shrink-0 ${
          isAdmin
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {isAdmin
            ? "⛔ Chat sedang dinonaktifkan. Hanya admin yang bisa mengirim pesan."
            : "⛔ Chat dinonaktifkan oleh admin. Anda tidak bisa mengirim pesan saat ini."}
        </div>
      )}

      {/* Message area */}
      <div className="flex-1 glass-panel rounded-xl border border-primary/20 overflow-y-auto p-4 space-y-3 min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm animate-pulse">
            Memuat pesan...
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-mono text-sm gap-2">
            <MessageSquare size={32} className="opacity-20" />
            <p>Belum ada pesan. Mulai obrolan!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.userId === user?.id;
          const msgIsAdmin = (msg as ChatMsg).userRole === "admin";
          const color = getUserColor(msg.username);
          return (
            <div key={msg.id} className={`flex gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold font-mono ${
                msgIsAdmin
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                  : isMe
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-white/5 border-white/10 " + color
              }`}>
                {msg.username.charAt(0).toUpperCase()}
              </div>

              {/* Bubble */}
              <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <div className={`flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Nama */}
                  <span className={`font-mono text-xs font-bold ${
                    msgIsAdmin ? "text-amber-400" : isMe ? "text-primary" : color
                  }`}>
                    {isMe ? "Kamu" : msg.username}
                  </span>

                  {/* Badge ADMIN */}
                  {msgIsAdmin && (
                    <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      <Crown size={8} />ADMIN
                    </span>
                  )}

                  <span className="text-muted-foreground font-mono text-[10px]">{formatTime(msg.createdAt)}</span>

                  {/* Tombol hapus — admin only */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-red-400/60 hover:text-red-400 rounded"
                      title="Hapus pesan"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>

                <div className={`px-3 py-2 rounded-xl text-sm font-mono break-words ${
                  msgIsAdmin
                    ? "bg-amber-500/10 border border-amber-500/25 text-foreground rounded-tl-sm"
                    : isMe
                      ? "bg-primary/20 border border-primary/30 text-foreground rounded-tr-sm"
                      : "bg-white/5 border border-white/10 text-foreground rounded-tl-sm"
                }`}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 mt-3 flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !connected ? "Menghubungkan..." :
            muted && !isAdmin ? "Chat dinonaktifkan oleh admin..." :
            "Ketik pesan..."
          }
          disabled={!canSend}
          maxLength={500}
          className="font-mono bg-background/50 border-primary/30 focus:border-primary focus:ring-primary/20 flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || !canSend}
          className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 neon-border px-4"
        >
          {sendMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </Button>
      </div>
      <p className="text-muted-foreground font-mono text-[10px] mt-1 text-right">
        {input.length}/500 · Enter untuk kirim
      </p>
    </div>
  );
}
