"use client";
import { cn } from "@/lib/utils";

export function StatCard({ title, value, subtitle, icon, color = "bg-white", accent = "", onClick }: { title: string; value: string | number; subtitle?: string; icon?: React.ReactNode; color?: string; accent?: string; onClick?: () => void }) {
  return (
    <div className={cn("rounded-xl border p-5 shadow-sm hover:shadow-md transition", color)} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold">{value}</div>
        {icon}
      </div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
      {subtitle && <div className={cn("text-xs mt-2", accent)}>{subtitle}</div>}
    </div>
  );
}

