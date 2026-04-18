"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingButton({
  eventId,
  disabled,
  cancel,
}: {
  eventId: string;
  disabled?: boolean;
  cancel?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const method = cancel ? "DELETE" : "POST";
    const res = await fetch("/api/mypage/bookings", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j.error ?? "処理できませんでした");
      return;
    }
    router.refresh();
  };

  return (
    <button
      onClick={run}
      disabled={disabled || busy}
      className={cancel ? "btn-ghost !py-1.5 !px-3 text-danger" : "btn-primary !py-2 !px-4"}
    >
      {busy ? "処理中..." : cancel ? "キャンセル" : "予約する"}
    </button>
  );
}
