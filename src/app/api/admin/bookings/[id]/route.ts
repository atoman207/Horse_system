import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  party_size: z.coerce.number().int().positive().max(20).optional(),
  note: z.string().max(500).optional().nullable(),
  status: z.enum(["reserved", "canceled", "attended", "no_show"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();

  const patch: Record<string, any> = { ...parsed.data };
  if (parsed.data.status === "canceled") patch.canceled_at = new Date().toISOString();

  const { error } = await admin.from("bookings").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "booking.update",
    target_table: "bookings",
    target_id: params.id,
    meta: patch,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "1";

  if (hard) {
    const { error } = await admin.from("bookings").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("audit_logs").insert({
      actor_id: session.userId,
      action: "booking.delete",
      target_table: "bookings",
      target_id: params.id,
    });
    return NextResponse.json({ ok: true, hard: true });
  }

  const { error } = await admin
    .from("bookings")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "booking.cancel",
    target_table: "bookings",
    target_id: params.id,
  });

  return NextResponse.json({ ok: true });
}
