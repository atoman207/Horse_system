import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  plan_id: z.string().uuid(),
  units: z.number().positive().max(100),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.customerId) {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { plan_id, units } = parsed.data;

  const supabase = createSupabaseServerClient();
  const { data: plan } = await supabase.from("membership_plans").select("*").eq("id", plan_id).maybeSingle();
  if (!plan || plan.code !== "SUPPORT") {
    return NextResponse.json({ error: "支援プランが正しくありません" }, { status: 400 });
  }
  const monthly = Math.round((plan.unit_amount ?? plan.monthly_amount) * Number(units));

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
    .update({ units, monthly_amount: monthly })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "support.update",
    target_table: "support_subscriptions",
    target_id: params.id,
    meta: { plan_id, units, monthly },
  });
  return NextResponse.json({ ok: true });
}
