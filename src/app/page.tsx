import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader active="home" />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center space-y-8">
          <div>
            <p className="text-sm text-ink-mute mb-2">引退競走馬支援</p>
            <h1 className="text-3xl font-bold text-brand">
              Retouchメンバーズサイト
            </h1>
            <p className="mt-3 text-ink-soft">
              会員ページで支援状況・決済状態・次回決済日をひと目で確認できます。
            </p>
            <p className="mt-2 text-sm text-ink-mute">
              はじめての方も、ログインなしで
              <Link href="/signup" className="text-brand underline mx-1">
                新規会員登録
              </Link>
              からご参加いただけます。
            </p>
          </div>

          <div className="grid gap-4">
            <Link href="/signup" className="btn-primary">
              新規会員登録（無料）
            </Link>
            <Link href="/login" className="btn-secondary">
              会員ログイン
            </Link>
            <Link href="/donate" className="btn-ghost">
              ログインせず単発寄付をする
            </Link>
          </div>

          <div className="text-sm text-ink-mute">
            <Link href="/admin/login" className="underline">
              運営管理ログイン
            </Link>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-ink-mute">
        © Retouchメンバーズサイト
      </footer>
    </div>
  );
}
