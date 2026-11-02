import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

/**
 * Login com Google (OpenID Connect). Escopos mínimos: openid, email, profile.
 * Não pedimos acesso ao Google Agenda.
 * Sessões ficam no banco (podem ser revogadas apagando a linha em Session).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google({ authorization: { params: { scope: "openid email profile", prompt: "select_account" } } })],
  session: { strategy: "database", maxAge: 30 * 24 * 3600 },
  pages: { signIn: "/entrar" },
  trustHost: true,
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
