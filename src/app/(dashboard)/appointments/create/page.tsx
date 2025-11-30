'use client';
import StepAppointmentModal from '@/components/ui/StepAppointmentModal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateAppointmentPage() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Yeni Randevu</h1>
        <Button asChild variant="outline">
          <Link href="/appointments">Takvime Dön</Link>
        </Button>
      </div>
      <StepAppointmentModal open={true} onClose={() => router.push('/appointments')} mode="page" />
    </div>
  );
}
