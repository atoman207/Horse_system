"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddBookingForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        event_id: eventId,
        party_size: Number(partySize),
        note: note || null,
      }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(j.error ?? "登録できませんでした。");
      return;
    }
    setMsg("追加しました。");
    setCustomerId("");
    setNote("");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3">
      <div className="sm:col-span-2">
        <label className="label">顧客 ID</label>
        <input
          className="input font-mono text-xs"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="UUID"
        />
      </div>
      <div>
        <label className="label">人数</label>
        <input type="number" className="input" min={1} max={20} value={partySize} onChange={(e) => setPartySize(e.target.value)} />
      </div>
      <div>
        <label className="label">メモ</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {msg && <p className="sm:col-span-4 text-sm">{msg}</p>}
      <div className="sm:col-span-4">
        <button className="btn-primary" disabled={busy}>
          {busy ? "登録中..." : "予約を追加"}
        </button>
      </div>
    </form>
  );
}
