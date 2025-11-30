import { cn } from "@/lib/utils";

export function SectionHeader({ title, actions, className }: { title: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {actions}
    </div>
  );
}

