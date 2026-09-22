import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminActivityFeed } from "@/components/admin/admin-activity-feed";
import { AdminRoleBadge } from "@/components/admin/admin-role-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminMatchListItem } from "@/components/admin/admin-match-list-item";
import { getServerSession } from "@/lib/auth/server-session";
import { fetchRecentAdminAudit } from "@/lib/data/admin-audit";
import { fetchHomeMatches } from "@/lib/data/matches";
import { countSquadStats } from "@/lib/data/players";

export const metadata = { title: "Admin Dashboard" };

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rw-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--rw-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { admin, superAdmin, adminLabel, supabase } = await getServerSession();
  if (!admin) {
    redirect("/login?next=/admin");
  }

  let squadStats = { total: 0, active: 0, inactive: 0 };
  let liveMatches: Awaited<ReturnType<typeof fetchHomeMatches>>["live"] = [];
  let recentMatches: Awaited<ReturnType<typeof fetchHomeMatches>>["recent"] = [];
  let auditEvents: Awaited<ReturnType<typeof fetchRecentAdminAudit>> = [];
  let loadError = false;

  try {
    const [squad, matches, audit] = await Promise.all([
      countSquadStats(),
      fetchHomeMatches(),
      fetchRecentAdminAudit(30, supabase),
    ]);
    squadStats = squad;
    liveMatches = matches.live;
    recentMatches = matches.recent;
    auditEvents = audit;
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-8 rw-animate-in">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <AdminRoleBadge label={adminLabel} superAdmin={superAdmin} />
          </div>
          <p className="mt-1 text-sm text-[var(--rw-muted)]">
            {superAdmin
              ? "Full administrative access including sensitive historical corrections."
              : "Squad, matches, live scoring support, and match deletion for Red Wings admins."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/squad" className="rw-focus-ring rw-btn-primary text-xs">
            Squad
          </Link>
          <Link href="/matches/setup" className="rw-focus-ring rw-btn-primary text-xs">
            New match setup
          </Link>
          <Link href="/matches" className="rw-focus-ring rw-btn-secondary text-xs">
            Matches
          </Link>
          <Link href="/settings" className="rw-focus-ring rw-btn-secondary text-xs">
            Settings
          </Link>
        </div>
      </header>

      {loadError ? (
        <EmptyState
          title="Could not load dashboard"
          description="Check Supabase connectivity and that migration 20250921000009_admin_audit is applied."
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Live matches"
              value={liveMatches.length}
              hint="Realtime scoring paths stay uncached"
            />
            <StatCard label="Active players" value={squadStats.active} />
            <StatCard label="Inactive players" value={squadStats.inactive} />
            <StatCard label="Squad total" value={squadStats.total} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rw-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Live now</h2>
                <Link
                  href="/live"
                  className="text-xs font-semibold text-[var(--rw-primary)]"
                >
                  Live hub
                </Link>
              </div>
              {liveMatches.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--rw-muted)]">
                  No live match right now.
                </p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {liveMatches.map((match) => (
                    <li key={match.id}>
                      <AdminMatchListItem match={match} showAdminActions />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rw-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Recent matches</h2>
                <Link
                  href="/matches"
                  className="text-xs font-semibold text-[var(--rw-primary)]"
                >
                  All matches
                </Link>
              </div>
              {recentMatches.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--rw-muted)]">
                  No matches created yet.
                </p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {recentMatches.slice(0, 3).map((match) => (
                    <li key={match.id}>
                      <AdminMatchListItem match={match} showAdminActions />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rw-card p-5 sm:p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold">Recent admin activity</h2>
              <p className="mt-1 text-sm text-[var(--rw-muted)]">
                Visible to Hashim, Abdul Rehman, and Mujahid — updates in realtime.
              </p>
              <div className="mt-4">
                <AdminActivityFeed initialEvents={auditEvents} />
              </div>
            </div>

            <div className="rw-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Admin areas</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  { href: "/squad", label: "Squad management" },
                  { href: "/matches", label: "Matches" },
                  { href: "/stats", label: "Stats" },
                  { href: "/records", label: "Records" },
                  { href: "/series", label: "Series (placeholder)" },
                  { href: "/tournaments", label: "Tournaments (placeholder)" },
                  { href: "/settings", label: "Account & settings" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rw-focus-ring font-medium text-[var(--rw-primary)] hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {superAdmin ? (
                <div className="mt-6 border-t border-[var(--rw-border)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
                    Super Admin
                  </p>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>
                      <span className="font-medium text-[var(--rw-text)]">
                        Stats &amp; records corrections
                      </span>
                      <p className="text-xs text-[var(--rw-muted)]">
                        Reserved for historical and statistical corrections when
                        those tools ship.
                      </p>
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
