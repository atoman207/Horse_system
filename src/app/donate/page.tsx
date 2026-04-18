import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

export default function PublicDonatePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader active="donate" />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-3">
          <h1 className="text-2xl font-bold text-brand">単発寄付</h1>
          <p className="text-sm text-ink-soft">
            会員登録をしていただくと、マイページから単発寄付もスムーズに行えます。
            <br />
            支援履歴がマイページで確認できます。
          </p>
          <Link href="/signup" className="btn-primary">
            新規会員登録
          </Link>
          <Link href="/login" className="btn-secondary">
            ログイン
          </Link>
          <Link href="/" className="text-xs text-ink-mute underline">
            トップへ戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
