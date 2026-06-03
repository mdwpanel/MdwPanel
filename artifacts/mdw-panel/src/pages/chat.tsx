import { useEffect, useRef, useState, useCallback } from "react";
import { useGetChatMessages, useSendChatMessage } from "@workspace/api-client-react";
import type { ChatMessage } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const USER_COLORS = [
  "text-cyan-400",
  "text-violet-400",
  "text-emerald-400",
  "text-amber-400",
  "text-rose-400",
  "text-sky-400",
  "text-fuchsia-400",
  "text-lime-400",
  "text-orange-400",
  "text-pink-400",
];

function getUserColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const sendMutation = useSendChatMessage();

  const { data: history, isLoading } = useGetChatMessages({ limit: 50 });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const token = localStorage.getItem("mdw_token");
    if (!token) return;

    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${base}/api/chat/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
    });

    es.addEventListener("message", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "online_count") {
          setOnline(data.count);
        } else if (data.type === "chat") {
          const msg: ChatMessage = {
            id: data.id,
            userId: data.userId,
            username: data.username,
            message: data.message,
            createdAt: data.createdAt,
          };
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(
      { data: { message: text } },
      {
        onError: () => {
          toast({ title: "Gagal mengirim pesan", variant: "destructive" });
          setInput(text);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Users size={13} />
            <span>{online} online</span>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-xs ${connected ? "text-emerald-400" : "text-red-400"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{connected ? "TERHUBUNG" : "TERPUTUS"}</span>
          </div>
        </div>
      </div>

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
          const color = getUserColor(msg.username);
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold font-mono ${
                isMe ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-white/10 " + color
              }`}>
                {msg.username.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <span className={`font-mono text-xs font-bold ${isMe ? "text-primary" : color}`}>
                    {isMe ? "Kamu" : msg.username}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">{formatTime(msg.createdAt)}</span>
                </div>
                <div className={`px-3 py-2 rounded-xl text-sm font-mono break-words ${
                  isMe
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
          placeholder={connected ? "Ketik pesan..." : "Menghubungkan..."}
          disabled={!connected || sendMutation.isPending}
          maxLength={500}
          className="font-mono bg-background/50 border-primary/30 focus:border-primary focus:ring-primary/20 flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || !connected || sendMutation.isPending}
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
