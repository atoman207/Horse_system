import Link from "next/link";
import { requireMember } from "@/lib/auth";
import {
  loadActiveContract,
  loadActiveSupports,
  loadCustomer,
  loadCustomerSummary,
  loadPayments,
} from "@/lib/customer";
import { formatDate, formatUnits, formatYen } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  describePaymentDisplay,
  fromContractStatus,
} from "@/lib/paymentStatus";

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
  const [customer, summary, contract, supports, recentPayments] = await Promise.all([
    loadCustomer(customerId),
    loadCustomerSummary(customerId),
    loadActiveContract(customerId),
    loadActiveSupports(customerId),
    loadPayments(customerId, 3),
  ]);

  // --- 決済状態の4分類正規化 ---
  //   active な契約がない場合 + 支援もない場合は「停止」扱い。
  //   active な契約がない + 支援のみある場合は支援側の状態で判定。
  const baseStatusKey = contract
    ? fromContractStatus(contract.status)
    : supports.length > 0
      ? fromContractStatus(supports[0].status)
      : "stopped";

  // 直近決済成功からの「復帰」案内（失敗→成功の救済表示）
  const recentlyRecovered =
    baseStatusKey === "ok" &&
    recentPayments.some((p) => p.status === "failed") &&
    recentPayments[0]?.status === "succeeded";

  // 停止予定の判定: active なのに canceled_at が未来日付
  const now = Date.now();
  const scheduledStop = supports
    .filter((s) => s.status === "active" && s.canceled_at)
    .map((s) => ({
      id: s.id,
      name: s.horse?.name ?? "—",
      date: s.canceled_at as string,
    }))
    .filter((s) => new Date(s.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date));
  const displayKey =
    scheduledStop.length > 0 && baseStatusKey === "ok"
      ? "in_progress"
      : baseStatusKey;

  const display = describePaymentDisplay(displayKey, {
    recentlyRecovered,
    scheduledCancelAt: scheduledStop[0]?.date ?? null,
  });

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

  // --- 次回決済日 ---
  //   Stripe の current_period_end を最優先。
  //   継続課金がない場合は空欄扱いとして「現在、継続課金中のご契約はありません」を表示。
  const nextPaymentAt =
    contract?.current_period_end ?? summary?.next_payment_at ?? null;
  const hasActiveRecurring =
    Boolean(nextPaymentAt) &&
    (displayKey === "ok" || displayKey === "failed" || displayKey === "in_progress");

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
            <p className="label">お支払い状況</p>
            <p>
              <span className={display.chipClass}>{display.label}</span>
            </p>
            <p className="text-sm text-ink-soft mt-1">{display.description}</p>
          </div>
          <div>
            <p className="label">次回決済日</p>
            {hasActiveRecurring ? (
              <p className="text-lg">{formatDate(nextPaymentAt, false)}</p>
            ) : (
              <p className="text-sm text-ink-soft">現在、継続課金中のご契約はありません</p>
            )}
          </div>
          <div>
            <p className="label">月額支援合計</p>
            <p className="text-lg font-bold">{formatYen(monthlyGrandTotal)}</p>
          </div>
        </div>

        {display.bannerMessage && displayKey === "ok" && (
          <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">{display.bannerMessage}</p>
          </div>
        )}
        {displayKey === "failed" && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border-2 border-red-200">
            <p className="font-bold text-danger">お支払いが完了していません</p>
            <p className="text-sm mt-1">
              「お支払い情報を変更」ボタンからカード情報をご確認ください。
            </p>
          </div>
        )}
        {scheduledStop.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            <p className="font-bold text-amber-800">停止予定の支援があります</p>
            {scheduledStop.map((s) => (
              <p key={s.id} className="text-sm">
                {s.name}：{formatDate(s.date, false)} をもって終了予定です。
              </p>
            ))}
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
            {supports.map((s) => {
              const isScheduledStop =
                s.status === "active" &&
                s.canceled_at &&
                new Date(s.canceled_at).getTime() > now;
              return (
                <li key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      {s.horse?.name ?? "—"}
                      {isScheduledStop && (
                        <span className="chip-warn ml-2 text-xs">停止予定</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {formatUnits(s.units)} / {formatYen(s.monthly_amount)} / 月
                      {isScheduledStop && (
                        <>
                          <br />
                          {formatDate(s.canceled_at, false)} をもって終了予定
                        </>
                      )}
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
              );
            })}
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
