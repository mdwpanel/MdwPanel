import { useGetDashboardStats, useGetRecentActivity, getGetDashboardStatsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Key, Users, Gamepad2, Zap, Shield, ShieldOff, Activity } from "lucide-react";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const { data: activity, isLoading: actLoading } = useGetRecentActivity(
    { limit: 15 },
    { query: { queryKey: getGetRecentActivityQueryKey({ limit: 15 }) } }
  );

  const statCards = [
    { label: "TOTAL KEYS", value: stats?.totalKeys ?? 0, icon: Key, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
    { label: "ACTIVE KEYS", value: stats?.activeKeys ?? 0, icon: Shield, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    { label: "EXPIRED", value: stats?.expiredKeys ?? 0, icon: ShieldOff, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { label: "BANNED", value: stats?.bannedKeys ?? 0, icon: ShieldOff, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
    { label: "TOTAL USERS", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    { label: "GAMES", value: stats?.totalGames ?? 0, icon: Gamepad2, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
    { label: "TODAY CONNECTS", value: stats?.todayConnects ?? 0, icon: Zap, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
    { label: "TOTAL CONNECTS", value: stats?.recentConnects ?? 0, icon: Activity, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black font-mono text-foreground tracking-wide mb-1">
          [&gt;] DASHBOARD
        </h2>
        <p className="text-muted-foreground font-mono text-sm">System overview & live statistics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            data-testid={`stat-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`glass-panel rounded-xl p-5 border ${card.border} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-mono tracking-widest font-bold ${card.color} mb-2`}>{card.label}</p>
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted/50 rounded animate-pulse" />
                ) : (
                  <p className={`text-3xl font-black font-mono ${card.color}`}>{card.value}</p>
                )}
              </div>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={20} className={card.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="glass-panel rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h3 className="font-mono font-bold text-sm tracking-widest text-foreground">RECENT ACTIVITY</h3>
        </div>
        {actLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : !activity?.length ? (
          <div className="p-12 text-center">
            <Activity size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-mono text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground">KEY</th>
                  <th className="px-4 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground">GAME</th>
                  <th className="px-4 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground">STATUS</th>
                  <th className="px-4 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground">IP</th>
                  <th className="px-4 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground">TIME</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-foreground">
                      {log.key.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.game}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        log.success
                          ? "text-green-400 bg-green-500/10"
                          : "text-red-400 bg-red-500/10"
                      }`}>
                        {log.success ? "SUCCESS" : "FAILED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ipAddress ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
