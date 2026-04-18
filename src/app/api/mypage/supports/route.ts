import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncSupportCreate } from "@/lib/stripeSupport";

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

  const [{ data: plan }, { data: horse }, { data: customer }] = await Promise.all([
    supabase.from("membership_plans").select("*").eq("id", plan_id).maybeSingle(),
    supabase.from("horses").select("*").eq("id", horse_id).maybeSingle(),
    admin
      .from("customers")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", session.customerId)
      .maybeSingle(),
  ]);
  if (!plan || plan.code !== "SUPPORT") {
    return NextResponse.json({ error: "支援プランが正しくありません" }, { status: 400 });
  }
  if (!horse || !horse.is_supportable) {
    return NextResponse.json({ error: "この馬は現在支援を受け付けていません" }, { status: 400 });
  }
  if (!customer) {
    return NextResponse.json({ error: "会員情報が見つかりません" }, { status: 404 });
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

  let contractId: string | null = (activeContract as any)?.id ?? null;
  let contractRow: {
    id: string;
    stripe_subscription_id: string | null;
    status: string;
  } | null = activeContract
    ? {
        id: (activeContract as any).id,
        stripe_subscription_id: (activeContract as any).stripe_subscription_id ?? null,
        status: (activeContract as any).status,
      }
    : null;

  if (!contractId) {
    const { data: created, error: cErr } = await admin
      .from("contracts")
      .insert({
        customer_id: session.customerId,
        plan_id: plan.id,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      })
      .select("id, stripe_subscription_id, status")
      .single();
    if (cErr || !created) {
      return NextResponse.json({ error: "契約の作成に失敗しました" }, { status: 500 });
    }
    contractId = created.id;
    contractRow = {
      id: created.id,
      stripe_subscription_id: (created as any).stripe_subscription_id ?? null,
      status: (created as any).status,
    };
  }

  const perUnit = plan.unit_amount ?? plan.monthly_amount;

  // --- Consolidation: if this customer already has an ACTIVE support row
  // for the same horse, update units/monthly on that row instead of
  // inserting a duplicate. This guarantees 1 active row per (customer, horse).
  const { data: existingRow } = await admin
    .from("support_subscriptions")
    .select("id, units, monthly_amount, stripe_subscription_item_id, horse:horses(name)")
    .eq("customer_id", session.customerId)
    .eq("horse_id", horse.id)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (existingRow) {
    const newUnits = Number((existingRow as any).units) + Number(units);
    const newMonthly = Math.round(perUnit * newUnits);
    const { error: uErr } = await admin
      .from("support_subscriptions")
      .update({ units: newUnits, monthly_amount: newMonthly, status: "active" })
      .eq("id", (existingRow as any).id);
    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    let sync;
    try {
      sync = await syncSupportCreate({
        customer: customer as any,
        contract: contractRow!,
        support: {
          id: (existingRow as any).id,
          horse_id: horse.id,
          horse_name: horse.name,
          monthly_amount: newMonthly,
        },
        existing_item_id: (existingRow as any).stripe_subscription_item_id ?? null,
      });
    } catch (e: any) {
      sync = { synced: false, reason: e?.message ?? "stripe_error" };
    }

    await admin.from("audit_logs").insert({
      actor_id: session.userId,
      action: "support.merge",
      target_table: "support_subscriptions",
      target_id: (existingRow as any).id,
      meta: {
        horse_id,
        horse_name: horse.name,
        plan_id,
        added_units: units,
        new_units: newUnits,
        monthly: newMonthly,
        stripe: sync,
      },
    });

    return NextResponse.json({
      ok: true,
      contract_id: contractId,
      support_id: (existingRow as any).id,
      consolidated: true,
      stripe: sync,
    });
  }

  const monthly = Math.round(perUnit * Number(units));
  const { data: inserted, error: sErr } = await admin
    .from("support_subscriptions")
    .insert({
      contract_id: contractId,
      customer_id: session.customerId,
      horse_id: horse.id,
      units,
      monthly_amount: monthly,
      status: "active",
    })
    .select("id")
    .single();
  if (sErr || !inserted) return NextResponse.json({ error: sErr?.message ?? "failed" }, { status: 500 });

  let sync;
  try {
    sync = await syncSupportCreate({
      customer: customer as any,
      contract: contractRow!,
      support: {
        id: inserted.id,
        horse_id: horse.id,
        horse_name: horse.name,
        monthly_amount: monthly,
      },
      existing_item_id: null,
    });
  } catch (e: any) {
    sync = { synced: false, reason: e?.message ?? "stripe_error" };
  }

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "support.create",
    target_table: "support_subscriptions",
    target_id: inserted.id,
    meta: { horse_id, horse_name: horse.name, plan_id, units, monthly, stripe: sync },
  });

  return NextResponse.json({
    ok: true,
    contract_id: contractId,
    support_id: inserted.id,
    stripe: sync,
  });
}
