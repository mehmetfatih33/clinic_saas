import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
            image: user.image
          };
        } catch (error) {
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
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "ASISTAN" | "UZMAN";
        session.user.clinicId = token.clinicId as string; // ✅ token'dan session'a aktardık
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
};