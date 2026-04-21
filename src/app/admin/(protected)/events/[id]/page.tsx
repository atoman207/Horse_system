import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EventForm from "../EventForm";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("events").select("*").eq("id", params.id).maybeSingle();
  if (!data) return notFound();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, customer:customers(full_name,email)")
    .eq("event_id", params.id)
    .order("booked_at");
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">イベント編集</h1>
        <Link className="text-brand underline" href="/admin/events">← 戻る</Link>
      </div>
      <EventForm initial={data} id={params.id} />
      <section className="card">
        <h2 className="section-title">参加者一覧（{(bookings ?? []).length}件）</h2>
        <table className="table">
          <thead><tr><th className="w-12 text-right">No.</th><th>氏名</th><th>メール</th><th>人数</th><th>状態</th></tr></thead>
          <tbody>
            {(bookings ?? []).map((b: any, i: number) => (
              <tr key={b.id}>
                <td className="text-right text-ink-mute tabular-nums">{i + 1}</td>
                <td>{b.customer?.full_name ?? "—"}</td>
                <td>{b.customer?.email ?? "—"}</td>
                <td>{b.party_size}</td>
                <td>{b.status}</td>
              </tr>
            ))}
            {(bookings ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center text-ink-mute py-3">まだ予約はありません。</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
