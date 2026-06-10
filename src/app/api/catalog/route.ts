/**
 * GET /api/catalog — unified search across channels, groups, bots, apps, and users.
 *
 * Query params:
 *   q    – search string (required, min 1 char)
 *   type – optional filter: "channels" | "groups" | "bots" | "apps" | "users"
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

type CatalogType = "channels" | "groups" | "bots" | "apps" | "users";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const type = searchParams.get("type") as CatalogType | null;

    if (!q) {
      return ok({
        channels: [],
        groups: [],
        bots: [],
        apps: [],
        users: [],
        counts: { channels: 0, groups: 0, bots: 0, apps: 0, users: 0 },
      });
    }

    const orFilter = [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ];

    const userOrFilter = [
      { username: { contains: q, mode: "insensitive" as const } },
      { displayName: { contains: q, mode: "insensitive" as const } },
    ];

    const botOrFilter = [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ];

    const searchChannels =
      !type || type === "channels"
        ? prisma.chat.findMany({
            where: {
              type: "CHANNEL",
              isArchived: false,
              isPrivate: false,
              OR: orFilter,
            },
            select: {
              id: true,
              name: true,
              description: true,
              avatarUrl: true,
              isVerified: true,
              isPaidChannel: true,
              subscriptionPrice: true,
              colorLabel: true,
              level: true,
              _count: { select: { channelSubscribers: true } },
            },
            take: 20,
            orderBy: { lastMessageAt: "desc" },
          })
        : Promise.resolve([]);

    const searchGroups =
      !type || type === "groups"
        ? prisma.chat.findMany({
            where: {
              type: "GROUP",
              isArchived: false,
              isPrivate: false,
              OR: orFilter,
            },
            select: {
              id: true,
              name: true,
              description: true,
              avatarUrl: true,
              colorLabel: true,
              level: true,
              _count: { select: { participants: true } },
            },
            take: 20,
            orderBy: { lastMessageAt: "desc" },
          })
        : Promise.resolve([]);

    const searchBots =
      !type || type === "bots"
        ? prisma.bot.findMany({
            where: {
              isActive: true,
              OR: botOrFilter,
            },
            select: {
              id: true,
              name: true,
              username: true,
              description: true,
              avatarUrl: true,
              creator: {
                select: { id: true, displayName: true, username: true },
              },
            },
            take: 20,
          })
        : Promise.resolve([]);

    const searchApps =
      !type || type === "apps"
        ? prisma.developerApp.findMany({
            where: {
              isPublished: true,
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                {
                  miniAppDescription: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
            select: {
              id: true,
              name: true,
              miniAppDescription: true,
              miniAppIcon: true,
              miniAppCategory: true,
              miniAppRating: true,
              miniAppInstalls: true,
              miniAppVersion: true,
              user: {
                select: { id: true, displayName: true },
              },
            },
            take: 20,
            orderBy: { miniAppInstalls: "desc" },
          })
        : Promise.resolve([]);

    const searchUsers =
      !type || type === "users"
        ? prisma.user.findMany({
            where: {
              deletedAt: null,
              isBanned: false,
              stealthMode: false,
              OR: userOrFilter,
            },
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              isBot: false,
              userRole: true,
              premiumStatus: true,
            },
            take: 20,
          })
        : Promise.resolve([]);

    const [channels, groups, bots, apps, users] = await Promise.all([
      searchChannels,
      searchGroups,
      searchBots,
      searchApps,
      searchUsers,
    ]);

    return ok({
      channels: channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        avatarUrl: ch.avatarUrl,
        isVerified: ch.isVerified,
        isPaid: ch.isPaidChannel,
        price: ch.subscriptionPrice,
        category: ch.colorLabel,
        level: ch.level,
        subscriberCount: ch._count.channelSubscribers,
        type: "channels" as const,
      })),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatarUrl: g.avatarUrl,
        category: g.colorLabel,
        level: g.level,
        memberCount: g._count.participants,
        type: "groups" as const,
      })),
      bots: bots.map((b) => ({
        id: b.id,
        name: b.name,
        username: b.username,
        description: b.description,
        avatarUrl: b.avatarUrl,
        creator: b.creator,
        type: "bots" as const,
      })),
      apps: apps.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.miniAppDescription,
        icon: a.miniAppIcon,
        category: a.miniAppCategory,
        rating: a.miniAppRating,
        installs: a.miniAppInstalls,
        version: a.miniAppVersion,
        developer: a.user.displayName,
        type: "apps" as const,
      })),
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        role: u.userRole,
        isPremium: u.premiumStatus === "active",
        type: "users" as const,
      })),
      counts: {
        channels: channels.length,
        groups: groups.length,
        bots: bots.length,
        apps: apps.length,
        users: users.length,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
