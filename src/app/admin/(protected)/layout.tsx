import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const navGroups: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "全体",
    items: [
      { href: "/admin", label: "ダッシュボード" },
      { href: "/admin/search", label: "横断検索" },
      { href: "/admin/audit-logs", label: "監査ログ" },
    ],
  },
  {
    label: "会員・支援",
    items: [
      { href: "/admin/customers", label: "顧客一覧" },
      { href: "/admin/contracts", label: "契約一覧" },
      { href: "/admin/supports", label: "支援管理" },
      { href: "/admin/donations", label: "寄付一覧" },
      { href: "/admin/payments", label: "決済履歴" },
    ],
  },
  {
    label: "マスタ",
    items: [
      { href: "/admin/plans", label: "会員プラン" },
      { href: "/admin/horses", label: "馬マスタ" },
      { href: "/admin/events", label: "イベントマスタ" },
      { href: "/admin/bookings", label: "予約管理" },
    ],
  },
  {
    label: "運用",
    items: [
      { href: "/admin/users", label: "ユーザー管理" },
      { href: "/admin/csv", label: "CSV 入出力" },
    ],
  },
];

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="bg-brand-dark text-white md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <span className="bg-white rounded-lg p-1 flex items-center">
            <Image
              src="/logo.png"
              alt="Retouch"
              width={140}
              height={40}
              className="h-8 w-auto"
            />
          </span>
          <span className="font-bold text-sm">管理画面</span>
        </div>
        <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          {navGroups.map((g) => (
            <div key={g.label} className="md:mb-2 md:block flex gap-1">
              <p className="hidden md:block text-[10px] uppercase tracking-wider text-white/50 px-3 pt-2 pb-1">
                {g.label}
              </p>
              {g.items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap text-sm block"
                >
                  {n.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 mt-4 border-t border-white/10">
          <p className="text-xs text-white/70 mb-2">{session.email}</p>
          <form action="/api/auth/logout?next=/admin/login" method="post">
            <button className="text-xs text-white/70 underline" type="submit">
              ログアウト
            </button>
          </form>
        </div>
      </aside>
      <main className="p-4 md:p-6 overflow-x-auto bg-surface-soft">{children}</main>
    </div>
  );
}
