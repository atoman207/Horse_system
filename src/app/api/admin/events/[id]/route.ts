import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const admin = createSupabaseAdminClient();
  const payload: any = {};
  for (const key of ["type","title","description","capacity","location","supporters_only","is_published"]) {
    if (key in body) payload[key] = body[key];
  }
  if (body.starts_at) payload.starts_at = new Date(body.starts_at).toISOString();
  if (body.ends_at) payload.ends_at = new Date(body.ends_at).toISOString();
  const { error } = await admin.from("events").update(payload).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("events").update({ is_published: false }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
