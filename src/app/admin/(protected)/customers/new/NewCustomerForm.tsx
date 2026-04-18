"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerForm() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", status: "active" });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: any) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(j.error ?? "登録できませんでした。");
      return;
    }
    router.replace(`/admin/customers/${j.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={save} className="card space-y-4 max-w-xl">
      <div><label className="label">氏名</label><input className="input" value={form.full_name} onChange={set("full_name")} required /></div>
      <div><label className="label">メール</label><input type="email" className="input" value={form.email} onChange={set("email")} /></div>
      <div><label className="label">電話</label><input className="input" value={form.phone} onChange={set("phone")} /></div>
      <div><label className="label">状態</label>
        <select className="input" value={form.status} onChange={set("status")}>
          <option value="active">有効</option>
          <option value="suspended">停止中</option>
          <option value="withdrawn">退会</option>
        </select>
      </div>
      {err && <p className="text-danger text-sm">{err}</p>}
      <button className="btn-primary">{saving ? "登録中..." : "登録する"}</button>
    </form>
  );
}
