import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatYen } from "@/lib/format";

export default async function AdminDashboardPage() {
  const supabase = createSupabaseServerClient();

  const [
    { count: customersTotal },
    { count: pastDueCount },
    { count: activeContracts },
    { count: bookingsToday },
    { data: recentPayments },
    { data: recentSupports },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "past_due"),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("booked_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from("payments")
      .select("*, customer:customers(full_name,email)")
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase
      .from("support_subscriptions")
      .select("*, horse:horses(name), customer:customers(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("*")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(5),
  ]);

  const cards: Array<{ label: string; value: number; warn?: boolean; href?: string }> = [
    { label: "会員数", value: customersTotal ?? 0, href: "/admin/customers" },
    { label: "継続契約", value: activeContracts ?? 0, href: "/admin/contracts" },
    {
      label: "決済失敗",
      value: pastDueCount ?? 0,
      warn: (pastDueCount ?? 0) > 0,
      href: "/admin/payments?status=failed",
    },
    { label: "本日の予約", value: bookingsToday ?? 0, href: "/admin/bookings" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="text-xs text-ink-soft">{c.label}</p>
              <p className={`text-2xl font-bold ${c.warn ? "text-danger" : ""}`}>{c.value}</p>
              {c.warn && (
                <p className="text-[11px] text-danger mt-1">→ 対応が必要です</p>
              )}
            </>
          );
          return c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className={`card hover:shadow-lg transition ${c.warn ? "ring-2 ring-danger/40" : ""}`}
            >
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="card">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/admin/customers" className="card hover:shadow-lg transition text-center py-4">
          <p className="font-bold">顧客一覧</p>
          <p className="text-xs text-ink-soft mt-1">検索・編集・履歴</p>
        </Link>
        <Link href="/admin/supports" className="card hover:shadow-lg transition text-center py-4">
          <p className="font-bold">支援管理</p>
          <p className="text-xs text-ink-soft mt-1">馬ごと・口数・状態</p>
        </Link>
        <Link href="/admin/contracts" className="card hover:shadow-lg transition text-center py-4">
          <p className="font-bold">契約一覧</p>
          <p className="text-xs text-ink-soft mt-1">A/B/C・停止処理</p>
        </Link>
        <Link href="/admin/payments" className="card hover:shadow-lg transition text-center py-4">
          <p className="font-bold">決済履歴</p>
          <p className="text-xs text-ink-soft mt-1">成功・失敗・返金</p>
        </Link>
      </div>

      <section className="card">
        <h2 className="section-title">直近の決済</h2>
        <table className="table">
          <thead><tr><th className="w-12 text-right">No.</th><th>日時</th><th>顧客</th><th>種別</th><th>金額</th><th>状態</th></tr></thead>
          <tbody>
            {(recentPayments ?? []).map((p: any, i: number) => (
              <tr key={p.id}>
                <td className="text-right text-ink-mute tabular-nums">{i + 1}</td>
                <td>{formatDate(p.occurred_at, true)}</td>
                <td>{p.customer?.full_name ?? "—"}</td>
                <td>{p.kind}</td>
                <td>{formatYen(p.amount)}</td>
                <td>{p.status}</td>
              </tr>
            ))}
            {(recentPayments ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center text-ink-mute">決済履歴はまだありません。</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title">最近の支援申込</h2>
          <ul className="divide-y divide-surface-line">
            {(recentSupports ?? []).map((s: any) => (
              <li key={s.id} className="py-2 text-sm flex justify-between">
                <span>{s.customer?.full_name} → {s.horse?.name}</span>
                <span className="text-ink-mute">{formatDate(s.created_at)}</span>
              </li>
            ))}
            {(recentSupports ?? []).length === 0 && <li className="text-ink-mute py-2 text-sm">データなし</li>}
          </ul>
        </div>
        <div className="card">
          <h2 className="section-title">今後のイベント</h2>
          <ul className="divide-y divide-surface-line">
            {(upcomingEvents ?? []).map((e: any) => (
              <li key={e.id} className="py-2 text-sm flex justify-between">
                <Link href={`/admin/events/${e.id}`} className="text-brand underline">{e.title}</Link>
                <span className="text-ink-mute">{formatDate(e.starts_at, true)}</span>
              </li>
            ))}
            {(upcomingEvents ?? []).length === 0 && <li className="text-ink-mute py-2 text-sm">予定はありません。</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
