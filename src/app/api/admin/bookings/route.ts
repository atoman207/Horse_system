import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  customer_id: z.string().uuid(),
  event_id: z.string().uuid(),
  party_size: z.coerce.number().int().positive().max(20).default(1),
  note: z.string().max(500).optional().nullable(),
  status: z
    .enum(["reserved", "canceled", "attended", "no_show"])
    .default("reserved"),
});

export async function POST(req: Request) {
  const session = await requireAdmin();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
      { status: 400 },
    );
  }
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("bookings")
    .select("id")
    .eq("customer_id", parsed.data.customer_id)
    .eq("event_id", parsed.data.event_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "既に予約が登録されています" }, { status: 400 });
  }

  const { data: inserted, error } = await admin
    .from("bookings")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "登録に失敗しました" }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "booking.create",
    target_table: "bookings",
    target_id: inserted.id,
    meta: parsed.data,
  });

  return NextResponse.json({ ok: true, id: inserted.id });
}
