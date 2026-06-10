/**
 * GET /api/messages/search?q=...&limit=...&chatId=...&fromUserId=...&dateFrom=...&dateTo=...
 * Глобальный поиск сообщений с фильтрами.
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchMessages } from "@/services/search-service";
import { fail, ok, requireUser } from "@/lib/api-helpers";
import { withRateLimit } from "@/lib/api-helpers/rate-limit-wrapper";
import { RATE_LIMITS } from "@/lib/rate-limit";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);
    const chatId = searchParams.get("chatId") ?? undefined;
    const fromUserId = searchParams.get("fromUserId") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    if (q.length < 2 && !chatId) {
      return ok({ results: [] });
    }
    const results = await searchMessages({
      userId: user!.id,
      query: q,
      limit,
      chatId,
      fromUserId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    return ok({ results });
  } catch (err) {
    return fail(err);
  }
}, RATE_LIMITS.search);

export const dynamic = "force-dynamic";
