import { useState } from "react";
import { CheckCheck, Copy, Plug, ShieldCheck, Cpu } from "lucide-react";

function CodeBlock({ code, language = "cpp" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-lg overflow-hidden border border-primary/20 bg-black/40 mt-2">
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/10">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <button onClick={copy} className="text-muted-foreground hover:text-primary transition-colors text-xs font-mono flex items-center gap-1">
          {copied ? <><CheckCheck size={12} className="text-green-400" /> COPIED</> : <><Copy size={12} /> COPY</>}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-green-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black font-mono text-foreground tracking-wide mb-1">[&gt;] CONNECT GUIDE</h2>
        <p className="text-muted-foreground font-mono text-sm">Integration guide for C++ / Android game clients</p>
      </div>

      {/* Connection info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl p-5 border border-primary/20">
          <Plug size={18} className="text-primary mb-3" />
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">ENDPOINT URL</p>
          <code className="font-mono text-primary text-xs break-all">https://YOUR_DOMAIN/connect</code>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-green-500/20">
          <ShieldCheck size={18} className="text-green-400 mb-3" />
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">METHOD</p>
          <code className="font-mono text-green-400 text-sm">POST</code>
          <p className="font-mono text-xs text-muted-foreground mt-1">application/x-www-form-urlencoded</p>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-blue-500/20">
          <Cpu size={18} className="text-blue-400 mb-3" />
          <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">HWID LOCK</p>
          <code className="font-mono text-blue-400 text-sm">ENABLED</code>
          <p className="font-mono text-xs text-muted-foreground mt-1">First use binds serial</p>
        </div>
      </div>

      {/* Request format */}
      <div className="glass-panel rounded-xl border border-border p-6">
        <h3 className="font-mono font-bold text-sm tracking-widest text-foreground mb-4">REQUEST FORMAT</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left font-mono text-xs tracking-widest text-muted-foreground">FIELD</th>
                <th className="py-2 text-left font-mono text-xs tracking-widest text-muted-foreground">TYPE</th>
                <th className="py-2 text-left font-mono text-xs tracking-widest text-muted-foreground">REQUIRED</th>
                <th className="py-2 text-left font-mono text-xs tracking-widest text-muted-foreground">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { field: "game", type: "string", req: "Yes", desc: "Game slug (e.g. PUBG, FF, ML)" },
                { field: "user_key", type: "string", req: "Yes", desc: "License key (format: MDW-XXXX-XXXX-XXXX)" },
                { field: "serial", type: "string", req: "Optional", desc: "Device HWID/serial for hardware lock" },
              ].map(row => (
                <tr key={row.field}>
                  <td className="py-3 font-mono text-xs text-primary">{row.field}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{row.type}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{row.req}</td>
                  <td className="py-3 text-xs text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response format */}
      <div className="glass-panel rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-mono font-bold text-sm tracking-widest text-foreground">RESPONSE FORMAT</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-mono text-green-400 tracking-widest mb-2">SUCCESS</p>
            <CodeBlock code={`{
  "status": true,
  "data": {
    "token": "md5_signature",
    "rng":   1704067200,
    "EXP":   "2024-12-31"
  }
}`} language="json" />
          </div>
          <div>
            <p className="text-xs font-mono text-red-400 tracking-widest mb-2">FAILURE</p>
            <CodeBlock code={`{
  "status": false,
  "reason": "Invalid key"
}

// Other reasons:
// "Key has been banned"
// "Key has expired"
// "HWID mismatch"
// "Missing required fields"`} language="json" />
          </div>
        </div>
      </div>

      {/* C++ example */}
      <div className="glass-panel rounded-xl border border-border p-6">
        <h3 className="font-mono font-bold text-sm tracking-widest text-foreground mb-4">C++ INTEGRATION (libcurl)</h3>
        <CodeBlock code={`#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <string>

using json = nlohmann::json;

std::string Login(const char* user_key, const char* game, const char* serial) {
    CURL* curl = curl_easy_init();
    if (!curl) return "Internal Error";

    struct MemoryStruct { char* memory; size_t size; };
    MemoryStruct chunk = { (char*)malloc(1), 0 };

    std::string url = "https://YOUR_DOMAIN/connect";
    std::string data = "game=";
    data += game;
    data += "&user_key=";
    data += user_key;
    data += "&serial=";
    data += serial;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void*)&chunk);

    CURLcode res = curl_easy_perform(curl);
    std::string result_str = "Connection failed";

    if (res == CURLE_OK) {
        try {
            json result = json::parse(chunk.memory);
            if (result["status"] == true) {
                std::string token = result["data"]["token"].get<std::string>();
                time_t rng = result["data"]["rng"].get<time_t>();
                std::string exp = result["data"]["EXP"].get<std::string>();
                // Verify rng + 30 > time(0) for freshness
                if (rng + 30 > time(0)) {
                    result_str = "OK";
                    // Store token globally for further auth
                }
            } else {
                result_str = result["reason"].get<std::string>();
            }
        } catch (...) {
            result_str = "Parse error";
        }
    }

    curl_easy_cleanup(curl);
    free(chunk.memory);
    return result_str;
}`} language="cpp" />
      </div>

      {/* Error codes */}
      <div className="glass-panel rounded-xl border border-border p-6">
        <h3 className="font-mono font-bold text-sm tracking-widest text-foreground mb-4">ERROR CODES</h3>
        <div className="space-y-2">
          {[
            { reason: "Invalid key", desc: "Key does not exist or wrong game" },
            { reason: "Key has been banned", desc: "Key was manually banned by admin" },
            { reason: "Key has expired", desc: "Key duration has passed" },
            { reason: "HWID mismatch", desc: "Device serial doesn't match bound HWID" },
            { reason: "Missing required fields", desc: "game or user_key not provided" },
          ].map(e => (
            <div key={e.reason} className="flex items-start gap-3 py-2 border-b border-border/50">
              <code className="font-mono text-xs text-red-400 w-44 shrink-0">{e.reason}</code>
              <p className="text-xs text-muted-foreground">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
