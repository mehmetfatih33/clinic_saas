import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { redirect } from "next/navigation";

export type FeatureSlug = "core-clinic" | "room-tracking" | "accounting";

export async function getCurrentClinicPlan(clinicId: string) {
  const cp = await prisma.clinicPlan.findFirst({
    where: { clinicId, isActive: true },
    include: { plan: true },
    orderBy: { startDate: "desc" },
  });
  if (!cp || !(cp as any).plan) return null;
  return cp as any;
}

export async function hasFeature(clinicId: string, featureSlug: FeatureSlug): Promise<boolean> {
  const current = await getCurrentClinicPlan(clinicId);
  if (!current?.plan) return false;
  const slug = current.plan.slug as string;
  if (slug === "full") return true;
  if (slug === "pro" && featureSlug === "room-tracking") return true;
  const features = current.plan.features as unknown as string[] | null;
  return Array.isArray(features) ? features.includes(featureSlug) : false;
}

export async function requireFeature(featureSlug: FeatureSlug): Promise<void> {
  const session = await requireSession();
  const ok = await hasFeature(session.user.clinicId, featureSlug);
  if (!ok) redirect("/upgrade");
}
