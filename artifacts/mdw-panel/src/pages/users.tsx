import { useState } from "react";
import { useListUsers, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Trash2, ShieldOff, Shield, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);

  const params = { page, limit: 20 };
  const { data, isLoading } = useListUsers(params, { query: { queryKey: getListUsersQueryKey(params) } });
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["listUsers"] });

  const toggleBan = (id: number, banned: boolean) => {
    updateMutation.mutate({ id, data: { banned: !banned } }, {
      onSuccess: () => { toast({ title: banned ? "User unbanned" : "User banned" }); invalidate(); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const deleteUser = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "User deleted" }); invalidate(); },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black font-mono text-foreground tracking-wide mb-1">[&gt;] USER MANAGEMENT</h2>
        <p className="text-muted-foreground font-mono text-sm">Manage registered users</p>
      </div>

      <div className="glass-panel rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        ) : !data?.users.length ? (
          <div className="p-12 text-center">
            <Users size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-mono text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["ID", "USERNAME", "EMAIL", "ROLE", "STATUS", "JOINED", "ACTIONS"].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} data-testid={`row-user-${u.id}`} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">#{u.id}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">{u.username}</span>
                        {u.role === "admin" && <Crown size={13} className="text-amber-400" />}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                        u.role === "admin"
                          ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                          : "text-blue-400 bg-blue-500/10 border-blue-500/30"
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                        u.banned
                          ? "text-red-400 bg-red-500/10 border-red-500/30"
                          : "text-green-400 bg-green-500/10 border-green-500/30"
                      }`}>
                        {u.banned ? "BANNED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => toggleBan(u.id, u.banned ?? false)}
                          title={u.banned ? "Unban" : "Ban"}
                          className={`p-1 rounded transition-colors ${
                            u.banned
                              ? "text-green-400 hover:bg-green-500/10"
                              : "text-amber-400 hover:bg-amber-500/10"
                          }`}>
                          {u.banned ? <Shield size={14} /> : <ShieldOff size={14} />}
                        </button>
                        <button onClick={() => deleteUser(u.id)} title="Delete"
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 20 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">Page {page} of {Math.ceil(data.total / 20)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="font-mono text-xs">PREV</Button>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)} className="font-mono text-xs">NEXT</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
