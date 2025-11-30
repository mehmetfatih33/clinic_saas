import { cn } from "@/lib/utils";

export function Badge({ children, color = "bg-gray-100 text-gray-700", className }: { children: React.ReactNode; color?: string; className?: string }) {
  return <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", color, className)}>{children}</span>;
}

