import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Pacifico } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pacifico",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Retouchメンバーズサイト｜公式リニューアル版",
  description:
    "引退競走馬支援「Retouchメンバーズサイト」(retouch-members.com) 公式リニューアル版。会員・支援・寄付・予約をひとつの画面で。",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} ${pacifico.variable}`}>
      <body className="min-h-screen bg-surface-soft text-ink antialiased font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
