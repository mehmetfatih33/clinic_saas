"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager({ iconOnly = false }: { iconOnly?: boolean }) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const { show } = useToast();

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error("Service Worker error:", error);
    }
  }

  async function subscribeToPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error("VAPID Public Key not found");
        show("Bildirim anahtarı eksik (Vercel ENV kontrol edin)", "error");
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(sub);
      
      // Send to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      show("Bildirimler açıldı ✅ Artık önemli gelişmelerden haberdar olacaksınız.", "success");
    } catch (error) {
      console.error("Subscription failed:", error);
      show("Bildirim izni alınamadı.", "error");
    }
  }

  async function unsubscribeFromPush() {
    if (!subscription) return;
    try {
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        setSubscription(null);
        show("Bildirimler kapatıldı.", "info");
    } catch (e) {
        console.error("Unsubscribe error", e);
    }
  }

  if (!isSupported) {
    // Debugging: Show why it's not supported if explicitly requested via iconOnly (topbar)
    if (iconOnly) {
       return (
         <Button variant="ghost" size="icon" title="Bildirimler bu tarayıcıda desteklenmiyor" disabled>
           <BellOff className="h-4 w-4 text-gray-300" />
         </Button>
       );
    }
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {subscription ? (
        <Button variant="outline" size={iconOnly ? "icon" : "sm"} onClick={unsubscribeFromPush} title="Bildirimleri Kapat">
          <BellOff className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">Bildirimleri Kapat</span>}
        </Button>
      ) : (
        <Button variant="default" size={iconOnly ? "icon" : "sm"} onClick={subscribeToPush} title="Bildirimleri Aç">
          <Bell className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">Bildirimleri Aç</span>}
        </Button>
      )}
    </div>
  );
}
