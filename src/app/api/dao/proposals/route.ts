import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const chatId = req.nextUrl.searchParams.get("chatId");
    if (!chatId) throw new HttpError(400, "chatId required");

    const proposals = await prisma.daoProposal.findMany({
      where: { chatId },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        votes: { select: { userId: true, option: true, weight: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ proposals });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const { chatId, title, description, options, endsAt } = body;

    if (!chatId || !title || !description || !endsAt) {
      throw new HttpError(400, "chatId, title, description, endsAt required");
    }

    const proposal = await prisma.daoProposal.create({
      data: {
        chatId,
        creatorId: user!.id,
        title,
        description,
        options: options ?? ["Yes", "No", "Abstain"],
        endsAt: new Date(endsAt),
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        votes: { select: { userId: true, option: true, weight: true } },
      },
    });

    return ok({ proposal });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
