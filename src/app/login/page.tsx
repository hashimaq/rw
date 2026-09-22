"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { RedWingsIdentityBlock } from "@/components/branding/red-wings-logo";
import { BackButton } from "@/components/ui/back-button";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function safeNext(): string {
    if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
      return "/admin";
    }
    return nextPath;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Invalid email or password.");
      return;
    }
    router.push(safeNext());
    router.refresh();
  }

  return (
    <>
      {nextPath === "/matches/setup" ? (
        <p className="mb-4 rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface-hover)] px-4 py-3 text-center text-sm text-[var(--rw-muted)]">
          Sign in with a <strong className="text-[var(--rw-text)]">Red Wings admin</strong> account to
          open Match Setup.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--rw-muted)]">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rw-input w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--rw-muted)]">
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rw-input w-full"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rw-focus-ring rw-btn-primary w-full disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="rw-app-bg relative flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 50% 18%, var(--rw-primary-glow), transparent 48%)",
        }}
      />
      <div className="rw-animate-in relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[var(--rw-border)] bg-[var(--rw-surface)] p-8 shadow-[var(--rw-shadow-lg)] sm:p-10">
        <RedWingsIdentityBlock logoSize={128} priority animate panel />
        <div className="mt-8">
          <Suspense
            fallback={
              <p className="text-center text-sm text-[var(--rw-muted)]">Loading…</p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
        <div className="mt-6 flex justify-center">
          <BackButton href="/" ariaLabel="Go back to home" />
        </div>
      </div>
    </main>
  );
}
