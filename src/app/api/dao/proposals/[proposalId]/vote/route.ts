import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const { option } = body;
    if (!option) throw new HttpError(400, "option required");

    const { proposalId } = await params;
    const proposal = await prisma.daoProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new HttpError(404, "not_found");
    if (proposal.status !== "active") throw new HttpError(400, "proposal_not_active");
    if (new Date() > proposal.endsAt) throw new HttpError(400, "proposal_ended");

    const wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    const weight = Math.floor((wallet?.balance ?? 0) / 100_000_000);

    const vote = await prisma.daoVote.upsert({
      where: { proposalId_userId: { proposalId, userId: user!.id } },
      update: { option, weight },
      create: { proposalId, userId: user!.id, option, weight },
    });

    return ok({ vote });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
