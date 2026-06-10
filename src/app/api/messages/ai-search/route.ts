/**
 * POST /api/messages/ai-search — AI-powered semantic search
 * Premium-gated (requires "ai_chat" feature)
 * Uses OpenAI to expand query into related terms, then PostgreSQL FTS + ILIKE
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

export const dynamic = "force-dynamic";

const searchSchema = z.object({
  chatId: z.string().optional(),
  query: z.string().min(2).max(500),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).optional().default(30),
});

async function expandQuery(query: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [query];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a search query expander. Given a search query, return 5-10 related search terms as a JSON array of strings. Include synonyms, related concepts, and Russian equivalents if the query is in Russian. Return ONLY the JSON array, no explanations. Example: ["term1", "term2", "term3"]`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!res.ok) return [query];

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return [query];

    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [query];

    const terms: string[] = JSON.parse(match[0]);
    const unique = new Set<string>([query, ...terms]);
    return [...unique].slice(0, 10);
  } catch {
    return [query];
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    if (!(await hasFeature(user.id, "ai_chat"))) {
      throw new HttpError(403, "premium_required");
    }

    const body = await parseJson(req, searchSchema);
    const { chatId, query, dateRange } = body;
    const limit = body.limit ?? 30;

    // Step 1: Expand query with AI
    const expandedTerms = await expandQuery(query);

    // Step 2: Build search conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (chatId) {
      conditions.push(`m."chatId" = $${paramIdx}`);
      params.push(chatId);
      paramIdx++;

      const participant = await prisma.participant.findUnique({
        where: { chatId_userId: { chatId, userId: user.id } },
      });
      if (!participant) throw new HttpError(403, "not_participant");
    }

    if (dateRange?.from) {
      conditions.push(`m."createdAt" >= $${paramIdx}`);
      params.push(new Date(dateRange.from));
      paramIdx++;
    }
    if (dateRange?.to) {
      conditions.push(`m."createdAt" <= $${paramIdx}`);
      params.push(new Date(dateRange.to));
      paramIdx++;
    }

    // Step 3: FTS + ILIKE with expanded terms
    const tsQueryStr = expandedTerms
      .map((t) => t.replace(/[^\wа-яА-ЯёЁ0-9]/g, " ").trim())
      .filter(Boolean)
      .join(" | ");

    if (tsQueryStr) {
      conditions.push(`(
        plainto_tsquery('russian', $${paramIdx}) @@ to_tsvector('russian', COALESCE(m."content", ''))
        OR m."content" ILIKE '%' || $${paramIdx + 1} || '%'
      )`);
      params.push(tsQueryStr, query);
      paramIdx += 2;
    }

    conditions.push(`m."isDeleted" = false`);

    conditions.push(`(
      m."visibleToUserIds" = '{}'::text[]
      OR m."visibleToUserIds" @> ARRAY[$${paramIdx}]::text[]
      OR m."senderId" = $${paramIdx}
    )`);
    params.push(user.id);
    paramIdx++;

    conditions.push(`m."type" NOT IN ('CALL', 'CALL_MISSED', 'CALL_ENDED', 'STICKER')`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit);
    const sql = `
      SELECT m."id", m."chatId", m."senderId", m."type", m."content", m."mediaUrl",
             m."createdAt", m."updatedAt"
      FROM "Message" m
      ${whereClause}
      ORDER BY m."createdAt" DESC
      LIMIT $${paramIdx}
    `;

    const results = await prisma.$queryRawUnsafe<
      { id: string; chatId: string; senderId: string; type: string; content: string | null; mediaUrl: string | null; createdAt: Date; updatedAt: Date }[]
    >(sql, ...params);

    const senderIds = [...new Set(results.map((r) => r.senderId))];
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const senderMap = new Map(senders.map((s) => [s.id, s]));

    const enriched = results.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      sender: senderMap.get(r.senderId) ?? null,
    }));

    return ok({
      results: enriched,
      expandedQuery: expandedTerms.join(", "),
      termCount: expandedTerms.length,
    });
  } catch (err) {
    return fail(err);
  }
}
