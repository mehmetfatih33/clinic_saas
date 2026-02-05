import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ message: "Invalid subscription" }, { status: 400 });
    }

    // Upsert the subscription (create if new, update if exists)
    // We use endpoint as unique key
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId: session.user.id, // Update user ownership if changed
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
        const session = await requireSession();
        const { endpoint } = await req.json();

        if (!endpoint) {
            return NextResponse.json({ message: "Endpoint required" }, { status: 400 });
        }

        await prisma.pushSubscription.deleteMany({
            where: { 
                endpoint: endpoint,
                userId: session.user.id
            }
        });

        return NextResponse.json({ message: "Unsubscribed successfully" });
    } catch (error) {
        console.error("Unsubscribe error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
