"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, FileSpreadsheet, FileCode2, FileText } from "lucide-react";

export default function ExportsPage() {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("json");

  const formats = [
    { key: "json", label: "JSON", icon: FileJson },
    { key: "csv", label: "CSV", icon: FileText },
    { key: "excel", label: "Excel", icon: FileSpreadsheet },
    { key: "sql", label: "SQL", icon: FileCode2 },
  ];

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clinic_export_${format}.${format === "excel" ? "xlsx" : format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Bir hata oluştu, lütfen tekrar deneyin!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8">
      <motion.h2
        className="text-2xl font-semibold text-center text-gray-700 dark:text-gray-100 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Verilerimi Dışa Aktar
      </motion.h2>

      <motion.div
        className="bg-white/90 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Format Seçin:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {formats.map(({ key, label, icon: Icon }) => (
              <motion.button
                key={key}
                onClick={() => setFormat(key)}
                className={`flex flex-col items-center justify-center rounded-xl border py-3 transition-all ${
                  format === key
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-900/40 text-sky-600"
                    : "border-gray-200 dark:border-gray-700 hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-gray-800"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={22} className="mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={handleExport}
            disabled={loading}
            className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-primary text-white py-3 font-medium shadow hover:bg-primary/90 active:scale-95 transition-all"
            whileHover={{ scale: 1.02 }}
          >
            {loading ? (
              <span>İndiriliyor...</span>
            ) : (
              <>
                <Download size={18} />
                <span>Verileri İndir ({format.toUpperCase()})</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}