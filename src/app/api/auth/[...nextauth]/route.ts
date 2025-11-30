import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = NextAuth(authOptions);
export const POST = NextAuth(authOptions);
