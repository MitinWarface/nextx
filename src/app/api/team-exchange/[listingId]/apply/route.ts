import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { listingId } = await params;
    const listing = await prisma.teamExchange.findUnique({ where: { id: listingId } });
    if (!listing) throw new HttpError(404, "not_found");
    if (listing.status !== "open") throw new HttpError(400, "listing_not_open");
    if (listing.creatorId === user!.id) throw new HttpError(400, "cannot_apply_own");

    const body = await req.json();
    const { message } = body as { message?: string };

    const existing = await prisma.teamExchangeApplication.findUnique({
      where: { listingId_applicantId: { listingId, applicantId: user!.id } },
    });
    if (existing) throw new HttpError(409, "already_applied");

    const application = await prisma.teamExchangeApplication.create({
      data: {
        listingId,
        applicantId: user!.id,
        message: message ?? null,
      },
    });

    return created({ application });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
