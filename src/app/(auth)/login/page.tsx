"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-gray-200 dark:border-gray-800 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Klinik Panel Girişi</CardTitle>
            <div className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Güvenli</div>
          </div>
          <div className="mt-2 text-xs p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-blue-800 dark:text-blue-200">Admin: admin@klinik.com / admin123</p>
            <p className="text-blue-800 dark:text-blue-200">Uzman: uzman@klinik.com / uzman123</p>
            <p className="text-blue-800 dark:text-blue-200">Asistan: asistan@klinik.com / asistan123</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">E‑posta</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={16} />
                </span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@klinik.com"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Şifre</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={16} />
                </span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <a href="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">Şifremi unuttum</a>
              <span className="text-gray-500 dark:text-gray-400">v1.0</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
