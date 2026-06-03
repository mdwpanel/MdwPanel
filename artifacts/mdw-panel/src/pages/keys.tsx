import { useState } from "react";
import {
  useListKeys, useCreateKey, useUpdateKey, useDeleteKey, useBulkCreateKeys, useListGames,
  getListGamesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Key, Plus, Trash2, Ban, Copy, CheckCheck, Layers, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-1 text-muted-foreground hover:text-primary transition-colors" title="Copy">
      {copied ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

const createSchema = z.object({
  game: z.string().min(1, "Game required"),
  duration: z.coerce.number().int().min(1, "Min 1 day"),
  note: z.string().optional(),
});

const bulkSchema = z.object({
  game: z.string().min(1, "Game required"),
  duration: z.coerce.number().int().min(1),
  count: z.coerce.number().int().min(1).max(100),
  note: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type BulkForm = z.infer<typeof bulkSchema>;

const KEYS_QUERY_PREFIX = "/api/keys";

export default function KeysPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [filterGame, setFilterGame] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [banningIds, setBanningIds] = useState<Set<number>>(new Set());

  const params = {
    page,
    limit: 20,
    ...(filterGame !== "all" ? { game: filterGame } : {}),
    ...(filterStatus !== "all" ? { status: filterStatus as "active" | "expired" | "banned" } : {}),
  };

  const { data, isLoading } = useListKeys(params);
  const { data: games } = useListGames({ query: { queryKey: getListGamesQueryKey() } });
  const createMutation = useCreateKey();
  const updateMutation = useUpdateKey();
  const deleteMutation = useDeleteKey();
  const bulkMutation = useBulkCreateKeys();

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { game: "", duration: 30, note: "" },
  });
  const bulkForm = useForm<BulkForm>({
    resolver: zodResolver(bulkSchema),
    defaultValues: { game: "", duration: 30, count: 10, note: "" },
  });

  // Invalidate all /api/keys queries regardless of params
  const invalidateKeys = () =>
    qc.invalidateQueries({ queryKey: [KEYS_QUERY_PREFIX] });

  const onCreateKey = (v: CreateForm) => {
    createMutation.mutate({ data: { game: v.game, duration: v.duration, note: v.note } }, {
      onSuccess: () => {
        toast({ title: "Key created" });
        setCreateOpen(false);
        createForm.reset();
        invalidateKeys();
      },
      onError: () => toast({ title: "Error creating key", variant: "destructive" }),
    });
  };

  const onBulkCreate = (v: BulkForm) => {
    bulkMutation.mutate({ data: { game: v.game, duration: v.duration, count: v.count, note: v.note } }, {
      onSuccess: (keys) => {
        toast({ title: `${keys.length} keys created` });
        setBulkOpen(false);
        bulkForm.reset();
        invalidateKeys();
      },
      onError: () => toast({ title: "Error generating keys", variant: "destructive" }),
    });
  };

  const banKey = (id: number) => {
    if (banningIds.has(id)) return;
    setBanningIds((s) => new Set(s).add(id));
    updateMutation.mutate({ id, data: { status: "banned" } }, {
      onSuccess: () => {
        toast({ title: "Key banned" });
        // Optimistically update the specific key in cache
        qc.setQueriesData({ queryKey: [KEYS_QUERY_PREFIX] }, (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const data = old as { keys: Array<{ id: number; status: string }> };
          return {
            ...data,
            keys: data.keys.map((k) => k.id === id ? { ...k, status: "banned" } : k),
          };
        });
      },
      onError: () => toast({ title: "Error banning key", variant: "destructive" }),
      onSettled: () => {
        setBanningIds((s) => { const n = new Set(s); n.delete(id); return n; });
        invalidateKeys();
      },
    });
  };

  const deleteKey = (id: number) => {
    if (deletingIds.has(id)) return;
    setDeletingIds((s) => new Set(s).add(id));

    // Optimistically remove from all cached pages immediately
    qc.setQueriesData({ queryKey: [KEYS_QUERY_PREFIX] }, (old: unknown) => {
      if (!old || typeof old !== "object") return old;
      const data = old as { keys: Array<{ id: number }>; total: number };
      return {
        ...data,
        keys: data.keys.filter((k) => k.id !== id),
        total: Math.max(0, data.total - 1),
      };
    });

    deleteMutation.mutate({ id }, {
      onSuccess: () => toast({ title: "Key deleted" }),
      onError: () => {
        toast({ title: "Error deleting key", variant: "destructive" });
        invalidateKeys(); // roll back on error
      },
      onSettled: () => {
        setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n; });
        invalidateKeys();
      },
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "text-green-400 bg-green-500/10 border-green-500/30",
      expired: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      banned: "text-red-400 bg-red-500/10 border-red-500/30",
    };
    return map[status] ?? "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black font-mono text-foreground tracking-wide mb-1">[&gt;] LICENSE KEYS</h2>
          <p className="text-muted-foreground font-mono text-sm">
            {isAdmin ? "Manage authentication keys" : "Key yang terdaftar pada akun kamu"}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-mono text-xs border-primary/40 text-primary hover:bg-primary/10">
                  <Layers size={14} className="mr-1" /> BULK GENERATE
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-primary/30">
                <DialogHeader><DialogTitle className="font-mono">BULK GENERATE KEYS</DialogTitle></DialogHeader>
                <Form {...bulkForm}>
                  <form onSubmit={bulkForm.handleSubmit(onBulkCreate)} className="space-y-4">
                    <FormField control={bulkForm.control} name="game" render={({ field }) => (
                      <FormItem><FormLabel className="font-mono text-xs">GAME</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select game" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {games?.map(g => <SelectItem key={g.id} value={g.slug}>{g.name}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={bulkForm.control} name="duration" render={({ field }) => (
                        <FormItem><FormLabel className="font-mono text-xs">DURATION (days)</FormLabel>
                          <FormControl><Input {...field} type="number" className="font-mono" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={bulkForm.control} name="count" render={({ field }) => (
                        <FormItem><FormLabel className="font-mono text-xs">COUNT (max 100)</FormLabel>
                          <FormControl><Input {...field} type="number" className="font-mono" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={bulkForm.control} name="note" render={({ field }) => (
                      <FormItem><FormLabel className="font-mono text-xs">NOTE (optional)</FormLabel>
                        <FormControl><Input {...field} className="font-mono" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" disabled={bulkMutation.isPending} className="w-full font-mono bg-primary text-primary-foreground">
                      {bulkMutation.isPending ? "GENERATING..." : "GENERATE"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
          </Dialog>
          )}

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90 neon-border">
                <Plus size={14} className="mr-1" /> NEW KEY
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-primary/30">
              <DialogHeader><DialogTitle className="font-mono">GENERATE KEY</DialogTitle></DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateKey)} className="space-y-4">
                  <FormField control={createForm.control} name="game" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">GAME</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select game" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {games?.map(g => <SelectItem key={g.id} value={g.slug}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="duration" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">DURATION (days)</FormLabel>
                      <FormControl><Input {...field} type="number" className="font-mono" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="note" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">NOTE (optional)</FormLabel>
                      <FormControl><Input {...field} className="font-mono" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={createMutation.isPending} className="w-full font-mono bg-primary text-primary-foreground">
                    {createMutation.isPending ? "GENERATING..." : "GENERATE KEY"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterGame} onValueChange={(v) => { setFilterGame(v); setPage(1); }}>
          <SelectTrigger className="w-44 font-mono text-xs border-border bg-background">
            <SelectValue placeholder="All Games" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Games</SelectItem>
            {games?.map(g => <SelectItem key={g.id} value={g.slug}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40 font-mono text-xs border-border bg-background">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs font-mono text-muted-foreground flex items-center">
          {data ? `${data.total} keys total` : ""}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        ) : !data?.keys.length ? (
          <div className="p-12 text-center">
            <Key size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-mono text-sm">No keys found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["KEY", "GAME", "STATUS", "DURATION", "EXPIRES", ...(isAdmin ? ["USER", "HWID", "ACTIONS"] : ["HWID"])].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.keys.map((k) => {
                  const isDeleting = deletingIds.has(k.id);
                  const isBanning = banningIds.has(k.id);
                  return (
                    <tr
                      key={k.id}
                      className={`border-b border-border/50 transition-all ${isDeleting ? "opacity-30 pointer-events-none" : "hover:bg-white/[0.02]"}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-primary">{k.key}</span>
                        <CopyButton text={k.key} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.game}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${statusBadge(k.status)}`}>
                          {k.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.duration}d</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "-"}
                      </td>
                      {isAdmin && <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.username ?? "-"}</td>}
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[80px] truncate">
                        {k.hwid ? k.hwid.slice(0, 12) + "..." : "-"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {k.status !== "banned" && (
                              <button
                                onClick={() => banKey(k.id)}
                                disabled={isBanning || isDeleting}
                                title="Ban"
                                className="p-1 text-amber-400 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-40"
                              >
                                <Ban size={13} className={isBanning ? "animate-pulse" : ""} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteKey(k.id)}
                              disabled={isDeleting}
                              title="Delete"
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={13} className={isDeleting ? "animate-pulse" : ""} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              Page {page} of {Math.ceil(data.total / 20)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="font-mono text-xs">PREV</Button>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)}
                className="font-mono text-xs">NEXT</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
