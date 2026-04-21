import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Retouchメンバーズサイト",
  description: "引退競走馬支援「Retouchメンバーズサイト」会員・支援・寄付管理",
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
    <html lang="ja">
      <body className="min-h-screen bg-surface-soft text-ink antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
