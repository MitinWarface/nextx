/**
 * NextAuth v4 — Credentials Provider (JWT session strategy).
 * Хранилище пользователей — PostgreSQL через Prisma.
 * Пароль — bcrypt.
 */
import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { PublicUser } from "@/types";
import { getServerSession } from "next-auth/next";
import { HttpError } from "@/lib/api-helpers";
import { ensureSpecialChats } from "@/lib/service-chat";
import { getUserFeatures } from "@/lib/premium";

export const SAFE_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  lastSeenAt: true,
} as const;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user, account }) {
      // Track device + login history + security event on successful login
      try {
        const uid = (user as { id?: string }).id;
        if (!uid) return;
        await prisma.loginHistory.create({
          data: { userId: uid, success: true, ipAddress: "unknown", reason: "auth_signin" },
        });
        await prisma.securityEvent.create({
          data: { userId: uid, type: "login_success", details: { provider: account?.provider ?? "credentials" } },
        });
      } catch { /* non-critical */ }
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Brute-force detection: check for too many recent failed attempts
        const recentFailures = await prisma.loginHistory.count({
          where: {
            success: false,
            createdAt: { gte: new Date(Date.now() - 15 * 60_000) }, // last 15 minutes
          },
        });
        // Count failures from this IP specifically (approximate via recent logins)
        if (recentFailures > 20) {
          // Too many failures globally — temporary lockout
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            passwordHash: true,
            isBanned: true,
            isPermabanned: true,
          },
        });
        if (!user?.passwordHash) return null;
        if (user.isBanned || user.isPermabanned) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) {
          // Record failed attempt
          await prisma.loginHistory.create({
            data: { userId: user.id, success: false, ipAddress: "unknown", reason: "wrong_password" },
          }).catch(() => {});
          // Auto-lock after 10 consecutive failures
          const failCount = await prisma.loginHistory.count({
            where: {
              userId: user.id,
              success: false,
              createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
            },
          });
          if (failCount >= 10) {
            await prisma.user.update({
              where: { id: user.id },
              data: { isBanned: true },
            });
            await prisma.securityEvent.create({
              data: {
                userId: user.id,
                type: "bruteforce_detected",
                details: { failedAttempts: failCount, action: "auto_ban" },
              },
            }).catch(() => {});
          }
          return null;
        }
        return {
          id: user.id,
          name: user.displayName,
          email: user.username,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const uid = (user as { id: string }).id;
        (token as JWT & { uid?: string }).uid = uid;
        // Ensure service + self chats exist
        ensureSpecialChats(uid).catch(console.error);
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as JWT & { uid?: string };
      if (session.user && t.uid) {
        (session.user as Session["user"] & { id?: string }).id = t.uid;
        // Attach role from DB
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: t.uid },
            select: { role: true },
          });
          (session.user as any).role = dbUser?.role ?? "USER";
        } catch {
          (session.user as any).role = "USER";
        }
        // Attach premium features
        try {
          const features = await getUserFeatures(t.uid);
          (session.user as any).features = features;
          (session.user as any).isPremium = features.length > 0;
        } catch {
          (session.user as any).features = [];
          (session.user as any).isPremium = false;
        }
      }
      return session;
    },
  },
};

// ============================================================
// Server helpers
// ============================================================

/**
 * Decode userId from next-auth JWT cookie string.
 */
async function decodeUserIdFromCookies(cookieHeader: string): Promise<string | null> {
  try {
    let raw: string | undefined;
    // Match next-auth.session-token or __Secure-next-auth.session-token
    const m = cookieHeader.match(/(?:^|;\s*)next-auth\.session-token=([^;]+)/);
    const s = cookieHeader.match(/(?:^|;\s*)__Secure-next-auth\.session-token=([^;]+)/);
    raw = m?.[1] ?? s?.[1];
    if (!raw) return null;
    const decoded = await (await import("next-auth/jwt")).decode({
      token: decodeURIComponent(raw),
      secret: process.env.NEXTAUTH_SECRET ?? "",
    });
    return (decoded as (JWT & { uid?: string }) | null)?.uid ?? null;
  } catch {
    return null;
  }
}

/**
 * Получить текущего пользователя из Request (route handlers).
 * Автоматически извлекает cookie из заголовков.
 */
export async function getCurrentUserFromRequest(req: Request): Promise<PublicUser | null> {
  return getCurrentUser(req.headers.get("cookie") ?? undefined);
}

/**
 * Получить текущего пользователя.
 * @param cookieHeader — optional raw Cookie header string (for route handlers via server.js)
 */
export async function getCurrentUser(cookieHeader?: string): Promise<PublicUser | null> {
  let uid: string | null = null;

  // 1) Try cookie header directly (works in route handlers + server.js)
  if (cookieHeader) {
    uid = await decodeUserIdFromCookies(cookieHeader);
  }

  // 2) Try getServerSession (works in Server Components / middleware)
  if (!uid) {
    try {
      const session = await getServerSession(authOptions);
      uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    } catch { /* ignore */ }
  }

  if (!uid) return null;
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: SAFE_USER_SELECT,
  });
  if (!user) return null;
  return {
    ...user,
    lastSeenAt: user.lastSeenAt.toISOString(),
  };
}

/**
 * В route handler: получить пользователя или бросить 401.
 * @param cookieHeader — optional raw Cookie header string
 */
export async function requireUser(cookieHeader?: string): Promise<PublicUser> {
  const user = await getCurrentUser(cookieHeader);
  if (!user) throw new HttpError(401, "unauthorized");
  return user;
}

/**
 * Для Socket.io: верифицировать JWT из cookie или handshake auth.
 * Возвращает userId или null.
 */
export async function authenticateSocket(
  cookieHeader: string | undefined,
  handshakeAuth: { token?: string } | undefined,
): Promise<string | null> {
  let token: string | undefined;
  if (cookieHeader) {
    const m = cookieHeader.match(/(?:__Secure-)?next-auth\.session-token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token && handshakeAuth?.token) token = handshakeAuth.token;
  if (!token) return null;

  try {
    const { decode } = await import("next-auth/jwt");
    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET ?? "",
    });
    const uid = (decoded as (JWT & { uid?: string }) | null)?.uid;
    return uid ?? null;
  } catch {
    return null;
  }
}

