"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) r.push("/dashboard");
    else {
      // Backend'den gelen hata mesajını göster
      const errorMessage = res?.error || "Giriş başarısız";
      alert(errorMessage);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Klinik Panel Girişi</h1>
        
        {/* Demo credentials info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Demo Giriş Bilgileri:</p>
          <p className="text-blue-700 dark:text-blue-300">Admin: admin@klinik.com / admin123</p>
          <p className="text-blue-700 dark:text-blue-300">Uzman: uzman@klinik.com / uzman123</p>
        </div>
        
        <input className="w-full rounded border p-2" placeholder="E‑posta" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" placeholder="Şifre" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full rounded bg-black px-3 py-2 text-white">{loading?"İşlemi gerceklestiriliyor...":"İşlemi gerceklestir"}</button>
      </form>
    </div>
  );
}