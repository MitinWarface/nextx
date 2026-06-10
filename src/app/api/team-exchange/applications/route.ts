import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "sent"; // "sent" | "received"
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    if (tab === "sent") {
      const [applications, total] = await Promise.all([
        prisma.teamExchangeApplication.findMany({
          where: { applicantId: user!.id },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            listing: {
              include: {
                creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        }),
        prisma.teamExchangeApplication.count({ where: { applicantId: user!.id } }),
      ]);
      return ok({ applications, total, page, limit });
    }

    const [applications, total] = await Promise.all([
      prisma.teamExchangeApplication.findMany({
        where: { listing: { creatorId: user!.id } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          listing: { select: { id: true, title: true, type: true, category: true } },
        },
      }),
      prisma.teamExchangeApplication.count({ where: { listing: { creatorId: user!.id } } }),
    ]);
    return ok({ applications, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json();
    const { applicationId, status } = body as { applicationId: string; status: string };

    if (!applicationId) throw new HttpError(400, "applicationId_required");
    if (!status || !["accepted", "rejected"].includes(status)) throw new HttpError(400, "invalid_status");

    const application = await prisma.teamExchangeApplication.findUnique({
      where: { id: applicationId },
      include: { listing: true },
    });
    if (!application) throw new HttpError(404, "not_found");
    if (application.listing.creatorId !== user!.id) throw new HttpError(403, "forbidden");

    const updated = await prisma.teamExchangeApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    if (status === "accepted") {
      await prisma.teamExchange.update({
        where: { id: application.listingId },
        data: { status: "in_progress" },
      });
    }

    return ok({ application: updated });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
