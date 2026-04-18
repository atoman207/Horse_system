import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.customerId) {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("support_subscriptions")
    .select("id, customer_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!existing || existing.customer_id !== session.customerId) {
    return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
  }
  const { error } = await admin
    .from("support_subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "support.cancel",
    target_table: "support_subscriptions",
    target_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
