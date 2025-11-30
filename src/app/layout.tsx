import "./globals.css";
import type { Metadata } from "next";
import { ClientProviders } from "@/components/providers/ClientProviders";

export const metadata: Metadata = { title: "Clinic SaaS", description: "Multi-tenant clinic app" };

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
      <body className="min-h-screen bg-white text-gray-900" suppressHydrationWarning={true}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
