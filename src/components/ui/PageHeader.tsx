import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, className }: { title: string; subtitle?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

