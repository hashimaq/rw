import { cache } from "react";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

/** Per-request deduped auth + admin flags (shell + pages). */
export const getServerSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authz = user
    ? await getAdminAuthorization(supabase)
    : {
        role: null,
        admin: false,
        superAdmin: false,
        label: "Member" as const,
      };
  return {
    supabase,
    user,
    admin: authz.admin,
    superAdmin: authz.superAdmin,
    adminRole: authz.role,
    adminLabel: authz.label,
  };
});
