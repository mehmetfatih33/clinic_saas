import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: "ADMIN" | "ASISTAN" | "UZMAN"
      clinicId: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: "ADMIN" | "ASISTAN" | "UZMAN"
    clinicId: string
  }
}