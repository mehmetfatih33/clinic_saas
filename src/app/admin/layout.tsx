import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  
  // Ensure strict check for SUPER_ADMIN
  if (!session || session.user.role !== "SUPER_ADMIN") {
    // If user is logged in but not SUPER_ADMIN, redirect to dashboard or login
    if (session) {
       redirect("/dashboard");
    } else {
       redirect("/login");
    }
  }

  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
