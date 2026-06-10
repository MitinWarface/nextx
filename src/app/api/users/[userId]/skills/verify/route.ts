import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  skill: z.string().min(1).max(100),
});

const deleteSchema = z.object({
  skill: z.string().min(1).max(100),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { userId } = await params;

    if (userId === me.id) throw new HttpError(400, "cannot_verify_own_skill");

    const body = postSchema.parse(await req.json());

    // Check target user exists
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    // Check if skill exists in user's skills array
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { skills: true },
    });
    if (!user?.skills.includes(body.skill)) {
      throw new HttpError(400, "skill_not_found_on_user");
    }

    // Upsert verification
    const verification = await prisma.skillVerification.upsert({
      where: {
        userId_skill_verifierId: {
          userId,
          skill: body.skill,
          verifierId: me.id,
        },
      },
      update: {},
      create: {
        userId,
        skill: body.skill,
        verifierId: me.id,
      },
    });

    return ok({
      verification: {
        id: verification.id,
        skill: verification.skill,
        createdAt: verification.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { userId } = await params;

    const body = deleteSchema.parse(await req.json());

    await prisma.skillVerification.deleteMany({
      where: {
        userId,
        skill: body.skill,
        verifierId: me.id,
      },
    });

    return ok({ success: true });
  } catch (err) {
    return fail(err);
  }
}
