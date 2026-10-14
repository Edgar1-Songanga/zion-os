import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { TranslationProvider } from "@/components/i18n";
import BibleChallengeNudge from "@/components/bible-engine/BibleChallengeNudge";
import GlobalResaCallAlerts from "@/components/notifications/GlobalResaCallAlerts";

export const metadata: Metadata = {
  title: "ZION OS",
  description: "Global Adventist Digital Ecosystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-slate-100">
        <TranslationProvider>
          <GlobalResaCallAlerts />
          <AppShell>{children}</AppShell>
          <BibleChallengeNudge />
        </TranslationProvider>
      </body>
    </html>
  );
}
