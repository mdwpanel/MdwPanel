import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Key,
  Users,
  Gamepad2,
  FileJson,
  Plug,
  LogOut,
  Download,
  ChevronDown,
  User,
  Menu,
  X,
  Settings,
  MessageSquare,
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function NavItems({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => logout() });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/keys", label: "License Keys", icon: Key },
    { href: "/games", label: "Games", icon: Gamepad2 },
    ...(user?.role === "admin"
      ? [{ href: "/users", label: "Users", icon: Users }]
      : []),
    { href: "/chat", label: "Grup Chat", icon: MessageSquare },
    { href: "/downloads", label: "Download APK", icon: Download },
    { href: "/api-docs", label: "API Docs", icon: FileJson },
    { href: "/connect", label: "Connect Guide", icon: Plug },
    ...(user?.role === "admin"
      ? [{ href: "/settings", label: "Settings", icon: Settings }]
      : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-primary/20">
        <h1 className="text-3xl font-black text-primary tracking-tighter neon-text">
          MDW<span className="text-foreground">PANEL</span>
        </h1>
        <p className="text-xs text-muted-foreground font-mono mt-1">v1.0 VIP FREE PANEL</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location === item.href
            : location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <a
                onClick={onNavigate}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/50 neon-border"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                }`}
              >
                <item.icon size={18} className={isActive ? "text-primary" : ""} />
                <span className="font-medium tracking-wide">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-primary/20 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors group border border-transparent hover:border-primary/20">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold truncate text-foreground leading-none">
                  {user?.username}
                </p>
                <p className="text-xs text-primary font-mono mt-0.5">
                  {user?.role.toUpperCase()}
                </p>
              </div>
              <ChevronDown
                size={14}
                className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56 bg-background border-primary/30"
          >
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground font-mono">LOGGED IN AS</p>
              <p className="text-sm font-bold text-foreground truncate">{user?.username}</p>
              <p className="text-xs text-primary font-mono">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-primary/20" />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer font-medium"
            >
              <LogOut size={15} />
              {logoutMutation.isPending ? "Keluar..." : "Keluar dari Akun"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="destructive"
          className="w-full justify-start gap-2 bg-destructive/20 hover:bg-destructive/40 text-destructive-foreground border border-destructive/50"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut size={16} />
          {logoutMutation.isPending ? "KELUAR..." : "DISCONNECT"}
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      {/* Marquee Ticker */}
      <div className="w-full bg-primary/10 border-b border-primary/30 overflow-hidden py-1 relative z-50 flex-shrink-0">
        <div className="animate-marquee text-primary font-mono text-sm tracking-wider font-bold neon-text whitespace-nowrap">
          MDW PANEL v1.0 — CREATE YOUR PANEL FREE — APK PUBG MOD SAFE
        </div>
      </div>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-background/95 backdrop-blur z-40 flex-shrink-0">
        <h1 className="text-2xl font-black text-primary tracking-tighter neon-text">
          MDW<span className="text-foreground">Panel</span>
        </h1>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:bg-primary/10 border border-primary/30"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-background border-r border-primary/30 [&>button]:hidden"
          >
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <aside className="hidden md:flex w-64 glass-panel border-r border-primary/30 flex-col flex-shrink-0 z-40">
          <NavItems />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwgMjQwLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] pointer-events-none z-0" />
          <div className="relative z-10 p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
