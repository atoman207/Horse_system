import PublicHeader from "@/components/PublicHeader";
import bgImage from "@/assets/images/bg.png";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative isolate overflow-hidden">
      <PublicHeader active="home" />

      <Image
        src={bgImage}
        alt=""
        fill
        priority
        className="absolute inset-0 z-0 object-cover hero-zoom"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-10 bg-gradient-to-b from-white/12 via-white/30 to-black/35"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-20 bg-gradient-to-t from-black/35 via-transparent to-transparent"
      />

      <main className="relative z-30 flex-1 flex items-end px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5">
            <section className="feature-card hero-fade hero-delay-1 feature-float">
              <p className="text-[11px] sm:text-xs tracking-widest text-brand-dark font-bold">
                顧客情報管理
              </p>
              <h2 className="mt-1 text-base sm:text-lg font-bold text-ink">
                会員状態を1画面で把握
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-ink-soft">
                氏名・連絡先・会員区分・決済状態をひとつの導線で管理し、対応漏れを防ぎます。
              </p>
            </section>

            <section className="feature-card hero-fade hero-delay-2 feature-float" style={{ animationDelay: "320ms" }}>
              <p className="text-[11px] sm:text-xs tracking-widest text-brand-dark font-bold">
                複数馬・複数口支援
              </p>
              <h2 className="mt-1 text-base sm:text-lg font-bold text-ink">
                一口支援を柔軟に追加
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-ink-soft">
                半口・1口・複数口を馬ごとに設定。支援変更・停止の履歴も自動で追跡できます。
              </p>
            </section>

            <section className="feature-card hero-fade hero-delay-3 feature-float" style={{ animationDelay: "520ms" }}>
              <p className="text-[11px] sm:text-xs tracking-widest text-brand-dark font-bold">
                横断検索・履歴連携
              </p>
              <h2 className="mt-1 text-base sm:text-lg font-bold text-ink">
                寄付や見学履歴まで即検索
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-ink-soft">
                単発寄付・支援契約・予約・決済履歴を顧客単位で紐付け、素早く状況確認できます。
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="relative z-30 py-5 text-center text-xs text-white/80">
        © Retouchメンバーズサイト
      </footer>
    </div>
  );
}
