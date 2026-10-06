import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { TranslationProvider } from "@/components/i18n";

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
          <AppShell>{children}</AppShell>
        </TranslationProvider>
      </body>
    </html>
  );
}
