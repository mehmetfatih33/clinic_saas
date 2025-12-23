"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { useSession } from "next-auth/react";

export default function RoomsPage() {
  const qc = useQueryClient();
  const { show } = useToast();
  const { data: session } = useSession();

  const { data: plan } = useQuery<{ slug?: string; features?: string[] } | null>({
    queryKey: ["plan"],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) return null;
      return res.json();
    },
  });
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "ASISTAN";
  const roomFeatureAllowed = isAdmin || !!(plan && ((plan.slug === "full") || (Array.isArray(plan.features) && plan.features.includes("room-tracking")) || (plan.slug === "")));

  const { data: roomsResp, isLoading, error } = useQuery<any>({
    queryKey: ["rooms", "all"],
    queryFn: async () => {
      const res = await fetch("/api/rooms?all=1");
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Odalar yüklenemedi");
      }
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      return { items };
    },
    enabled: roomFeatureAllowed,
  });
  const rooms = Array.isArray(roomsResp?.items) ? roomsResp.items : [];

  const [newRoomName, setNewRoomName] = useState("");
  const addRoom = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Oda oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewRoomName("");
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", "all"] });
      show("Oda eklendi ✅", "success");
    },
    onError: (err: any) => show(err.message || "Hata oluştu ❌", "error"),
  });

  const toggleRoom = useMutation({
    mutationFn: async (room: any) => {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: room.id, isActive: !room.isActive }),
      });
      if (!res.ok) throw new Error("Oda güncellenemedi");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", "all"] });
    },
  });

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Odalar</h1>
        </div>

        {!roomFeatureAllowed ? (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Erişim Yok</h2>
            </CardHeader>
            <CardContent>
              <p>Bu özellik paketinizde aktif değil.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Oda Ekle</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input placeholder="Oda adı" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
                  <Button onClick={() => addRoom.mutate()} disabled={!newRoomName.trim() || addRoom.isPending}>Ekle</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Odalar</h2>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <p className="text-gray-500">Yükleniyor...</p>
                )}
                {error && !isLoading && (
                  <p className="text-red-600">Odalar yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
                )}
                {!isLoading && !error && (
                  <div className="space-y-2">
                    {(!Array.isArray(rooms) || rooms.length === 0) ? (
                      <p className="text-gray-500">Aktif oda yok</p>
                    ) : (
                      rooms.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between border rounded p-2">
                          <span>{r.name}</span>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => toggleRoom.mutate(r)}>{r.isActive ? "Pasifleştir" : "Aktifleştir"}</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ToastProvider>
  );
}
