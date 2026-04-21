import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

export default function PublicDonateThanksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader active="donate" />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-3">
          <p className="text-3xl">💚</p>
          <h1 className="text-xl font-bold">ご寄付をお預かりしました</h1>
          <p className="text-ink-soft">
            温かいご支援を誠にありがとうございます。<br />
            決済完了後、ご記載いただいたメールアドレスにお礼メールをお送りいたします。
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/signup" className="btn-primary">
              会員登録して継続支援を検討する
            </Link>
            <Link href="/" className="btn-ghost">
              トップへ戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
