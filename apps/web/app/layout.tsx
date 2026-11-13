import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { TranslationProvider } from "@/components/i18n";
import BibleChallengeNudge from "@/components/bible-engine/BibleChallengeNudge";
import GlobalResaCallAlerts from "@/components/notifications/GlobalResaCallAlerts";

export const metadata: Metadata = {
  title: "ZION OS",
  description: "Global Adventist Digital Ecosystem",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const countryCode = requestHeaders.get("x-vercel-ip-country") ?? requestHeaders.get("cf-ipcountry") ?? null;

  return (
    <html lang="pt">
      <body className="min-h-screen bg-slate-100">
        <TranslationProvider countryCode={countryCode}>
          <GlobalResaCallAlerts />
          <AppShell>{children}</AppShell>
          <BibleChallengeNudge />
        </TranslationProvider>
      </body>
    </html>
  );
}
