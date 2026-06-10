import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";
import { isPremiumActive } from "@/lib/premium";

export const dynamic = "force-dynamic";

function generateVirtualNumber(): string {
  const segment = () => {
    let s = "";
    for (let i = 0; i < 7; i++) {
      s += Math.floor(Math.random() * 10).toString();
    }
    return s;
  };
  return `+NX-${segment()}`;
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { virtualNumber: true },
    });

    return ok({ virtualNumber: full?.virtualNumber ?? null });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const premium = await isPremiumActive(user.id);
    if (!premium) throw new HttpError(403, "premium_required");

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { virtualNumber: true },
    });

    if (existing?.virtualNumber) {
      return ok({ virtualNumber: existing.virtualNumber });
    }

    let number: string;
    let attempts = 0;
    do {
      number = generateVirtualNumber();
      attempts++;
    } while (attempts < 10);

    const collision = await prisma.user.findFirst({
      where: { virtualNumber: number },
      select: { id: true },
    });
    if (collision) throw new HttpError(409, "number_collision_retry");

    await prisma.user.update({
      where: { id: user.id },
      data: { virtualNumber: number },
    });

    return ok({ virtualNumber: number });
  } catch (err) {
    return fail(err);
  }
}
