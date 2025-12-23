"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import NextImage from "next/image";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

function LoginForm() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!email || !password) {
        setError("E-posta ve şifre zorunludur");
        return;
      }
      const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      
      if (res?.ok) {
        r.push("/dashboard");
        return;
      }
      
      const msg = String(res?.error || "Giriş başarısız");
      // Check for specific messages from backend
      const normalized = msg.includes("Kullanıcı bulunamadı")
        ? "Kullanıcı bulunamadı"
        : msg.includes("Geçersiz şifre")
        ? "Şifre yanlış"
        : msg.toLowerCase().includes("secret")
        ? "Sunucu yapılandırması eksik (NEXTAUTH_SECRET)"
        : "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.";
        
      setError(normalized);
      show(normalized, "error");
    } catch (err: any) {
      const errMsg = "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.";
      setError(errMsg);
      show(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-gray-200 dark:border-gray-800 shadow-xl">
      <CardHeader>
        <div className="flex justify-center mb-4">
           <NextImage src="/logo.png" alt="Cliterapi" width={200} height={70} priority className="h-auto w-auto" />
        </div>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Panel Girişi</CardTitle>
          <div className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">Güvenli</div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">E-posta</label>
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
            <a href="/forgot-password" className="text-primary hover:underline">Şifremi unuttum</a>
            <span className="text-gray-500 dark:text-gray-400">v1.0</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </ToastProvider>
  );
}
