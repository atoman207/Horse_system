import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncSupportCancel } from "@/lib/stripeSupport";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.customerId) {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("support_subscriptions")
    .select(
      "id, customer_id, units, monthly_amount, stripe_subscription_item_id, contract:contracts(id, stripe_subscription_id), horse:horses(name)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!existing || (existing as any).customer_id !== session.customerId) {
    return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
  }

  let sync;
  try {
    sync = await syncSupportCancel({
      stripe_subscription_item_id: (existing as any).stripe_subscription_item_id ?? null,
      stripe_subscription_id: (existing as any).contract?.stripe_subscription_id ?? null,
    });
  } catch (e: any) {
    sync = { synced: false, reason: e?.message ?? "stripe_error" };
  }

  const { error } = await admin
    .from("support_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      stripe_subscription_item_id: null,
    })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "support.cancel",
    target_table: "support_subscriptions",
    target_id: params.id,
    meta: {
      horse_name: (existing as any).horse?.name ?? null,
      units: Number((existing as any).units),
      monthly: Number((existing as any).monthly_amount),
      stripe: sync,
    },
  });
  return NextResponse.json({ ok: true, stripe: sync });
}
