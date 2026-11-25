import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: { email: { type: "text" }, password: { type: "password" } },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const u = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!u) return null;
        const ok = await bcrypt.compare(creds.password, u.passwordHash);
        if (!ok) return null;
        return { id: u.id, name: u.name, email: u.email, role: u.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      // Fresh role from DB on every session read — promotions apply without re-login
      try {
        const email = (session.user as any)?.email ?? (token as any).email;
        if (email) {
          const u = await prisma.user.findUnique({ where: { email } });
          if (u) (session.user as any).role = u.role;
        } else {
          (session.user as any).role = (token as any).role;
        }
      } catch {
        (session.user as any).role = (token as any).role;
      }
      (session.user as any).id = token.sub;
      return session;
    },
  },
};
