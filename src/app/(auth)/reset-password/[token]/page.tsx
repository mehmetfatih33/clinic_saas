"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const r = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Şifreler uyuşmuyor");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "İstek başarısız");
      setMessage("Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz...");
      setTimeout(() => r.push("/login"), 1500);
    } catch (err: any) {
      setMessage(err?.message || "İşlem sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Şifreyi Sıfırla</h1>
        <input
          className="w-full rounded border p-2"
          placeholder="Yeni Şifre"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Yeni Şifre (Tekrar)"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button disabled={loading} className="w-full rounded bg-black px-3 py-2 text-white">
          {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </button>
        {message && (
          <div className="text-sm text-gray-700">{message}</div>
        )}
      </form>
    </div>
  );
}
