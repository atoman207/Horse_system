import Link from "next/link";
import { requireMember } from "@/lib/auth";
import {
  loadActiveContract,
  loadActiveSupports,
  loadCustomer,
  loadCustomerSummary,
} from "@/lib/customer";
import { formatDate, formatUnits, formatYen, statusLabel } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyPageTop() {
  const session = await requireMember();
  if (!session.customerId) {
    return (
      <div className="card">
        <p className="text-danger font-semibold mb-2">会員情報が見つかりません。</p>
        <p className="text-sm text-ink-soft">運営へお問い合わせください。</p>
      </div>
    );
  }

  const customerId = session.customerId;
  const [customer, summary, contract, supports] = await Promise.all([
    loadCustomer(customerId),
    loadCustomerSummary(customerId),
    loadActiveContract(customerId),
    loadActiveSupports(customerId),
  ]);

  const statusBadge =
    contract?.status === "past_due" ? "chip-error" :
    contract?.status === "canceled" ? "chip-mute" :
    contract?.status === "active" ? "chip-ok" : "chip-warn";

  const supabase = createSupabaseServerClient();
  const { count: bookingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "reserved");

  const supportMonthlyTotal = supports.reduce((sum, s) => sum + Number(s.monthly_amount ?? 0), 0);
  const basicMonthly = contract?.plan?.monthly_amount ?? 0;
  const monthlyGrandTotal = supportMonthlyTotal + basicMonthly;

  const planBadgeText =
    summary?.primary_plan_name ?? (supports.length > 0 ? "支援会員" : "未加入");

  return (
    <div className="space-y-5">
      {/* One-glance status banner */}
      <section className="card bg-gradient-to-br from-brand to-brand-dark text-white">
        <p className="text-sm opacity-90">こんにちは</p>
        <h1 className="text-2xl font-bold">{customer?.full_name ?? "会員"}様</h1>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs opacity-80">会員種別</p>
            <p className="text-base font-bold mt-1">{planBadgeText}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">支援中</p>
            <p className="text-base font-bold mt-1">{supports.length}頭</p>
          </div>
          <div>
            <p className="text-xs opacity-80">月額合計</p>
            <p className="text-base font-bold mt-1">{formatYen(monthlyGrandTotal)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">予約</p>
            <p className="text-base font-bold mt-1">{bookingCount ?? 0}件</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="label">現在の会員種別</p>
            <p className="text-lg font-bold">{planBadgeText}</p>
            <Link href="/mypage/plan" className="text-brand underline text-sm">
              会員種別を変更
            </Link>
          </div>
          <div>
            <p className="label">決済状態</p>
            <p>
              <span className={statusBadge}>{statusLabel(contract?.status ?? "active")}</span>
            </p>
          </div>
          <div>
            <p className="label">次回決済日</p>
            <p className="text-lg">{formatDate(summary?.next_payment_at, false)}</p>
          </div>
          <div>
            <p className="label">月額支援合計</p>
            <p className="text-lg font-bold">{formatYen(monthlyGrandTotal)}</p>
          </div>
        </div>
        {contract?.status === "past_due" && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border-2 border-red-200">
            <p className="font-bold text-danger">お支払いに失敗しています</p>
            <p className="text-sm mt-1">
              「お支払い情報を変更」ボタンからカードをご確認ください。
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">支援中の馬</h2>
          <Link className="text-brand underline text-sm" href="/mypage/supports/new">
            新しい支援を追加
          </Link>
        </div>
        {supports.length === 0 ? (
          <p className="text-ink-mute">現在、ご支援中の馬はありません。</p>
        ) : (
          <ul className="divide-y divide-surface-line">
            {supports.map((s) => (
              <li key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-bold text-lg">{s.horse?.name ?? "—"}</p>
                  <p className="text-sm text-ink-soft">
                    {formatUnits(s.units)} / {formatYen(s.monthly_amount)} / 月
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/mypage/supports/${s.id}`} className="btn-secondary py-2 px-4">
                    変更する
                  </Link>
                  <Link href={`/mypage/supports/${s.id}/stop`} className="btn-ghost py-2 px-4 text-danger">
                    停止する
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Link href="/mypage/supports/new" className="btn-primary w-full">
            新しい支援を追加する
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <Link href="/mypage/donate" className="card hover:shadow-lg transition">
          <p className="text-sm text-ink-mute">単発寄付</p>
          <p className="text-lg font-bold">寄付する</p>
          <p className="text-xs text-ink-soft mt-1">一回限りの応援を行います。</p>
        </Link>
        <Link href="/mypage/bookings" className="card hover:shadow-lg transition">
          <p className="text-sm text-ink-mute">見学会・個別見学</p>
          <p className="text-lg font-bold">予約する</p>
          <p className="text-xs text-ink-soft mt-1">日程を選んで申し込みできます。</p>
        </Link>
      </section>

      <section className="card">
        <h2 className="section-title">登録情報</h2>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between border-b border-surface-line py-2">
            <dt className="text-ink-soft">メール</dt>
            <dd>{customer?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-surface-line py-2">
            <dt className="text-ink-soft">電話番号</dt>
            <dd>{customer?.phone ?? "—"}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-ink-soft">住所</dt>
            <dd className="text-right">
              {customer?.postal_code && <span>〒{customer.postal_code}<br /></span>}
              {customer?.address1}{customer?.address2 && <><br />{customer.address2}</>}
              {!customer?.address1 && "—"}
            </dd>
          </div>
        </dl>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <Link href="/mypage/profile" className="btn-secondary text-center">
            情報を変更
          </Link>
          <form action="/api/stripe/portal" method="post" className="contents">
            <button type="submit" className="btn-secondary w-full">
              お支払い情報を変更
            </button>
          </form>
          <Link href="/mypage/history" className="btn-ghost text-center">
            履歴を見る
          </Link>
        </div>
      </section>
    </div>
  );
}
