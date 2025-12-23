import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: "SUPER_ADMIN" | "ADMIN" | "ASISTAN" | "UZMAN" | "PERSONEL"
      clinicId: string
      clinicIds: string[]
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: "SUPER_ADMIN" | "ADMIN" | "ASISTAN" | "UZMAN" | "PERSONEL"
    clinicId: string
    clinics?: { clinicId: string }[]
  }
}
