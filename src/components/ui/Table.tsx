import { cn } from "@/lib/utils";

export function Table({ columns, data }: { columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[]; data: any[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-4 py-2 font-medium text-gray-600">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={cn(i % 2 === 0 ? "bg-white" : "bg-gray-50", "hover:bg-blue-50 transition")}> 
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2">{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

