import type { Metadata } from "next";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { Noto_Sans_Arabic } from "next/font/google";
import { MantineProviders } from "@/components/MantineProviders";
import "./globals.css";

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "مشرق — Mashreq",
  description:
    "مساعد تعليمي للاطلاع على النصوص القانونية السودانية المفهرسة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      {...mantineHtmlProps}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className={notoArabic.className}>
        <MantineProviders>{children}</MantineProviders>
      </body>
    </html>
  );
}
