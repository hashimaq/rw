import { AppHeader } from "@/components/layout/app-header";
import { getServerSession } from "@/lib/auth/server-session";

/** Session + admin flags for header — isolated so main nav pages can stream without waiting. */
export async function AppHeaderShell() {
  const { user, admin } = await getServerSession();
  return <AppHeader isAdmin={admin} isSignedIn={Boolean(user)} />;
}
