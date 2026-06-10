/**
 * GET /api/premium — current user's premium info
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getPremiumInfo } from "@/lib/premium";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const info = await getPremiumInfo(user!.id);
    return ok(info);
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
