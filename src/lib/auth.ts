import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { createSupabaseAdminClient } from "./supabase/admin";

export type SessionInfo = {
  userId: string;
  email: string | null;
  role: "member" | "admin" | "staff";
  customerId: string | null;
};

export async function getSession(): Promise<SessionInfo | null> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, customer_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  let customerId = (profile?.customer_id as string | null) ?? null;
  const role = (profile?.role as SessionInfo["role"]) ?? "member";

  if (!customerId) {
    const admin = createSupabaseAdminClient();
    const { data: cust } = await admin
      .from("customers")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (cust?.id) {
      customerId = cust.id as string;
      await admin.from("profiles").upsert({
        id: userData.user.id,
        role,
        customer_id: customerId,
      });
    }
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    role,
    customerId,
  };
}

export async function requireMember(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin" && session.role !== "staff") {
    redirect("/admin/login?error=forbidden");
  }
  return session;
}
