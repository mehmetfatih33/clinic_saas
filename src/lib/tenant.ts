export function getTenantSlugFromHost(host?: string, _rootDomain = process.env.ROOT_DOMAIN || "localhost") {
  if (!host) return "default";
  // localhost:3000 → subdomain yok
  if (host.startsWith("localhost")) return "default";
  const parts = host.split(":")[0].split(".");
  // örn: klinik1.example.com → [klinik1, example, com]
  if (parts.length <= 2) return "default";
  return parts[0];
}