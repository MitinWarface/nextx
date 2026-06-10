import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { proposalId } = await params;
    const proposal = await prisma.daoProposal.findUnique({
      where: { id: proposalId },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        votes: { include: { user: { select: { id: true, username: true, displayName: true } } } },
      },
    });
    if (!proposal) throw new HttpError(404, "not_found");

    return ok({ proposal });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
