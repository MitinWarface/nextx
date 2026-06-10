import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { builderConfig: true },
    });

    return ok({ config: fullUser?.builderConfig ?? null });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await req.json();
    const { config } = body as { config: any };

    if (!config || typeof config !== "object") {
      throw new HttpError(400, "config_required");
    }

    // Validate config structure
    const validSections = ["about", "links", "gallery", "skills", "contact"];
    if (config.sections && !Array.isArray(config.sections)) {
      throw new HttpError(400, "sections_must_be_array");
    }

    if (config.sections) {
      for (const section of config.sections) {
        if (!validSections.includes(section.type)) {
          throw new HttpError(400, `invalid_section_type: ${section.type}`);
        }
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { builderConfig: JSON.parse(JSON.stringify(config)) },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
