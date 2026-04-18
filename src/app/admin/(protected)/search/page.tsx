import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatYen, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: { q?: string; scope?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const scope = (searchParams.scope ?? "all").trim();
  const supabase = createSupabaseServerClient();

  let customers: AnyRow[] = [];
  let supports: AnyRow[] = [];
  let donations: AnyRow[] = [];
  let bookings: AnyRow[] = [];
  let payments: AnyRow[] = [];
  let horses: AnyRow[] = [];

  if (q.length > 0) {
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const wantsCustomers = scope === "all" || scope === "customers";
    const wantsSupports = scope === "all" || scope === "supports";
    const wantsDonations = scope === "all" || scope === "donations";
    const wantsBookings = scope === "all" || scope === "bookings";
    const wantsPayments = scope === "all" || scope === "payments";
    const wantsHorses = scope === "all" || scope === "horses";

    const tasks: Array<() => Promise<void>> = [];

    if (wantsCustomers) {
      tasks.push(async () => {
        const { data } = await supabase
          .from("customers")
          .select("id, full_name, full_name_kana, email, phone, status, avatar_url, joined_at")
          .or(
            [
              `full_name.ilike.${like}`,
              `full_name_kana.ilike.${like}`,
              `email.ilike.${like}`,
              `phone.ilike.${like}`,
              `postal_code.ilike.${like}`,
              `address1.ilike.${like}`,
              `address2.ilike.${like}`,
            ].join(","),
          )
          .order("full_name")
          .limit(50);
        customers = (data as AnyRow[]) ?? [];
      });
    }

    if (wantsHorses) {
      tasks.push(async () => {
        const { data } = await supabase
          .from("horses")
          .select("id, name, name_kana, sex, birth_year, profile")
          .or([`name.ilike.${like}`, `name_kana.ilike.${like}`, `profile.ilike.${like}`].join(","))
          .order("sort_order")
          .limit(30);
        horses = (data as AnyRow[]) ?? [];
      });
    }

    if (wantsSupports) {
      tasks.push(async () => {
        const { data } = await supabase
          .from("support_subscriptions")
          .select(
            "id, units, monthly_amount, status, started_at, canceled_at, customer:customers(id, full_name, email), horse:horses(id, name)",
          )
          .order("started_at", { ascending: false })
          .limit(500);
        const items = (data as AnyRow[]) ?? [];
        const needle = q.toLowerCase();
        supports = items.filter(
          (x) =>
            (x.horse?.name ?? "").toLowerCase().includes(needle) ||
            (x.customer?.full_name ?? "").toLowerCase().includes(needle) ||
            (x.customer?.email ?? "").toLowerCase().includes(needle),
        );
      });
    }

    if (wantsDonations) {
      tasks.push(async () => {
        const { data } = await supabase
          .from("donations")
          .select(
            "id, amount, message, status, donated_at, donor_name, donor_email, customer:customers(id, full_name, email)",
          )
          .or(
            [
              `donor_name.ilike.${like}`,
              `donor_email.ilike.${like}`,
              `message.ilike.${like}`,
            ].join(","),
          )
          .order("donated_at", { ascending: false })
          .limit(50);
        donations = (data as AnyRow[]) ?? [];
      });
    }

    if (wantsBookings) {
      tasks.push(async () => {
        const { data } = await supabase
          .from("bookings")
          .select(
            "id, party_size, note, status, booked_at, customer:customers(id, full_name, email), event:events(id, title, type, starts_at)",
          )
          .ilike("note", like)
          .order("booked_at", { ascending: false })
          .limit(50);
        bookings = (data as AnyRow[]) ?? [];

        const { data: matchedEvents } = await supabase
          .from("events")
          .select("id, title")
          .ilike("title", like)
          .limit(20);
        const eventIds = (matchedEvents as AnyRow[] | null)?.map((e) => e.id) ?? [];
        if (eventIds.length > 0) {
          const { data: bookingsByEvent } = await supabase
            .from("bookings")
            .select(
              "id, party_size, note, status, booked_at, customer:customers(id, full_name, email), event:events(id, title, type, starts_at)",
            )
            .in("event_id", eventIds)
            .order("booked_at", { ascending: false })
            .limit(50);
          const extra = (bookingsByEvent as AnyRow[]) ?? [];
          const seen = new Set(bookings.map((b) => b.id));
          for (const e of extra) if (!seen.has(e.id)) bookings.push(e);
        }
      });
    }

    if (wantsPayments) {
      tasks.push(async () => {
        const { data } = await supabase
          .from("payments")
          .select(
            "id, amount, kind, status, occurred_at, failure_reason, stripe_payment_intent_id, stripe_invoice_id, customer:customers(id, full_name, email)",
          )
          .or(
            [
              `stripe_payment_intent_id.ilike.${like}`,
              `stripe_invoice_id.ilike.${like}`,
              `failure_reason.ilike.${like}`,
            ].join(","),
          )
          .order("occurred_at", { ascending: false })
          .limit(50);
        payments = (data as AnyRow[]) ?? [];
      });
    }

    await Promise.all(tasks.map((fn) => fn()));
  }

  const totalHits =
    customers.length + supports.length + donations.length + bookings.length + payments.length + horses.length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">横断検索</h1>

      <form method="get" className="card flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="氏名 / メール / 電話 / 馬名 / メモ / Stripe ID など"
          className="input flex-1 min-w-[260px]"
          autoFocus
        />
        <select name="scope" defaultValue={scope} className="input w-auto">
          <option value="all">すべて</option>
          <option value="customers">顧客</option>
          <option value="horses">馬</option>
          <option value="supports">支援</option>
          <option value="donations">寄付</option>
          <option value="bookings">予約</option>
          <option value="payments">決済</option>
        </select>
        <button className="btn-primary !py-2 !px-4">検索</button>
      </form>

      {q.length === 0 ? (
        <p className="card text-ink-mute text-sm">
          キーワードを入力して検索してください。顧客・馬・支援・寄付・予約・決済を横断的に探せます。
        </p>
      ) : (
        <p className="text-sm text-ink-soft">
          「{q}」の検索結果：合計 <span className="font-bold">{totalHits}</span> 件
        </p>
      )}

      {customers.length > 0 && (
        <section className="card">
          <h2 className="section-title">顧客 <span className="text-ink-mute text-sm">({customers.length})</span></h2>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>氏名</th>
                <th>メール</th>
                <th>電話</th>
                <th>状態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface-soft">
                  <td>
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-surface-line"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-surface-soft border border-surface-line" />
                    )}
                  </td>
                  <td className="font-semibold">{c.full_name}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>{statusLabel(c.status)}</td>
                  <td className="text-right">
                    <Link href={`/admin/customers/${c.id}`} className="text-brand underline">
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {horses.length > 0 && (
        <section className="card">
          <h2 className="section-title">馬 <span className="text-ink-mute text-sm">({horses.length})</span></h2>
          <table className="table">
            <thead>
              <tr>
                <th>名前</th>
                <th>カナ</th>
                <th>性別</th>
                <th>生年</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {horses.map((h) => (
                <tr key={h.id}>
                  <td className="font-semibold">{h.name}</td>
                  <td>{h.name_kana ?? "—"}</td>
                  <td>{h.sex ?? "—"}</td>
                  <td>{h.birth_year ?? "—"}</td>
                  <td className="text-right">
                    <Link href={`/admin/horses/${h.id}`} className="text-brand underline">
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {supports.length > 0 && (
        <section className="card">
          <h2 className="section-title">支援 <span className="text-ink-mute text-sm">({supports.length})</span></h2>
          <table className="table">
            <thead>
              <tr>
                <th>顧客</th>
                <th>馬</th>
                <th>口数</th>
                <th>月額</th>
                <th>状態</th>
                <th>開始</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {supports.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.customer?.full_name ?? "—"}</td>
                  <td>{s.horse?.name ?? "—"}</td>
                  <td>{s.units}口</td>
                  <td>{formatYen(s.monthly_amount)}</td>
                  <td>{statusLabel(s.status)}</td>
                  <td>{formatDate(s.started_at)}</td>
                  <td className="text-right">
                    {s.customer?.id && (
                      <Link
                        href={`/admin/customers/${s.customer.id}`}
                        className="text-brand underline"
                      >
                        顧客
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {donations.length > 0 && (
        <section className="card">
          <h2 className="section-title">寄付 <span className="text-ink-mute text-sm">({donations.length})</span></h2>
          <table className="table">
            <thead>
              <tr>
                <th>日時</th>
                <th>顧客/寄付者</th>
                <th>金額</th>
                <th>状態</th>
                <th>メッセージ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id}>
                  <td>{formatDate(d.donated_at, true)}</td>
                  <td>{d.customer?.full_name ?? d.donor_name ?? "—"}</td>
                  <td>{formatYen(d.amount)}</td>
                  <td>{statusLabel(d.status)}</td>
                  <td className="text-xs">{d.message ?? "—"}</td>
                  <td className="text-right">
                    {d.customer?.id && (
                      <Link
                        href={`/admin/customers/${d.customer.id}`}
                        className="text-brand underline"
                      >
                        顧客
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {bookings.length > 0 && (
        <section className="card">
          <h2 className="section-title">予約 <span className="text-ink-mute text-sm">({bookings.length})</span></h2>
          <table className="table">
            <thead>
              <tr>
                <th>種別</th>
                <th>イベント</th>
                <th>日時</th>
                <th>顧客</th>
                <th>人数</th>
                <th>状態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.event?.type === "private_visit" ? "個別見学" : "見学会"}</td>
                  <td>{b.event?.title ?? "—"}</td>
                  <td>{formatDate(b.event?.starts_at, true)}</td>
                  <td>{b.customer?.full_name ?? "—"}</td>
                  <td>{b.party_size}名</td>
                  <td>{statusLabel(b.status)}</td>
                  <td className="text-right">
                    {b.customer?.id && (
                      <Link
                        href={`/admin/customers/${b.customer.id}`}
                        className="text-brand underline"
                      >
                        顧客
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {payments.length > 0 && (
        <section className="card">
          <h2 className="section-title">決済 <span className="text-ink-mute text-sm">({payments.length})</span></h2>
          <table className="table">
            <thead>
              <tr>
                <th>日時</th>
                <th>顧客</th>
                <th>種別</th>
                <th>金額</th>
                <th>状態</th>
                <th>Stripe ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.occurred_at, true)}</td>
                  <td>{p.customer?.full_name ?? "—"}</td>
                  <td>{p.kind}</td>
                  <td>{formatYen(p.amount)}</td>
                  <td>{statusLabel(p.status)}</td>
                  <td className="font-mono text-xs">
                    {p.stripe_payment_intent_id ?? p.stripe_invoice_id ?? "—"}
                  </td>
                  <td className="text-right">
                    {p.customer?.id && (
                      <Link
                        href={`/admin/customers/${p.customer.id}`}
                        className="text-brand underline"
                      >
                        顧客
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {q.length > 0 && totalHits === 0 && (
        <div className="card text-center text-ink-mute">該当する結果は見つかりませんでした。</div>
      )}
    </div>
  );
}
