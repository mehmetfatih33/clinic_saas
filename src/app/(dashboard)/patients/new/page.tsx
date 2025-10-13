'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Specialist {
  id: string;
  name: string;
  email?: string;
  branch?: string;
  defaultShare?: number;
  bio?: string;
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
      .then(setSpecialists)
      .catch(() => toast.error('Uzman listesi yüklenemedi.'));
  }, []);

  const handleSpecialistChange = (id: string) => {
    const selected = specialists.find((sp) => sp.id === id);
    setSelectedSpecialist(selected || null);
    setSpecialistShare(selected?.defaultShare ?? 50);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    if (!selectedSpecialist) {
      toast.error('Lütfen bir uzman seçin.');
      setLoading(false);
      return;
    }

    const payload = {
      ...data,
      assignedToId: selectedSpecialist.id,
      fee: parseFloat(fee || '0'),
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
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-card rounded-xl shadow">
      <h1 className="text-2xl font-semibold mb-6">Yeni Hasta Kaydı</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input name="name" placeholder="Ad Soyad" required />
        <Input name="email" type="email" placeholder="E-posta" />
        <Input name="phone" placeholder="Telefon" />
        <Input name="address" placeholder="Adres" />
        <Input name="reference" placeholder="Referans (isteğe bağlı)" />

        <div className="mt-6">
          <label className="block mb-2 text-sm font-medium">Uzman Seç *</label>
          <Select onValueChange={handleSpecialistChange} required>
            <SelectTrigger>
              <SelectValue placeholder="Uzman Seçin" />
            </SelectTrigger>
            <SelectContent>
              {specialists.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {s.branch || 'Genel'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {specialists.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">Uzmanlar yükleniyor...</p>
          )}
        </div>

        <div className="mt-4">
          <label className="block mb-2 text-sm font-medium">Ücret (₺) *</label>
          <Input 
            name="fee" 
            type="number" 
            step="0.01" 
            placeholder="Ücret (₺)" 
            required 
            value={fee} 
            onChange={(e) => setFee(e.target.value)} 
          />
        </div>

        <div className="flex gap-4 mt-4">
          <div className="w-1/2">
            <label className="block mb-2 text-sm font-medium">Uzman Payı (%)</label>
            <Input 
              type="number" 
              name="specialistShare" 
              min="0" 
              max="100" 
              value={specialistShare} 
              onChange={(e) => setSpecialistShare(parseFloat(e.target.value) || 0)} 
            />
          </div>
          <div className="w-1/2">
            <label className="block mb-2 text-sm font-medium">Klinik Payı (%)</label>
            <Input 
              type="number" 
              disabled 
              value={100 - specialistShare} 
              className="bg-muted"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block mb-2 text-sm font-medium">Ek Notlar</label>
          <textarea 
            name="notes" 
            className="w-full p-3 border rounded-md bg-background text-foreground min-h-[80px] resize-y" 
            placeholder="Ek notlar (isteğe bağlı)"
          />
        </div>

        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </form>
    </div>
  );
}