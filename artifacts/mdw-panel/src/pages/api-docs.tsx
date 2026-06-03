import { useState } from "react";
import { CheckCheck, Copy, FileJson } from "lucide-react";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg overflow-hidden border border-primary/20 bg-black/40 mt-2">
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/10">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <button onClick={copy} className="text-muted-foreground hover:text-primary transition-colors text-xs font-mono flex items-center gap-1">
          {copied ? <><CheckCheck size={12} className="text-green-400" /> COPIED</> : <><Copy size={12} /> COPY</>}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-green-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const endpoints = [
  {
    method: "POST",
    path: "/api/auth/register",
    desc: "Create a new user account. Returns user object and auth token.",
    body: `{
  "username": "your_username",
  "email": "you@example.com",
  "password": "yourpassword"
}`,
    response: `{
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "you@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}`,
    curl: `curl -X POST https://YOUR_DOMAIN/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"username":"mdwuser","email":"user@example.com","password":"pass123"}'`,
  },
  {
    method: "POST",
    path: "/api/auth/login",
    desc: "Login with username and password. Returns user object and auth token. If user doesn't exist, returns error.",
    body: `{
  "username": "your_username",
  "password": "yourpassword"
}`,
    response: `{
  "user": { "id": 1, "username": "your_username", "role": "user" },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}`,
    curl: `curl -X POST https://YOUR_DOMAIN/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"mdwuser","password":"pass123"}'`,
  },
  {
    method: "POST",
    path: "/connect",
    desc: "Main authentication endpoint for game clients (C++ / Android). Accepts form-urlencoded body. Validates the license key, checks HWID binding, and returns a signed token on success.",
    body: "game=PUBG&user_key=MDW-XXXX-XXXX-XXXX&serial=DEVICE_HWID_HASH",
    response: `// SUCCESS:
{
  "status": true,
  "data": {
    "token": "md5_hash_token",
    "rng": 1704067200,
    "EXP": "2024-12-31"
  }
}

// FAILURE:
{
  "status": false,
  "reason": "Invalid key"
}`,
    curl: `curl -X POST https://YOUR_DOMAIN/connect \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "game=PUBG&user_key=MDW-ABCD-1234-EFGH&serial=DEVICE_SERIAL_HASH"`,
  },
  {
    method: "GET",
    path: "/api/auth/me",
    desc: "Get current user profile. Requires Authorization header.",
    body: "",
    response: `{
  "id": 1,
  "username": "your_username",
  "email": "you@example.com",
  "role": "user",
  "banned": false,
  "createdAt": "2024-01-01T00:00:00Z"
}`,
    curl: `curl https://YOUR_DOMAIN/api/auth/me \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
  },
];

const methodColor: Record<string, string> = {
  GET: "text-green-400 bg-green-500/10 border-green-500/30",
  POST: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  PATCH: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  DELETE: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function ApiDocsPage() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black font-mono text-foreground tracking-wide mb-1">[&gt;] PUBLIC REST API</h2>
        <p className="text-muted-foreground font-mono text-sm">MDW Panel public API documentation</p>
      </div>

      <div className="glass-panel rounded-xl p-5 border border-primary/20">
        <p className="font-mono text-xs text-muted-foreground mb-2 tracking-widest">BASE URL</p>
        <code className="font-mono text-primary text-sm neon-text">https://YOUR_DOMAIN</code>
        <p className="text-xs text-muted-foreground mt-3">All API routes are prefixed with <code className="text-primary font-mono">/api</code> except <code className="text-primary font-mono">/connect</code> which is at root.</p>
      </div>

      <div className="space-y-3">
        {endpoints.map((ep, i) => (
          <div key={i} className="glass-panel rounded-xl border border-border overflow-hidden">
            <button
              className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded border ${methodColor[ep.method]}`}>
                {ep.method}
              </span>
              <code className="font-mono text-foreground text-sm">{ep.path}</code>
              {ep.path === "/connect" && (
                <span className="ml-2 text-xs font-mono text-primary border border-primary/30 px-2 py-0.5 rounded-full">MAIN ENDPOINT</span>
              )}
              <FileJson size={14} className="ml-auto text-muted-foreground" />
            </button>

            {expanded === i && (
              <div className="px-5 pb-5 space-y-4 border-t border-border">
                <p className="text-sm text-muted-foreground mt-4">{ep.desc}</p>

                {ep.body && (
                  <div>
                    <p className="font-mono text-xs tracking-widest text-muted-foreground mb-1">REQUEST BODY</p>
                    <CodeBlock code={ep.body} language={ep.method === "POST" && ep.path === "/connect" ? "form-urlencoded" : "json"} />
                  </div>
                )}

                <div>
                  <p className="font-mono text-xs tracking-widest text-muted-foreground mb-1">RESPONSE</p>
                  <CodeBlock code={ep.response} language="json" />
                </div>

                <div>
                  <p className="font-mono text-xs tracking-widest text-muted-foreground mb-1">EXAMPLE (curl)</p>
                  <CodeBlock code={ep.curl} language="bash" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
