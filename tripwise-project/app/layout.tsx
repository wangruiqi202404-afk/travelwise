import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tripwise — 旅行准备管理器",
  description: "用清晰的计划表管理旅行与行前准备。",
  metadataBase: new URL("https://tripwise-travel-prep-demo.ererern.chatgpt.site"),
  openGraph: {
    title: "Tripwise — 旅行准备管理器",
    description: "路线由你决定，准备过程清晰可见。",
    images: [{ url: "/og-v2.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tripwise — 旅行准备管理器",
    description: "路线由你决定，准备过程清晰可见。",
    images: ["/og-v2.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
