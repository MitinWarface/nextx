import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: identifier } = await params;
    const isUserId = identifier.length > 20 && !identifier.includes(" ");
    const user = await prisma.user.findUnique({
      where: isUserId ? { id: identifier } : { username: identifier },
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        website: true,
        socialLinks: true,
        accountType: true,
        publicId: true,
        reputation: true,
        createdAt: true,
        location: true,
        languages: true,
        skills: true,
        accentColor: true,
        premiumStatus: true,
        premiumUntil: true,
        userRole: true,
        roleBadge: true,
        developerApps: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            description: true,
            miniAppUrl: true,
            miniAppIcon: true,
            miniAppCategory: true,
            miniAppRating: true,
            miniAppInstalls: true,
          },
        },
        achievements: {
          select: {
            achievement: {
              select: {
                code: true,
                name: true,
                description: true,
                icon: true,
                category: true,
              },
            },
            unlockedAt: true,
          },
          orderBy: { unlockedAt: "desc" },
        },
        receivedGifts: {
          select: {
            id: true,
            name: true,
            emoji: true,
            rarity: true,
            type: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        participants: {
          where: {
            chat: { type: "CHANNEL", isArchived: false },
          },
          select: {
            chat: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                description: true,
                level: true,
                experience: true,
                _count: {
                  select: { participants: true },
                },
              },
            },
          },
          orderBy: { chat: { lastMessageAt: "desc" } },
          take: 5,
        },
        ownedSkillVerifications: {
          select: {
            skill: true,
            verifier: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const recentMessages = await prisma.message.findMany({
      where: {
        senderId: user.id,
        type: "TEXT",
        isDeleted: false,
        chat: { type: "CHANNEL" },
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        chat: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const skillMap = new Map<string, { count: number; verifiers: Array<{ id: string; displayName: string; avatarUrl: string | null }> }>();
    for (const sv of user.ownedSkillVerifications) {
      const existing = skillMap.get(sv.skill) ?? { count: 0, verifiers: [] };
      existing.count++;
      existing.verifiers.push(sv.verifier);
      skillMap.set(sv.skill, existing);
    }
    const skillVerifications = Array.from(skillMap.entries()).map(([skill, data]) => ({
      skill,
      ...data,
    }));

    const { ownedSkillVerifications, ...userWithoutVerifications } = user;

    return ok({
      ...userWithoutVerifications,
      skillVerifications,
      recentActivity: recentMessages,
    });
  } catch (err) {
    return fail(err);
  }
}
