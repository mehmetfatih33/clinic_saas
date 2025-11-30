"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [devLink, setDevLink] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setDevLink("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "İstek başarısız");
      setMessage(data?.message || "Eğer hesap mevcutsa talimatlar gönderildi");
      if (data?.resetUrl) setDevLink(data.resetUrl);
    } catch (err: any) {
      setMessage(err?.message || "İşlem sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Şifremi Unuttum</h1>
        <p className="text-sm text-gray-600">E‑postanızı girin, sıfırlama bağlantısı gönderelim.</p>
        <input
          className="w-full rounded border p-2"
          placeholder="E‑posta"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button disabled={loading} className="w-full rounded bg-black px-3 py-2 text-white">
          {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
        </button>
        {message && (
          <div className="text-sm text-gray-700">{message}</div>
        )}
        {devLink && (
          <div className="text-sm">
            Geliştirme bağlantısı: <Link href={devLink} className="text-blue-600 underline">{devLink}</Link>
          </div>
        )}
        <div className="text-sm">
          <Link href="/login" className="text-blue-600 underline">Girişe dön</Link>
        </div>
      </form>
    </div>
  );
}

