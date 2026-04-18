import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

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

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    role: (profile?.role as SessionInfo["role"]) ?? "member",
    customerId: (profile?.customer_id as string | null) ?? null,
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
