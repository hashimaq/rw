import Link from "next/link";
import { InstallAppSettings } from "@/components/pwa/install-app-settings";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getServerSession } from "@/lib/auth/server-session";

export const metadata = { title: "Settings" };

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rw-card p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-[var(--rw-muted)]">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { user, admin, adminLabel, superAdmin } = await getServerSession();

  return (
    <div className="space-y-6 rw-animate-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          Appearance and account preferences.
        </p>
      </header>

      <div className="grid gap-4">
        <SettingsCard
          title="Install app"
          description="Add Red Wings Cricket to your home screen for quick access and offline scoring."
        >
          <InstallAppSettings />
        </SettingsCard>

        <SettingsCard
          title="Appearance"
          description="Light and dark themes persist on this device."
        >
          <ThemeToggle />
        </SettingsCard>

        <SettingsCard title="Account">
          {user ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-[var(--rw-muted)]">Signed in as </span>
                <span className="font-medium">{user.email}</span>
              </p>
              <p>
                <span className="text-[var(--rw-muted)]">Role </span>
                <span className="inline-flex rounded-full border border-[var(--rw-border)] px-2 py-0.5 text-xs font-semibold uppercase">
                  {admin ? adminLabel : "Member"}
                </span>
              </p>
              {admin ? (
                <p className="pt-1">
                  <Link
                    href="/admin"
                    className="font-semibold text-[var(--rw-primary)] hover:underline"
                  >
                    Open admin dashboard
                  </Link>
                </p>
              ) : null}
              <form action="/auth/signout" method="post">
                <button type="submit" className="rw-focus-ring rw-btn-secondary mt-2">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-[var(--rw-muted)]">
              <Link
                href="/login?next=/admin"
                className="font-semibold text-[var(--rw-primary)]"
              >
                Admin sign in
              </Link>{" "}
              for squad and match management.
            </p>
          )}
        </SettingsCard>
      </div>
    </div>
  );
}
