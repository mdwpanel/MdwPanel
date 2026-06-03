import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShieldAlert, LogIn, Terminal } from "lucide-react";

const schema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const loginMutation = useLogin();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: localStorage.getItem("mdw_last_username") ?? "", password: "" },
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          localStorage.setItem("mdw_last_username", values.username);
          login(data.token);
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string }; status?: number };
          const msg = apiErr?.data?.error ?? "Login failed";
          setError(msg);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,240,255,0.08)_0%,transparent_60%)]" />

      {/* Ticker */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary/10 border-b border-primary/20 py-1 overflow-hidden">
        <div className="animate-marquee text-primary font-mono text-xs tracking-widest font-bold neon-text">
          MDW PANEL v1.0 &mdash; UNDETECTED &mdash; SAFE TO USE &mdash; CONSTANTLY UPDATED &mdash;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MDW PANEL v1.0 &mdash; UNDETECTED &mdash; SAFE TO USE &mdash; CONSTANTLY UPDATED &mdash;
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 mt-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Terminal className="text-primary" size={28} />
            <h1 className="text-5xl font-black text-primary tracking-tight neon-text font-mono">MDW</h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm tracking-widest">PANEL VIP FREE v1.0</p>
        </div>

        {/* Register notice - always visible */}
        <div className="glass-panel rounded-lg p-3 mb-4 flex items-start gap-2 border border-amber-500/30">
          <ShieldAlert size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-300 text-sm font-mono">
            Belum punya akun? <Link href="/register" className="text-primary underline font-bold">Silahkan register dulu</Link> sebelum login. User tidak tersedia = belum register.
          </p>
        </div>

        {/* Login card */}
        <div className="glass-panel rounded-xl p-8 neon-border">
          <h2 className="text-xl font-bold font-mono text-foreground mb-6 tracking-wide">
            [&gt;] AUTHENTICATE
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive text-sm font-mono">
              ERROR: {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground">USERNAME</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="your_username"
                        data-testid="input-username"
                        className="font-mono bg-background/50 border-border focus:border-primary focus:ring-primary/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground">PASSWORD</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                        className="font-mono bg-background/50 border-border focus:border-primary focus:ring-primary/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                data-testid="button-submit"
                disabled={loginMutation.isPending}
                className="w-full font-mono tracking-widest font-bold bg-primary text-primary-foreground hover:bg-primary/90 neon-border"
              >
                {loginMutation.isPending ? "CONNECTING..." : (
                  <><LogIn size={16} className="mr-2" />LOGIN</>
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center mt-6 text-sm text-muted-foreground font-mono">
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">
              REGISTER HERE
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
