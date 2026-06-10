import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ adId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);

    const { adId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.adCampaign.findUnique({
        where: { id: adId },
        select: { id: true, status: true, budget: true, spent: true, cpm: true },
      });

      if (!campaign) throw new HttpError(404, "campaign_not_found");
      if (campaign.status !== "active") throw new HttpError(400, "campaign_not_active");

      const costPerClick = Math.ceil(campaign.cpm / 100);
      if (campaign.spent + costPerClick > campaign.budget) {
        await tx.adCampaign.update({
          where: { id: adId },
          data: { status: "completed" },
        });
        throw new HttpError(400, "budget_exhausted");
      }

      await tx.adImpression.create({
        data: {
          campaignId: adId,
          userId: user?.id ?? null,
          clicked: true,
        },
      });

      await tx.adCampaign.update({
        where: { id: adId },
        data: {
          clicks: { increment: 1 },
          spent: { increment: costPerClick },
        },
      });

      return { ok: true };
    });

    return ok(result);
  } catch (err) {
    return fail(err);
  }
}
