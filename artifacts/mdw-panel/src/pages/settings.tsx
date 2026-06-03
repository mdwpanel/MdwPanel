import { useState } from "react";
import { useGetInviteCode, useUpdateInviteCode } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, KeyRound, Copy, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  code: z.string().min(1, "Kode tidak boleh kosong"),
});
type FormValues = z.infer<typeof schema>;

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, refetch } = useGetInviteCode();
  const updateMutation = useUpdateInviteCode();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { code: data?.code ?? "" },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { data: { code: values.code } },
      {
        onSuccess: (res) => {
          form.setValue("code", res.code);
          refetch();
          toast({ title: "Kode undangan berhasil diperbarui" });
        },
        onError: () => toast({ title: "Gagal memperbarui kode undangan", variant: "destructive" }),
      }
    );
  };

  const copyCode = () => {
    const code = form.getValues("code");
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateRandom = () => {
    form.setValue("code", randomCode(), { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="text-primary" size={24} />
        <div>
          <h1 className="text-2xl font-black font-mono text-foreground tracking-tight">
            SETTINGS
          </h1>
          <p className="text-muted-foreground font-mono text-sm">Konfigurasi panel</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 neon-border max-w-lg">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={18} className="text-primary" />
          <h2 className="font-mono font-bold text-foreground tracking-wide">KODE UNDANGAN REGISTER</h2>
        </div>
        <p className="text-muted-foreground font-mono text-xs mb-5 leading-relaxed">
          Setiap user baru wajib memasukkan kode ini saat register. Tanpa kode yang benar, akun tidak bisa dibuat.
          Admin pertama (akun pertama) tidak memerlukan kode undangan.
        </p>

        {isLoading ? (
          <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs tracking-widest text-muted-foreground">KODE UNDANGAN</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="masukkan kode undangan"
                        className="font-mono bg-background/50 border-primary/40 focus:border-primary focus:ring-primary/30 text-primary tracking-widest"
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={copyCode}
                      title="Copy kode"
                      className="px-3 border border-primary/30 rounded-md text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
                    >
                      {copied ? <CheckCheck size={15} className="text-green-400" /> : <Copy size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={generateRandom}
                      title="Generate kode acak"
                      className="px-3 border border-primary/30 rounded-md text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isDirty}
                className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90 neon-border"
              >
                {updateMutation.isPending ? "MENYIMPAN..." : "SIMPAN KODE"}
              </Button>
            </form>
          </Form>
        )}

        {data?.code && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="font-mono text-xs text-muted-foreground mb-1">KODE AKTIF SAAT INI:</p>
            <p className="font-mono text-primary font-bold tracking-widest text-lg neon-text">{data.code}</p>
          </div>
        )}

        {!data?.code && !isLoading && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="font-mono text-xs text-amber-400">
              ⚠ Belum ada kode undangan. Set kode sekarang agar user baru tidak bisa register.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
