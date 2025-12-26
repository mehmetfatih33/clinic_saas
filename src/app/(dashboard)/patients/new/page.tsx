'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, Stethoscope, CreditCard, CheckCircle, Calendar } from 'lucide-react';

interface Specialist {
  id: string;
  name: string;
  email?: string;
  specialist?: {
    branch?: string | null;
    defaultShare?: number;
    hourlyFee?: number;
    bio?: string | null;
  };
}

export default function NewPatientPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [specialistShare, setSpecialistShare] = useState(50);
  const [fee, setFee] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/specialists')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.experts) ? data.experts : []);
        setSpecialists(list);
      })
      .catch(() => toast.error('Uzman listesi yüklenemedi.'));
  }, []);

  const handleSpecialistChange = (id: string) => {
    const selected = specialists.find((sp) => sp.id === id);
    setSelectedSpecialist(selected || null);
    setSpecialistShare(selected?.specialist?.defaultShare ?? 50);
    const feeNum = selected?.specialist?.hourlyFee ?? 0;
    setFee(feeNum > 0 ? String(feeNum) : "");
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    // Zorunlu alan doğrulamaları
    const name = (data.name as string)?.trim();
    const phone = (data.phone as string)?.trim();
    const feeValue = parseFloat((data.fee as string) || fee || '0');
    const phoneRegex = /^\+?\d{10,15}$/u;

    if (!name) {
      toast.error('Ad Soyad zorunludur.');
      setLoading(false);
      return;
    }

    if (!phone || !phoneRegex.test(phone)) {
      toast.error('Telefon zorunludur ve geçerli formatta olmalıdır. (Örn: +905551234567)');
      setLoading(false);
      return;
    }

    if (!selectedSpecialist) {
      toast.error('Uzman seçimi zorunludur.');
      setLoading(false);
      return;
    }

    if (!Number.isFinite(feeValue) || feeValue <= 0) {
      toast.error('Ücret zorunludur ve 0’dan büyük olmalıdır.');
      setLoading(false);
      return;
    }

    const payload = {
      ...data,
      assignedToId: selectedSpecialist.id,
      fee: feeValue,
      specialistShare: parseFloat(specialistShare.toString()),
    };

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Hasta başarıyla eklendi!');
        router.push('/patients');
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || 'Hasta eklenemedi.');
      }
    } catch (error) {
      toast.error('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" /> Yeni Hasta Kaydı
          </CardTitle>
          <CardDescription>Zorunlu alanları doldurun ve kaydı tamamlayın.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Ad Soyad *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <User size={16} />
                    </span>
                    <Input name="name" placeholder="Ad Soyad" required className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">E-posta</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail size={16} />
                    </span>
                    <Input name="email" type="email" placeholder="ornek@klinik.com" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Telefon *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Phone size={16} />
                    </span>
                    <Input name="phone" type="tel" placeholder="+905551234567" required className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Adres</label>
                  <Input name="address" placeholder="Adres" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Referans</label>
                  <Input name="reference" placeholder="İsteğe bağlı" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Doğum Tarihi</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Calendar size={16} />
                    </span>
                    <Input name="birthDate" type="date" className="pl-9" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Uzman Seç *</label>
                  <Select onValueChange={handleSpecialistChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Uzman Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialists.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4" />
                            <span>{s.name} — {s.specialist?.branch || 'Genel'}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {specialists.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">Uzmanlar yükleniyor...</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Ücret (₺) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <CreditCard size={16} />
                    </span>
                    <Input
                      name="fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ücret"
                      required
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Tanılar</label>
                  <Textarea name="diagnosis" placeholder="Tanı giriniz..." rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Uzman Payı (%)</p>
                    <Input
                      type="number"
                      name="specialistShare"
                      min="0"
                      max="100"
                      value={specialistShare}
                      onChange={(e) => setSpecialistShare(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Klinik Payı (%)</p>
                    <Input type="number" disabled value={100 - specialistShare} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Ek Notlar</label>
              <textarea
                name="notes"
                className="w-full p-3 border rounded-md bg-background text-foreground min-h-[100px] resize-y"
                placeholder="Ek notlar"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="px-6" disabled={loading}>
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
