import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import KeysPage from "@/pages/keys";
import UsersPage from "@/pages/users";
import GamesPage from "@/pages/games";
import ApiDocsPage from "@/pages/api-docs";
import ConnectPage from "@/pages/connect-page";
import DownloadsPage from "@/pages/downloads";
import SettingsPage from "@/pages/settings";
import ChatPage from "@/pages/chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-primary text-2xl font-black font-mono neon-text animate-pulse-neon">MDWPanel</div>
          <p className="text-muted-foreground text-sm mt-2 font-mono">CONNECTING...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => {
        const { user, isLoading } = useAuth();
        if (isLoading) return null;
        return <Redirect to={user ? "/dashboard" : "/login"} />;
      }} />
      <Route path="/login" component={() => <PublicRoute component={LoginPage} />} />
      <Route path="/register" component={() => <PublicRoute component={RegisterPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/keys" component={() => <ProtectedRoute component={KeysPage} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route path="/games" component={() => <ProtectedRoute component={GamesPage} />} />
      <Route path="/api-docs" component={() => <ProtectedRoute component={ApiDocsPage} />} />
      <Route path="/connect" component={() => <ProtectedRoute component={ConnectPage} />} />
      <Route path="/downloads" component={() => <ProtectedRoute component={DownloadsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={ChatPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
