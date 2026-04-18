"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CsvTools() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/csv/customers", { method: "POST", body: fd });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) {
      setResult(`エラー：${j.error ?? "取込に失敗しました"}`);
      return;
    }
    setResult(`取込完了：新規 ${j.created} 件、更新 ${j.updated} 件、エラー ${j.errors.length} 件`);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-3">
      <a className="btn-primary" href="/api/admin/csv/customers" download>
        顧客CSVをエクスポート
      </a>
      <label className="btn-secondary cursor-pointer">
        {busy ? "取込中..." : "顧客CSVを取込む"}
        <input type="file" accept=".csv" className="hidden" onChange={upload} />
      </label>
      {result && <p className="w-full text-sm mt-2">{result}</p>}
    </div>
  );
}
