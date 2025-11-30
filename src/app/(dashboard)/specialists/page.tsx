"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AddSpecialistModal from "@/components/ui/AddSpecialistModal";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X } from "lucide-react";

interface Specialist {
  id: string;
  name: string;
  email: string;
  specialist?: {
    id: string;
    branch: string | null;
    bio: string | null;
    defaultShare: number;
    totalPatients: number;
    totalRevenue: number;
    hourlyFee: number;
  };
}

function EditableField({
  label,
  value,
  unit,
  field,
  specialist,
  onUpdate,
}: {
  label: string;
  value: number;
  unit: string;
  field: "hourlyFee" | "defaultShare";
  specialist: Specialist;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const { show: showToast } = useToast();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // 🧩 BU EKLENDİ: dışarıdan gelen value değiştiğinde state'i güncelle
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const canEdit =
    session?.user?.role === "ADMIN" || session?.user?.role === "ASISTAN";

  const updateMutation = useMutation({
    mutationFn: async (newValue: number) => {
      const res = await fetch(`/api/specialists/${specialist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["specialists"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["specialist"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["specialists"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["specialist"], exact: false });
      onUpdate?.();

      showToast(`${label} başarıyla güncellendi 🎉`, "success");
      setIsEditing(false);
    },
    onError: (error: any) => {
      console.error("💥 updateMutation hata:", error);
      showToast(error.message || "Güncelleme sırasında bir hata oluştu. Lütfen tekrar deneyin.", "error");
      setEditValue(value);
    },
  });

  const handleSave = () => {
    if (editValue !== value) {
      updateMutation.mutate(editValue);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!canEdit) {
    return (
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="font-medium">
          {value.toLocaleString("tr-TR")} {unit}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      {isEditing ? (
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(Number(e.target.value))}
            className="w-20 h-8 text-sm"
            min="0"
            step={field === "hourlyFee" ? "50" : "1"}
          />
          <span className="text-sm">{unit}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="h-8 w-8 p-0"
          >
            <Check size={14} className="text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 w-8 p-0"
          >
            <X size={14} className="text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="font-medium">
            {value.toLocaleString("tr-TR")} {unit}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 size={12} className="text-gray-500" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SpecialistsPage() {
  const { data, refetch, isLoading } = useQuery<Specialist[]>({
    queryKey: ["specialists"],
    queryFn: async () => {
      const res = await fetch("/api/specialists");
      return res.json();
    },
  });

  

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Uzmanlar
          </h1>
          <AddSpecialistModal onAdded={refetch} />
        </div>

        {isLoading ? (
          <p className="text-gray-500">Yükleniyor...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.map((specialist: Specialist) => (
              <Card
                key={specialist.id}
                className="hover:shadow-lg transition-shadow group"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{specialist.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {specialist.email}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <EditableField
                        label="Varsayılan Pay"
                        value={specialist.specialist?.defaultShare || 50}
                        unit="%"
                        field="defaultShare"
                        specialist={specialist}
                        onUpdate={refetch}
                      />
                      <EditableField
                        label="Saatlik Ücret"
                        value={specialist.specialist?.hourlyFee || 0}
                        unit="₺"
                        field="hourlyFee"
                        specialist={specialist}
                        onUpdate={refetch}
                      />
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Hasta Sayısı
                      </p>
                      <p className="font-medium">
                        {specialist.specialist?.totalPatients || 0}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link href={`/specialists/${specialist.id}`}>
                        <Button className="w-full">Detaya Git</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data?.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            Henüz uzman eklenmemiş. İlk uzmanı eklemek için &quot;+ Yeni Uzman&quot;
            butonunu kullanın.
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
