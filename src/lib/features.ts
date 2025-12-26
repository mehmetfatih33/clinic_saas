import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { redirect } from "next/navigation";

export type FeatureSlug =
  | "core-clinic"
  | "room-tracking"
  | "accounting"
  | "multi-user"
  | "multi-room"
  | "analytics"
  | "documents"
  | "prescriptions"
  | "tasks";

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
  const session = await requireSession();
  
  // Get current plan or default to Basic
  const current = await getCurrentClinicPlan(clinicId);
  
  // If no plan, assume Basic plan (only core-clinic)
  if (!current?.plan) {
    // Basic plan only has "core-clinic"
    return featureSlug === "core-clinic";
  }

  const slug = current.plan.slug as string;
  if (slug === "full") return true;
  
  // Handle Pro plan manually if features are not in DB array for some reason, 
  // but better to rely on DB features. 
  // For now, let's assume DB features are correct.
  
  const features = current.plan.features as unknown as string[] | null;
  return Array.isArray(features) ? features.includes(featureSlug) : false;
}

export async function requireFeature(featureSlug: FeatureSlug): Promise<void> {
  const session = await requireSession();
  const ok = await hasFeature(session.user.clinicId, featureSlug);
  if (!ok) redirect("/upgrade");
}
