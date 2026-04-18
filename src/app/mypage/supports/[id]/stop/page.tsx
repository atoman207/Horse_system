import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupportSubscription } from "@/types/db";
import StopSupportButton from "./StopSupportButton";

export default async function StopSupportPage({ params }: { params: { id: string } }) {
  const session = await requireMember();
  if (!session.customerId) return notFound();

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("support_subscriptions")
    .select("*, horse:horses(*)")
    .eq("id", params.id)
    .eq("customer_id", session.customerId)
    .maybeSingle();

  const s = data as SupportSubscription | null;
  if (!s) return notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">支援の停止</h1>
      <div className="card">
        <p className="text-ink-soft">以下の支援を停止しようとしています。</p>
        <p className="text-lg font-bold mt-2">{s.horse?.name}</p>
        <p className="text-sm">{s.units} 口 / {s.monthly_amount.toLocaleString()} 円 / 月</p>
      </div>
      <div className="card border-2 border-warn">
        <p className="font-bold text-warn">ご確認ください</p>
        <ul className="mt-2 text-sm list-disc list-inside space-y-1">
          <li>停止すると、次回以降の継続課金は行われません。</li>
          <li>停止はいつでも再開可能です（新しい支援として登録できます）。</li>
          <li>今期分として既にお支払いいただいた金額は返金されません。</li>
        </ul>
      </div>
      <StopSupportButton id={s.id} />
      <Link href="/mypage" className="btn-ghost w-full text-center">
        やっぱり停止しない（戻る）
      </Link>
    </div>
  );
}
