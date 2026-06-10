import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);

    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: "active",
        startAt: { lte: new Date() },
        OR: [
          { endAt: null },
          { endAt: { gte: new Date() } },
        ],
      },
      select: {
        id: true,
        title: true,
        budget: true,
        spent: true,
        cpm: true,
        targeting: true,
        channel: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (campaigns.length === 0) return ok({ ad: null });

    const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];

    await prisma.adImpression.create({
      data: {
        campaignId: campaign.id,
        userId: user?.id ?? null,
        clicked: false,
      },
    });

    const costPerImpression = Math.ceil(campaign.cpm / 1000);
    await prisma.adCampaign.update({
      where: { id: campaign.id },
      data: {
        impressions: { increment: 1 },
        spent: { increment: costPerImpression },
      },
    });

    return ok({ ad: campaign });
  } catch (err) {
    return fail(err);
  }
}
