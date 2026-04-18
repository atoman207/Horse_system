import { requireMember } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

export default async function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMember();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="py-6 text-center text-xs text-ink-mute">
        © Retouchメンバーズサイト
      </footer>
    </div>
  );
}
