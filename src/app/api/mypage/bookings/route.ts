import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ event_id: z.string().uuid() });

async function countSeats(admin: ReturnType<typeof createSupabaseAdminClient>, eventId: string) {
  const { data } = await admin
    .from("bookings")
    .select("party_size, status")
    .eq("event_id", eventId);
  return (data ?? []).reduce((acc, b: any) => (b.status === "canceled" ? acc : acc + Number(b.party_size ?? 1)), 0);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.customerId) {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: ev } = await admin.from("events").select("*").eq("id", parsed.data.event_id).maybeSingle();
  if (!ev || !(ev as any).is_published) {
    return NextResponse.json({ error: "対象のイベントが見つかりません" }, { status: 404 });
  }

  if ((ev as any).supporters_only) {
    const { count } = await admin
      .from("support_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", session.customerId)
      .eq("status", "active");
    if (!count) return NextResponse.json({ error: "このイベントは支援者限定です" }, { status: 403 });
  }

  const used = await countSeats(admin, (ev as any).id);
  if (used >= (ev as any).capacity) {
    return NextResponse.json({ error: "満席のため予約できません" }, { status: 409 });
  }

  const { data: existing } = await admin
    .from("bookings")
    .select("id, status")
    .eq("customer_id", session.customerId)
    .eq("event_id", (ev as any).id)
    .maybeSingle();

  if (existing && (existing as any).status !== "canceled") {
    return NextResponse.json({ error: "すでにこのイベントを予約しています" }, { status: 409 });
  }
  if (existing) {
    const { error } = await admin
      .from("bookings")
      .update({ status: "reserved", canceled_at: null, booked_at: new Date().toISOString() })
      .eq("id", (existing as any).id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("bookings").insert({
    customer_id: session.customerId,
    event_id: (ev as any).id,
    party_size: 1,
    status: "reserved",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.customerId) {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("customer_id", session.customerId)
    .eq("event_id", parsed.data.event_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
