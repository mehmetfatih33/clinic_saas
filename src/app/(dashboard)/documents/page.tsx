"use client";
import { useQuery } from "@tanstack/react-query";
import { Search, File, FolderOpen, User, Calendar, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import AddDocumentModal from "@/components/ui/AddDocumentModal";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ToastProvider } from "@/components/ui/ToastProvider";

export default function DocumentsPage() {
  return (
    <ToastProvider>
      <DocumentsContent />
    </ToastProvider>
  );
}

function DocumentsContent() {
  const [search, setSearch] = useState("");

  const { data: documents = [], refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || []);
    }
  });

  const filteredDocuments = documents.filter((d: any) => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.patient?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch(type) {
      case "GORUNTULEME": return <FileText className="text-purple-600" />;
      case "ANALIZ": return <FileText className="text-green-600" />;
      default: return <File className="text-blue-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokümanlar</h1>
          <p className="text-muted-foreground">Hasta raporları, tahlil sonuçları ve diğer belgeler.</p>
        </div>
        <AddDocumentModal onAdded={refetch} />
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Belge veya hasta adı ara..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FolderOpen className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Henüz belge yok</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            Yüklenen belgeler burada listelenecektir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map((doc: any) => (
            <div key={doc.id} className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow group relative">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  {getIcon(doc.type)}
                </div>
                <div className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-600">
                  {doc.type}
                </div>
              </div>
              
              <h3 className="font-medium text-gray-900 truncate mb-1" title={doc.name}>{doc.name}</h3>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <User size={14} />
                <span className="truncate">{doc.patient?.name}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  {format(new Date(doc.createdAt), "d MMM yyyy", { locale: tr })}
                </div>
                <div>{(doc.size / 1024).toFixed(1)} KB</div>
              </div>

              {doc.url && (
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                >
                  <div className="bg-white text-gray-900 px-4 py-2 rounded-lg shadow-lg font-medium flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <ExternalLink size={16} />
                    Görüntüle
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
