import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  if (!body?.title || !body?.starts_at) {
    return NextResponse.json({ error: "タイトルと開始日時は必須です" }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { error, data } = await admin
    .from("events")
    .insert({
      type: body.type ?? "visit",
      title: body.title,
      description: body.description || null,
      starts_at: new Date(body.starts_at).toISOString(),
      ends_at: body.ends_at ? new Date(body.ends_at).toISOString() : null,
      capacity: body.capacity ?? 0,
      location: body.location || null,
      supporters_only: !!body.supporters_only,
      is_published: !!body.is_published,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
