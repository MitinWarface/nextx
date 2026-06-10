/**
 * GET  /api/developer/apps — list user's developer apps
 * POST /api/developer/apps — create a new app
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError, created, requireUser } from "@/lib/api-helpers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateApiKey(): string {
  return `nx_${crypto.randomBytes(32).toString("hex")}`;
}

const createAppSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  webhookUrl: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;

    const apps = await prisma.developerApp.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { logs: true } },
      },
    });

    return ok({ apps });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const body = await parseJson(req, createAppSchema);

    const apiKey = generateApiKey();

    const app = await prisma.developerApp.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description ?? null,
        webhookUrl: body.webhookUrl ?? null,
        apiKey,
      },
    });

    return created({ app });
  } catch (err) {
    return fail(err);
  }
}
