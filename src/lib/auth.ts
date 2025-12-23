import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: process.env.DEMO_AUTH === "true" ? undefined : PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve şifre zorunludur");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) throw new Error("Kullanıcı bulunamadı");
          if (!user.passwordHash) throw new Error("Geçersiz kullanıcı");

          const isValid = await compare(credentials.password, user.passwordHash);
          if (!isValid) throw new Error("Geçersiz şifre");

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clinicId: user.clinicId,
            image: user.image,
          } as any;
        } catch (error) {
          if (process.env.DEMO_AUTH === "true") {
            const demos = [
              { email: "superadmin@clinic.dev", password: "SuperAdmin1234", id: "demo-superadmin", role: "SUPER_ADMIN", clinicId: "default-clinic", name: "Super Admin" },
              { email: "admin@admin.com", password: "Admin1234", id: "demo-admin", role: "ADMIN", clinicId: "default-clinic", name: "Sistem Admin" },
              { email: "uzman1@clinic.dev", password: "Uzman1234", id: "demo-uzman1", role: "UZMAN", clinicId: "default-clinic", name: "Demo Uzman 1" },
              { email: "uzman2@clinic.dev", password: "Uzman1234", id: "demo-uzman2", role: "UZMAN", clinicId: "default-clinic", name: "Demo Uzman 2" },
              { email: "uzman3@clinic.dev", password: "Uzman1234", id: "demo-uzman3", role: "UZMAN", clinicId: "default-clinic", name: "Demo Uzman 3" },
              { email: "uzman4@clinic.dev", password: "Uzman1234", id: "demo-uzman4", role: "UZMAN", clinicId: "default-clinic", name: "Demo Uzman 4" },
            ];
            const found = demos.find(d => d.email === credentials.email && d.password === credentials.password);
            if (found) {
              return { id: found.id, email: found.email, name: found.name, role: found.role as any, clinicId: found.clinicId, image: null, clinics: [] } as any;
            }
          }
          console.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clinicId = user.clinicId; // ✅ clinicId'yi token'a ekledik
        const mappings = await prisma.userClinic.findMany({ where: { userId: user.id }, select: { clinicId: true } });
        const ids = mappings.map((m: { clinicId: string }) => m.clinicId);
        if (!ids.includes(user.clinicId)) ids.push(user.clinicId);
        (token as any).clinicIds = ids;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "SUPER_ADMIN" | "ADMIN" | "ASISTAN" | "UZMAN" | "PERSONEL";
        session.user.clinicId = token.clinicId as string;
        session.user.clinicIds = (token as any).clinicIds as string[];
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login", // Redirect errors to login page
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  events: {
    async signIn({ user }) {
      try {
        if (!user) return;
        await prisma.auditLog.create({
          data: {
            clinicId: (user as any).clinicId,
            actorId: user.id as string,
            action: "SIGN_IN",
            entity: "Auth",
            entityId: user.id as string,
            meta: { message: "Giriş yapıldı" },
          },
        });
      } catch (e) {
        // ignore
      }
    },
    async signOut({ token }) {
      try {
        if (!token) return;
        await prisma.auditLog.create({
          data: {
            clinicId: (token as any).clinicId,
            actorId: (token as any).id,
            action: "SIGN_OUT",
            entity: "Auth",
            entityId: (token as any).id,
            meta: { message: "Çıkış yapıldı" },
          },
        });
      } catch (e) {
        // ignore
      }
    },
  },
};
