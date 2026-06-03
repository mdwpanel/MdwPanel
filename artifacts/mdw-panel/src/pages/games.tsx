import { useState } from "react";
import { useListGames, useCreateGame, useUpdateGame, useDeleteGame, getListGamesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Gamepad2, Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  slug: z.string().min(1, "Slug required"),
  version: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "maintenance", "disabled"]),
});
type FormValues = z.infer<typeof schema>;

export default function GamesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [createOpen, setCreateOpen] = useState(false);
  const [editGame, setEditGame] = useState<{ id: number; name: string; slug: string; status: string; version?: string | null; description?: string | null } | null>(null);

  const { data: games, isLoading } = useListGames({ query: { queryKey: getListGamesQueryKey() } });
  const createMutation = useCreateGame();
  const updateMutation = useUpdateGame();
  const deleteMutation = useDeleteGame();

  const createForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", version: "", description: "", status: "active" },
  });
  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", version: "", description: "", status: "active" },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListGamesQueryKey() });

  const onCreate = (v: FormValues) => {
    createMutation.mutate({ data: { name: v.name, slug: v.slug, version: v.version, description: v.description, status: v.status } }, {
      onSuccess: () => { toast({ title: "Game created" }); setCreateOpen(false); createForm.reset(); invalidate(); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const onEdit = (v: FormValues) => {
    if (!editGame) return;
    updateMutation.mutate({ id: editGame.id, data: { name: v.name, version: v.version, description: v.description, status: v.status } }, {
      onSuccess: () => { toast({ title: "Game updated" }); setEditGame(null); invalidate(); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const openEdit = (g: NonNullable<typeof editGame>) => {
    setEditGame(g);
    editForm.reset({ name: g.name, slug: g.slug, version: g.version ?? "", description: g.description ?? "", status: g.status as "active" | "maintenance" | "disabled" });
  };

  const deleteGame = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Game deleted" }); invalidate(); },
    });
  };

  const statusStyle: Record<string, string> = {
    active: "text-green-400 bg-green-500/10 border-green-500/30",
    maintenance: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    disabled: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  const GameForm = ({ form, onSubmit, loading }: { form: ReturnType<typeof useForm<FormValues>>, onSubmit: (v: FormValues) => void, loading: boolean }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel className="font-mono text-xs">GAME NAME</FormLabel>
              <FormControl><Input {...field} placeholder="PUBG Mobile" className="font-mono" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="slug" render={({ field }) => (
            <FormItem><FormLabel className="font-mono text-xs">SLUG (ID)</FormLabel>
              <FormControl><Input {...field} placeholder="PUBG" className="font-mono" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="version" render={({ field }) => (
            <FormItem><FormLabel className="font-mono text-xs">VERSION</FormLabel>
              <FormControl><Input {...field} placeholder="v3.2" className="font-mono" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel className="font-mono text-xs">STATUS</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel className="font-mono text-xs">DESCRIPTION</FormLabel>
            <FormControl><Input {...field} placeholder="Short description" className="font-mono" /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={loading} className="w-full font-mono bg-primary text-primary-foreground">
          {loading ? "SAVING..." : "SAVE"}
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black font-mono text-foreground tracking-wide mb-1">[&gt;] GAMES</h2>
          <p className="text-muted-foreground font-mono text-sm">Manage supported games</p>
        </div>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={14} className="mr-1" /> ADD GAME
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-primary/30">
              <DialogHeader><DialogTitle className="font-mono">ADD GAME</DialogTitle></DialogHeader>
              <GameForm form={createForm} onSubmit={onCreate} loading={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editGame} onOpenChange={(o) => !o && setEditGame(null)}>
        <DialogContent className="glass-panel border-primary/30">
          <DialogHeader><DialogTitle className="font-mono">EDIT GAME</DialogTitle></DialogHeader>
          <GameForm form={editForm} onSubmit={onEdit} loading={updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-6 border border-border animate-pulse h-36" />
          ))
        ) : !games?.length ? (
          <div className="col-span-3 p-12 text-center glass-panel rounded-xl border border-border">
            <Gamepad2 size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-mono text-sm">No games configured</p>
          </div>
        ) : (
          games.map((g) => (
            <div key={g.id} data-testid={`card-game-${g.id}`} className="glass-panel rounded-xl p-6 border border-border hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold font-mono text-foreground">{g.name}</h3>
                  <p className="text-xs font-mono text-primary mt-0.5">{g.slug}</p>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${statusStyle[g.status]}`}>
                  {g.status.toUpperCase()}
                </span>
              </div>
              {g.version && <p className="text-xs font-mono text-muted-foreground mb-1">Version: {g.version}</p>}
              {g.description && <p className="text-xs text-muted-foreground mb-4">{g.description}</p>}
              {isAdmin && (
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openEdit({ id: g.id, name: g.name, slug: g.slug, status: g.status, version: g.version, description: g.description })}
                    className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteGame(g.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
