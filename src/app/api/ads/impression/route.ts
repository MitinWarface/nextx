import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser(cookieHeader);

    const body = await req.json();
    const { campaignId, clicked } = body as {
      campaignId: string;
      clicked?: boolean;
    };

    if (!campaignId) throw new HttpError(400, "campaignId_required");

    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.adCampaign.findUnique({
        where: { id: campaignId },
        select: { id: true, status: true, budget: true, spent: true, cpm: true },
      });
      if (!campaign) throw new HttpError(404, "campaign_not_found");
      if (campaign.status !== "active") throw new HttpError(400, "campaign_not_active");

      const costPerImpression = Math.ceil(campaign.cpm / 1000);
      if (campaign.spent + costPerImpression > campaign.budget) {
        await tx.adCampaign.update({
          where: { id: campaignId },
          data: { status: "completed" },
        });
        throw new HttpError(400, "budget_exhausted");
      }

      await tx.adImpression.create({
        data: {
          campaignId,
          userId: user?.id ?? null,
          clicked: clicked ?? false,
        },
      });

      await tx.adCampaign.update({
        where: { id: campaignId },
        data: {
          impressions: { increment: 1 },
          spent: { increment: costPerImpression },
          ...(clicked ? { clicks: { increment: 1 } } : {}),
        },
      });

      return { ok: true };
    });

    return ok(result);
  } catch (err) {
    return fail(err);
  }
}
