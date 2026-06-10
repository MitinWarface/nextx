import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const userId = user.id as string;

    const entries = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        device: true,
        ipAddress: true,
        country: true,
        city: true,
        success: true,
        reason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[login-history]", error);
    return NextResponse.json({ entries: [] });
  }
}
