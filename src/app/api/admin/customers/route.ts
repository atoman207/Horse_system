import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().max(40).optional(),
  status: z.enum(["active", "suspended", "withdrawn"]).default("active"),
});

export async function POST(req: Request) {
  const session = await requireAdmin();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("customers")
    .insert({
      full_name: parsed.data.full_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      status: parsed.data.status,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("audit_logs").insert({
    actor_id: session.userId,
    action: "customer.create",
    target_table: "customers",
    target_id: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
