"use client";

import { useState } from "react";
import { Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const basePath = `/${params.locale}/${params.portalSlug}`;

  const handleLogin = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ref: email,
          user_traits: {
            email,
            display_name: name || email.split("@")[0],
          },
        }),
      });

      if (!res.ok) throw new Error("Login failed");

      const data = await res.json();
      localStorage.setItem("devrev_session_token", data.access_token);
      localStorage.setItem("devrev_authenticated", "true");
      // Set httpOnly cookie for SSR support
      await fetch("/api/auth/cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.access_token, authenticated: true }),
      }).catch(() => {});
      window.location.href = basePath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold mb-4">
            BILL
          </div>
          <h1 className="text-xl font-bold text-foreground">BILL Help Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to access your support portal
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Your name
              </label>
              <Input
                placeholder="Sarah Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button
              className="w-full gap-2"
              onClick={handleLogin}
              disabled={!email.includes("@") || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Powered by{" "}
          <a href="https://devrev.ai" className="font-medium text-foreground hover:text-primary">
            DevRev
          </a>
        </p>
      </div>
    </div>
  );
}
