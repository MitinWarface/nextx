/**
 * GET /api/channels — public channel catalog with search and category filters
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const offset = Number(searchParams.get("offset") ?? "0");

    const where: any = {
      type: "CHANNEL",
      isArchived: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.colorLabel = category;
    }

    const channels = await prisma.chat.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        colorLabel: true,
        isVerified: true,
        isPaidChannel: true,
        subscriptionPrice: true,
        level: true,
        experience: true,
        lastMessageAt: true,
        createdAt: true,
        _count: {
          select: { channelSubscribers: true, messages: true },
        },
      },
    });

    const total = await prisma.chat.count({ where });

    return ok({
      channels: channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        avatarUrl: ch.avatarUrl,
        category: ch.colorLabel,
        isVerified: ch.isVerified,
        isPaid: ch.isPaidChannel,
        price: ch.subscriptionPrice,
        level: ch.level,
        subscriberCount: ch._count.channelSubscribers,
        messageCount: ch._count.messages,
        lastPostAt: ch.lastMessageAt,
        createdAt: ch.createdAt,
      })),
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    return fail(err);
  }
}
