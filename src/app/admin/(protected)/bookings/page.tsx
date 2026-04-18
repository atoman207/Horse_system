import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, statusLabel } from "@/lib/format";

export default async function BookingsPage({ searchParams }: { searchParams: { event?: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("id,title,starts_at,capacity,type,supporters_only")
    .order("starts_at", { ascending: false })
    .limit(50);

  const selectedId = searchParams.event || (events?.[0] as any)?.id || "";
  const selectedEvent = (events ?? []).find((e: any) => e.id === selectedId);
  const { data: bookings } = selectedId
    ? await supabase
        .from("bookings")
        .select("*, customer:customers(id,full_name,email)")
        .eq("event_id", selectedId)
        .order("booked_at")
    : ({ data: [] } as any);

  const reservedCount = (bookings ?? []).filter((b: any) => b.status !== "canceled").reduce((a: number, b: any) => a + Number(b.party_size ?? 1), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">予約管理</h1>
      <form method="get" className="card flex items-center gap-2">
        <label className="label m-0 flex-shrink-0">イベント</label>
        <select name="event" defaultValue={selectedId} className="input flex-1">
          {(events ?? []).map((e: any) => (
            <option key={e.id} value={e.id}>
              [{e.type === "private_visit" ? "個別" : "見学"}] {e.title}（{formatDate(e.starts_at, true)}）
            </option>
          ))}
        </select>
        <button className="btn-primary !py-2 !px-4">表示</button>
      </form>

      {selectedEvent && (
        <div className="card">
          <div className="flex flex-wrap gap-3 text-sm">
            <p><span className="text-ink-soft">定員</span> <span className="font-bold">{(selectedEvent as any).capacity}</span></p>
            <p><span className="text-ink-soft">予約数</span> <span className="font-bold">{reservedCount}</span></p>
            <p><span className="text-ink-soft">残席</span> <span className="font-bold">{Math.max(0, (selectedEvent as any).capacity - reservedCount)}</span></p>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-auto">
        <table className="table">
          <thead><tr><th>氏名</th><th>メール</th><th>人数</th><th>予約日時</th><th>状態</th><th></th></tr></thead>
          <tbody>
            {(bookings ?? []).map((b: any) => (
              <tr key={b.id}>
                <td>
                  <Link href={`/admin/customers/${b.customer?.id}`} className="text-brand underline">{b.customer?.full_name}</Link>
                </td>
                <td>{b.customer?.email ?? "—"}</td>
                <td>{b.party_size}</td>
                <td>{formatDate(b.booked_at, true)}</td>
                <td>{statusLabel(b.status)}</td>
                <td></td>
              </tr>
            ))}
            {(bookings ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center text-ink-mute py-6">予約はありません。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
