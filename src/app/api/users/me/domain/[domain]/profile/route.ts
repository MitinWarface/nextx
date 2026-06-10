import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;

    const user = await prisma.user.findFirst({
      where: {
        customDomain: domain,
        domainVerified: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        website: true,
        socialLinks: true,
        accountType: true,
        publicId: true,
        reputation: true,
        statusEmoji: true,
        statusText: true,
        customStatus: true,
        location: true,
        languages: true,
        createdAt: true,
        builderConfig: true,
      },
    });

    if (!user) throw new HttpError(404, "profile_not_found");

    return ok({
      profile: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        domain,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
