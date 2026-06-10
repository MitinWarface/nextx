import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";
import dns from "dns/promises";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { customDomain: true, username: true },
    });

    if (!fullUser?.customDomain) throw new HttpError(400, "no_domain_set");

    const domain = fullUser.customDomain;
    const expected = `nextx.app`;

    try {
      const txtRecords = await dns.resolveTxt(domain);
      const found = txtRecords.some(
        (records) => records.some((r) => r.includes(`nextx-verify=${fullUser.username}`)),
      );

      if (found) {
        await prisma.user.update({
          where: { id: user.id },
          data: { domainVerified: true },
        });
        return ok({ verified: true });
      }
    } catch {
      // DNS lookup failed, try CNAME
    }

    try {
      const cnameRecords = await dns.resolveCname(domain);
      const found = cnameRecords.some((r) => r === "nextx.app");

      if (found) {
        await prisma.user.update({
          where: { id: user.id },
          data: { domainVerified: true },
        });
        return ok({ verified: true });
      }
    } catch {
      // CNAME lookup failed
    }

    return ok({
      verified: false,
      instructions: {
        txt: `Add TXT record: nextx-verify=${fullUser.username}`,
        cname: `Add CNAME record: ${domain} → nextx.app`,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
