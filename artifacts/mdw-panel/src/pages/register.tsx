import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, Terminal, KeyRound } from "lucide-react";

const schema = z.object({
  username: z.string().min(3, "Username min 3 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password min 6 karakter"),
  confirmPassword: z.string(),
  inviteCode: z.string().min(1, "Kode undangan wajib diisi"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const registerMutation = useRegister();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "", inviteCode: "" },
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    registerMutation.mutate(
      { data: { username: values.username, email: values.email, password: values.password, inviteCode: values.inviteCode } },
      {
        onSuccess: (data) => {
          login(data.token);
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string } };
          setError(apiErr?.data?.error ?? "Registrasi gagal");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,240,255,0.08)_0%,transparent_60%)]" />

      <div className="fixed top-0 left-0 right-0 z-50 bg-primary/10 border-b border-primary/20 py-1 overflow-hidden">
        <div className="animate-marquee text-primary font-mono text-xs tracking-widest font-bold neon-text">
          MDW PANEL v1.0 &mdash; UNDETECTED &mdash; SAFE TO USE &mdash; CONSTANTLY UPDATED &mdash;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MDW PANEL v1.0 &mdash; UNDETECTED &mdash; SAFE TO USE &mdash; CONSTANTLY UPDATED &mdash;
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 mt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Terminal className="text-primary" size={28} />
            <h1 className="text-5xl font-black text-primary tracking-tight neon-text font-mono">MDW</h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm tracking-widest">BUAT AKUN BARU</p>
        </div>

        <div className="glass-panel rounded-xl p-8 neon-border">
          <h2 className="text-xl font-bold font-mono text-foreground mb-6 tracking-wide">
            [&gt;] REGISTER
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive text-sm font-mono">
              ERROR: {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground">USERNAME</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="pilih_username" data-testid="input-username"
                      className="font-mono bg-background/50 border-border focus:border-primary focus:ring-primary/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground">EMAIL</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="email@kamu.com" data-testid="input-email"
                      className="font-mono bg-background/50 border-border focus:border-primary focus:ring-primary/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground">PASSWORD</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="min 6 karakter" data-testid="input-password"
                      className="font-mono bg-background/50 border-border focus:border-primary focus:ring-primary/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground">KONFIRMASI PASSWORD</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="ulangi password" data-testid="input-confirm-password"
                      className="font-mono bg-background/50 border-border focus:border-primary focus:ring-primary/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="inviteCode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground flex items-center gap-1">
                    <KeyRound size={11} /> KODE UNDANGAN
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="masukkan kode undangan" data-testid="input-invite-code"
                      className="font-mono bg-background/50 border-primary/40 focus:border-primary focus:ring-primary/30 text-primary placeholder:text-muted-foreground/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" data-testid="button-submit" disabled={registerMutation.isPending}
                className="w-full font-mono tracking-widest font-bold bg-primary text-primary-foreground hover:bg-primary/90 neon-border">
                {registerMutation.isPending ? "MEMBUAT AKUN..." : (
                  <><UserPlus size={16} className="mr-2" />BUAT AKUN</>
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center mt-6 text-sm text-muted-foreground font-mono">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary hover:underline font-bold">LOGIN DISINI</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
