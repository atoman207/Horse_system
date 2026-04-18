import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { loadBookings, loadDonations, loadPayments } from "@/lib/customer";
import { formatDate, formatYen, statusLabel } from "@/lib/format";

export default async function HistoryPage() {
  const session = await requireMember();
  if (!session.customerId) return <div className="card">会員情報が見つかりません。</div>;

  const [donations, bookings, payments] = await Promise.all([
    loadDonations(session.customerId),
    loadBookings(session.customerId, 30),
    loadPayments(session.customerId, 30),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">履歴</h1>
        <Link href="/mypage" className="text-brand underline">戻る</Link>
      </div>

      <section className="card">
        <h2 className="section-title">決済履歴</h2>
        {payments.length === 0 ? (
          <p className="text-ink-mute">まだ決済履歴はありません。</p>
        ) : (
          <table className="table">
            <thead><tr><th>日時</th><th>種別</th><th>金額</th><th>状態</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.occurred_at, true)}</td>
                  <td>{p.kind === "donation" ? "単発寄付" : p.kind === "subscription" ? "継続決済" : "一回払い"}</td>
                  <td>{formatYen(p.amount)}</td>
                  <td>{statusLabel(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">寄付履歴</h2>
        {donations.length === 0 ? (
          <p className="text-ink-mute">寄付履歴はまだありません。</p>
        ) : (
          <ul className="divide-y divide-surface-line">
            {donations.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="font-bold">{formatYen(d.amount)}</p>
                  <p className="text-xs text-ink-soft">{formatDate(d.donated_at, true)}</p>
                </div>
                <span className={d.status === "succeeded" ? "chip-ok" : "chip-warn"}>{statusLabel(d.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">見学履歴</h2>
        {bookings.length === 0 ? (
          <p className="text-ink-mute">見学履歴はまだありません。</p>
        ) : (
          <ul className="divide-y divide-surface-line">
            {bookings.map((b) => (
              <li key={b.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="font-bold">{b.event?.title}</p>
                  <p className="text-xs text-ink-soft">{formatDate(b.event?.starts_at, true)}</p>
                </div>
                <span className={b.status === "reserved" || b.status === "attended" ? "chip-ok" : "chip-mute"}>
                  {statusLabel(b.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
