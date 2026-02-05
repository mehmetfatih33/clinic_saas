import webpush from "web-push";

// VAPID Keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:info@cliterapi.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/logo.png",
        data: {
          url: payload.url || "/",
        },
      })
    );
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    // If 410 (Gone) or 404, we should delete the subscription
    if ((error as any).statusCode === 410 || (error as any).statusCode === 404) {
      return "gone";
    }
    return false;
  }
}
