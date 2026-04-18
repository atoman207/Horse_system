import Image from "next/image";
import Link from "next/link";
import { requireMember } from "@/lib/auth";

export default async function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMember();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur border-b border-surface-line">
        <div className="w-full flex items-center justify-between gap-3 py-3 pr-[5vw]">
          <Link
            href="/mypage"
            className="flex items-center gap-3"
            style={{ marginLeft: "5vw" }}
            aria-label="Retouchメンバーズサイト"
          >
            <Image
              src="/logo.png"
              alt="Retouch Members Site"
              width={220}
              height={64}
              priority
              className="h-12 w-auto"
            />
          </Link>
          <form action="/api/auth/logout?next=/" method="post">
            <button
              className="btn-ghost !px-4 !py-2 text-sm"
              type="submit"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="py-6 text-center text-xs text-ink-mute">
        © Retouchメンバーズサイト
      </footer>
    </div>
  );
}
