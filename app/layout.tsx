import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "体脂肪計測アプリ",
  description: "トレーニングと体脂肪率の推移を記録するアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <header className="header">
          <nav className="nav">
            <Link href="/">ホーム</Link>
            <Link href="/training">トレーニング</Link>
            <Link href="/bodyfat">体脂肪率</Link>
            <Link href="/ai-estimate">AI推定</Link>
            <Link href="/progress">推移</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          <Link href="/legal/terms">利用規約</Link>
          <span aria-hidden="true">・</span>
          <Link href="/legal/privacy">プライバシーポリシー</Link>
        </footer>
      </body>
    </html>
  );
}
