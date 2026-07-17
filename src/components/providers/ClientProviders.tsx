"use client";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import QueryProvider from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <QueryProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
