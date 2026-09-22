import { getServerSession } from "@/lib/auth/server-session";
import { AppHeader } from "@/components/layout/app-header";
import { AppProviders } from "@/components/layout/app-providers";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user, admin } = await getServerSession();

  return (
    <AppProviders>
      <div className="rw-app-bg flex min-h-full flex-col text-[var(--rw-text)]">
        <AppHeader isAdmin={admin} isSignedIn={Boolean(user)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          {children}
        </main>
        <MobileTabBar />
      </div>
    </AppProviders>
  );
}
