import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

const FREE_STICKER_LIMIT = 20;

// GET /api/stickers  — список моих стикеров
export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const stickers = await prisma.sticker.findMany({
      where: { ownerId: me.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, emoji: true, mediaUrl: true, packName: true, createdAt: true },
    });
    return ok({ stickers });
  } catch (err) {
    return fail(err);
  }
}

// POST /api/stickers  — загрузить новый стикер
// Body: multipart с полем `file` и опциональным `emoji` + `packName`
export async function POST(req: Request) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const isPremium = await hasFeature(me.id, "premium_stickers");

    if (!isPremium) {
      const count = await prisma.sticker.count({ where: { ownerId: me.id } });
      if (count >= FREE_STICKER_LIMIT) {
        return fail({
          status: 403,
          message: `Лимит ${FREE_STICKER_LIMIT} стикеров. Расширьте Premium для неограниченного количества.`,
        });
      }
    }

    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "image_required" }, { status: 400 });
    }
    const uploadsFd = new FormData();
    uploadsFd.append("file", file);
    const origin = new URL(req.url).origin;
    const cookies = req.headers.get("cookie") ?? "";
    const upRes = await fetch(`${origin}/api/uploads`, {
      method: "POST",
      body: uploadsFd,
      headers: { cookie: cookies },
    });
    if (!upRes.ok) {
      return NextResponse.json({ error: "upload_failed" }, { status: 502 });
    }
    const upData = (await upRes.json()) as { url: string };
    const emoji = (fd.get("emoji") as string | null) ?? null;
    const packName = (fd.get("packName") as string | null) ?? "Мои стикеры";
    const sticker = await prisma.sticker.create({
      data: {
        ownerId: me.id,
        mediaUrl: upData.url,
        emoji: emoji || null,
        packName,
      },
      select: { id: true, emoji: true, mediaUrl: true, packName: true, createdAt: true },
    });
    return ok({ sticker });
  } catch (err) {
    return fail(err);
  }
}
