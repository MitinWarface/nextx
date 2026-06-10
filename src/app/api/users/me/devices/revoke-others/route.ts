import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const userId = user.id as string;

    const devices = await prisma.device.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastActivity: "desc" },
    });

    if (devices.length <= 1) {
      return NextResponse.json({ message: "no_other_devices" });
    }

    const currentDevice = devices[0];
    const otherDeviceIds = devices.slice(1).map((d) => d.id);

    await prisma.device.updateMany({
      where: { id: { in: otherDeviceIds } },
      data: { isRevoked: true },
    });

    return NextResponse.json({ message: "done", revoked: otherDeviceIds.length });
  } catch (error) {
    console.error("[revoke-others]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
