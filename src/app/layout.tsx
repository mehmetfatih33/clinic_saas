import "./globals.css";
import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClientProviders } from "@/components/providers/ClientProviders";

export const metadata: Metadata = { title: "Cliterapi", description: "Cliterapi - Klinik Yönetim Sistemi" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('darkMode') === 'true') {
                  document.documentElement.classList.add('dark')
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning={true}>
        <ClientProviders>
          {children}
        </ClientProviders>
        <SpeedInsights />
      </body>
    </html>
  );
}
