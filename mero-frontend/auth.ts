import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Apple from "next-auth/providers/apple"
import Instagram from "next-auth/providers/instagram"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "lib/prisma"

function hasSecret(value?: string) {
  return Boolean(value && value.trim() && value.trim() !== "xxxxxx")
}

function buildProviders() {
  const providers: any[] = []

  // Google is the primary provider.
  if (hasSecret(process.env.AUTH_GOOGLE_ID) && hasSecret(process.env.AUTH_GOOGLE_SECRET)) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        authorization: {
          params: { scope: "openid profile email" },
        },
      })
    )
  }

  // Optional providers (enabled only if env vars exist)
  if (hasSecret(process.env.AUTH_APPLE_ID) && hasSecret(process.env.AUTH_APPLE_SECRET)) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID,
        clientSecret: process.env.AUTH_APPLE_SECRET,
      })
    )
  }

  if (hasSecret(process.env.AUTH_INSTAGRAM_ID) && hasSecret(process.env.AUTH_INSTAGRAM_SECRET)) {
    providers.push(
      Instagram({
        clientId: process.env.AUTH_INSTAGRAM_ID,
        clientSecret: process.env.AUTH_INSTAGRAM_SECRET,
      })
    )
  }

  return providers
}

function assertAuthEnv(providersCount: number) {
  if (process.env.NODE_ENV !== "production") return

  const missing: string[] = []
  if (!hasSecret(process.env.AUTH_SECRET)) missing.push("AUTH_SECRET")
  if (!hasSecret(process.env.DATABASE_URL)) missing.push("DATABASE_URL")
  if (providersCount === 0) missing.push("AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET (or enable at least one provider)")

  if (missing.length) {
    // This is the #1 cause of /api/auth/error?error=Configuration on Vercel.
    // We throw a clear message so the logs show exactly what to fix.
    throw new Error(`Auth configuration is incomplete. Missing: ${missing.join(", ")}`)
  }
}

const providers = buildProviders()
assertAuthEnv(providers.length)

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        // @ts-ignore
        session.user.id = user.id
        // @ts-ignore
        session.user.role = user.role
      }
      return session
    },
    async signIn({ user }) {
      if (user?.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true, lastSeen: new Date() },
          })
        } catch (error) {
          console.error("Error updating user status:", error)
        }
      }
      return true
    },
  },
  pages: {
    signIn: "/login",
  },
})
