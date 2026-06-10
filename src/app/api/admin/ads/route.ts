import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));
    const status = searchParams.get("status") ?? undefined;
    const channelId = searchParams.get("channelId") ?? undefined;

    const where: any = {};
    if (status) where.status = status;
    if (channelId) where.channelId = channelId;

    const [campaigns, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          channelId: true,
          creatorId: true,
          budget: true,
          spent: true,
          cpm: true,
          status: true,
          startAt: true,
          endAt: true,
          impressions: true,
          clicks: true,
          createdAt: true,
          channel: { select: { id: true, name: true } },
          creator: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.adCampaign.count({ where }),
    ]);

    return ok({ campaigns, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { channelId, title, budget, cpm, startAt, endAt } = body as {
      channelId: string;
      title: string;
      budget: number;
      cpm: number;
      startAt?: string;
      endAt?: string;
    };

    if (!channelId || !title || !budget || !cpm) {
      throw new HttpError(400, "missing_required_fields");
    }

    const channel = await prisma.chat.findUnique({
      where: { id: channelId },
      select: { id: true, type: true },
    });
    if (!channel || channel.type !== "CHANNEL") {
      throw new HttpError(404, "channel_not_found");
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        channelId,
        creatorId: admin.id,
        title,
        budget,
        cpm,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
      },
    });

    await logAudit(admin.id, "SETTINGS_CHANGE", `ad:${campaign.id}`, {
      action: "create_campaign",
      title,
    });

    return ok({ campaign });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { campaignId, status, budget, cpm } = body as {
      campaignId: string;
      status?: string;
      budget?: number;
      cpm?: number;
    };

    if (!campaignId) throw new HttpError(400, "campaignId_required");

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });
    if (!campaign) throw new HttpError(404, "campaign_not_found");

    const updates: any = {};
    if (status) updates.status = status;
    if (budget !== undefined) updates.budget = budget;
    if (cpm !== undefined) updates.cpm = cpm;

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_updates");
    }

    await prisma.adCampaign.update({ where: { id: campaignId }, data: updates });

    await logAudit(admin.id, "SETTINGS_CHANGE", `ad:${campaignId}`, {
      action: "update_campaign",
      ...updates,
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) throw new HttpError(400, "campaignId_required");

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, title: true },
    });
    if (!campaign) throw new HttpError(404, "campaign_not_found");

    await prisma.adCampaign.delete({ where: { id: campaignId } });

    await logAudit(admin.id, "SETTINGS_CHANGE", `ad:${campaignId}`, {
      action: "delete_campaign",
      title: campaign.title,
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
