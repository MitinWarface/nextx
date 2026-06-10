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
      select: {
        customDomain: true,
        domainVerified: true,
      },
    });

    return ok({
      domain: fullUser?.customDomain ?? null,
      verified: fullUser?.domainVerified ?? false,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await req.json();
    const { domain } = body as { domain: string };

    if (!domain || domain.trim().length === 0) {
      throw new HttpError(400, "domain_required");
    }

    const cleanDomain = domain.trim().toLowerCase();

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(cleanDomain)) {
      throw new HttpError(400, "invalid_domain_format");
    }

    const existing = await prisma.user.findFirst({
      where: {
        customDomain: cleanDomain,
        id: { not: user.id },
      },
      select: { id: true },
    });
    if (existing) {
      throw new HttpError(409, "domain_already_taken");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        customDomain: cleanDomain,
        domainVerified: false,
      },
    });

    return ok({
      ok: true,
      message: "Domain set. Add a CNAME record pointing to nextx.app to verify.",
      domain: cleanDomain,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await req.json();
    const { action } = body as { action: string };

    if (action === "verify") {
      // In production, this would do a DNS lookup for CNAME record
      // For now, simulate verification
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { customDomain: true },
      });

      if (!fullUser?.customDomain) {
        throw new HttpError(400, "no_domain_set");
      }

      // TODO: Implement actual DNS verification
      // For now, mark as verified for demo purposes
      await prisma.user.update({
        where: { id: user.id },
        data: { domainVerified: true },
      });

      return ok({ ok: true, verified: true });
    }

    throw new HttpError(400, "invalid_action");
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        customDomain: null,
        domainVerified: false,
      },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
