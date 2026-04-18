import Link from "next/link";

export default function DonateThanksPage() {
  return (
    <div className="card text-center space-y-3">
      <p className="text-2xl">💚</p>
      <h1 className="text-xl font-bold">ご寄付をお預かりしました</h1>
      <p className="text-ink-soft">
        温かいご支援を誠にありがとうございます。<br />
        決済完了後、お礼メールをお送りいたします。
      </p>
      <Link href="/mypage" className="btn-primary inline-block mt-3">マイページへ戻る</Link>
    </div>
  );
}
