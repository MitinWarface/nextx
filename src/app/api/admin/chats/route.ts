import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? "";
    const skip = (page - 1) * limit;

    const where = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { messages: true, participants: true } },
        },
      }),
      prisma.chat.count({ where }),
    ]);

    return NextResponse.json({ data: { chats, total, page, limit } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unauthorized" }, { status: err.status ?? 500 });
  }
}
