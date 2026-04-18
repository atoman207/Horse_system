import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  horse_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  units: z.number().positive().max(100),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.customerId) {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { horse_id, plan_id, units } = parsed.data;

  const supabase = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const [{ data: plan }, { data: horse }] = await Promise.all([
    supabase.from("membership_plans").select("*").eq("id", plan_id).maybeSingle(),
    supabase.from("horses").select("*").eq("id", horse_id).maybeSingle(),
  ]);
  if (!plan || plan.code !== "SUPPORT") {
    return NextResponse.json({ error: "支援プランが正しくありません" }, { status: 400 });
  }
  if (!horse || !horse.is_supportable) {
    return NextResponse.json({ error: "この馬は現在支援を受け付けていません" }, { status: 400 });
  }

  // 併用制約チェック
  const { data: activeContract } = await supabase
    .from("contracts")
    .select("*, plan:membership_plans(code)")
    .eq("customer_id", session.customerId)
    .in("status", ["active", "past_due"])
    .maybeSingle();
  const basicCode = (activeContract as any)?.plan?.code as string | undefined;
  if (basicCode && ["A", "B", "C"].includes(basicCode)) {
    return NextResponse.json(
      { error: "A/B/C会員と支援会員は併用できません。現在の会員種別を変更してください。" },
      { status: 400 },
    );
  }

  let contractId: string | null = activeContract?.id ?? null;
  if (!contractId) {
    const { data: created, error: cErr } = await admin
      .from("contracts")
      .insert({
        customer_id: session.customerId,
        plan_id: plan.id,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (cErr || !created) {
      return NextResponse.json({ error: "契約の作成に失敗しました" }, { status: 500 });
    }
    contractId = created.id;
  }

  const monthly = Math.round((plan.unit_amount ?? plan.monthly_amount) * Number(units));
  const { error: sErr } = await admin.from("support_subscriptions").insert({
    contract_id: contractId,
    customer_id: session.customerId,
    horse_id: horse.id,
    units,
    monthly_amount: monthly,
    status: "active",
  });
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "support.create",
    target_table: "support_subscriptions",
    target_id: null,
    meta: { horse_id, plan_id, units, monthly },
  });

  return NextResponse.json({ ok: true, contract_id: contractId });
}
