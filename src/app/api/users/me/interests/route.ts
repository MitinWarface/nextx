import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const postSchema = z.object({
  interests: z
    .array(z.string().min(2).max(50))
    .max(20)
    .refine((arr) => new Set(arr).size === arr.length, "duplicate_interests"),
});

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = await prisma.user.findUnique({
      where: { id: currentUser!.id },
      select: { interests: true },
    });
    return ok({ interests: user?.interests ?? [] });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const body = await parseJson(req, postSchema);
    await prisma.user.update({
      where: { id: currentUser!.id },
      data: { interests: body.interests },
    });
    return ok({ interests: body.interests });
  } catch (err) {
    return fail(err);
  }
}
