import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, Smartphone, Shield, Zap, Star, Settings2, ExternalLink } from "lucide-react";

type ApkSettings = {
  url: string;
  version: string;
  notes: string;
};

export default function DownloadsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apk, setApk] = useState<ApkSettings>({ url: "", version: "1.0.0", notes: "" });
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ApkSettings>({ url: "", version: "1.0.0", notes: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/apk")
      .then((r) => r.json())
      .then((data: ApkSettings) => {
        setApk(data);
        setForm(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("mdw_token");
      const res = await fetch("/api/settings/apk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setApk(form);
      setEditMode(false);
      toast({ title: "Tersimpan", description: "Pengaturan APK berhasil diperbarui." });
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat menyimpan pengaturan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const features = [
    { icon: Shield, label: "Anti-Ban Protection", desc: "Sistem bypass deteksi terbaru" },
    { icon: Zap, label: "Auto Update", desc: "Patch otomatis setiap versi baru" },
    { icon: Smartphone, label: "Android Support", desc: "Kompatibel Android 8.0+" },
    { icon: Star, label: "Premium Features", desc: "Semua fitur unlock tanpa batas" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-primary neon-text tracking-tight">
          DOWNLOAD APK
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Panel MDW — versi terbaru untuk Android
        </p>
      </div>

      {/* Main Download Card */}
      <div className="relative glass-panel rounded-xl border border-primary/30 neon-border overflow-hidden p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {/* Icon */}
          <div className="w-28 h-28 rounded-2xl bg-primary/10 border border-primary/40 flex items-center justify-center flex-shrink-0 neon-border">
            <Smartphone size={56} className="text-primary neon-text" />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
              <h2 className="text-2xl font-black text-foreground">MDW Panel</h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 border border-primary/50 text-primary rounded font-mono">
                v{loading ? "..." : apk.version}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-1 font-mono">
              Game Hack Authentication Client · Android APK
            </p>
            {apk.notes && (
              <p className="text-xs text-primary/80 font-mono mt-2 bg-primary/5 border border-primary/20 rounded px-3 py-2 inline-block">
                {apk.notes}
              </p>
            )}
          </div>

          {/* Download Button */}
          <div className="flex-shrink-0">
            {loading ? (
              <div className="w-48 h-14 bg-primary/10 rounded-lg animate-pulse" />
            ) : apk.url ? (
              <a href={apk.url} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="w-48 h-14 text-base font-black tracking-widest bg-primary hover:bg-primary/90 text-black gap-3 neon-border shadow-lg shadow-primary/30"
                >
                  <Download size={22} />
                  DOWNLOAD
                </Button>
              </a>
            ) : (
              <Button
                size="lg"
                disabled
                className="w-48 h-14 text-base font-black tracking-widest gap-3 opacity-40"
              >
                <Download size={22} />
                BELUM TERSEDIA
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => (
          <div
            key={f.label}
            className="glass-panel rounded-lg border border-primary/20 p-4 flex gap-3 items-start hover:border-primary/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <f.icon size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Installation Steps */}
      <div className="glass-panel rounded-xl border border-primary/20 p-6">
        <h3 className="text-lg font-black text-foreground mb-4 font-mono tracking-wide">
          CARA INSTALL
        </h3>
        <ol className="space-y-3">
          {[
            "Download file APK menggunakan tombol di atas.",
            'Buka Settings → Security → aktifkan "Install from Unknown Sources".',
            "Buka file APK yang sudah didownload dan klik Install.",
            "Buka aplikasi, masukkan license key yang sudah aktif.",
            "Nikmati semua fitur premium tanpa batas.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/50 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 font-mono">
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Admin Settings Panel */}
      {user?.role === "admin" && (
        <div className="glass-panel rounded-xl border border-yellow-500/30 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Settings2 size={18} className="text-yellow-400" />
              <h3 className="text-base font-black text-yellow-400 font-mono tracking-wide">
                ADMIN — PENGATURAN APK
              </h3>
            </div>
            {!editMode && (
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => { setForm(apk); setEditMode(true); }}
              >
                Edit
              </Button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-1.5 block">
                  URL DOWNLOAD APK
                </label>
                <div className="flex gap-2">
                  <Input
                    value={form.url}
                    onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                    placeholder="https://example.com/mdw-panel.apk"
                    className="font-mono text-sm"
                  />
                  {form.url && (
                    <a href={form.url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-primary">
                        <ExternalLink size={16} />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-1.5 block">
                  VERSI APK
                </label>
                <Input
                  value={form.version}
                  onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                  placeholder="1.0.0"
                  className="font-mono text-sm max-w-[200px]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-1.5 block">
                  CATATAN RILIS (opsional)
                </label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Contoh: Fix crash PUBG, tambah bypass baru"
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary text-black hover:bg-primary/90 font-bold"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditMode(false)}
                  className="text-muted-foreground"
                >
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">URL:</span>
                <span className="text-foreground truncate">{apk.url || "—"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Versi:</span>
                <span className="text-primary">{apk.version}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Catatan:</span>
                <span className="text-foreground">{apk.notes || "—"}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
