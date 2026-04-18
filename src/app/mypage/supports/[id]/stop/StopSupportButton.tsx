"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StopSupportButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/mypage/supports/${id}/stop`, { method: "POST" });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(j.error ?? "停止できませんでした。");
      return;
    }
    router.replace("/mypage");
    router.refresh();
  };

  return (
    <div>
      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      <button className="btn-danger w-full" onClick={run} disabled={busy}>
        {busy ? "処理中..." : "停止を確定する"}
      </button>
    </div>
  );
}
