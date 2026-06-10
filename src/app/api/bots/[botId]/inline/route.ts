/**
 * POST /api/bots/[botId]/inline — query inline bot results
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const querySchema = z.object({
  query: z.string().min(1).max(100),
  offset: z.string().optional(),
});

interface InlineResult {
  id: string;
  type: string;
  title: string;
  description: string;
  thumbnail_url: string;
  content: string;
}

function generateMockResults(botUsername: string, query: string): InlineResult[] {
  const q = query.toLowerCase();

  if (botUsername.includes("weather") || botUsername.includes("погод")) {
    const cities: Record<string, string> = {
      москва: "Москва: +22°C, ясно",
      "санкт-петербург": "СПб: +18°C, облачно",
      лондон: "Лондон: +15°C, дождь",
      ньюйорк: "NYC: +25°C, солнечно",
      токио: "Токио: +28°C, жарко",
    };
    const city = Object.keys(cities).find((c) => q.includes(c)) ?? (query || "город");
    const temp = Math.floor(Math.random() * 30) + 5;
    const conditions = ["ясно", "облачно", "дождь", "снег", "ветрено"];
    const cond = conditions[Math.floor(Math.random() * conditions.length)];
    return [
      {
        id: "weather-1",
        type: "article",
        title: `Погода: ${city}`,
        description: `${temp > 0 ? "+" : ""}${temp}°C, ${cond}`,
        thumbnail_url: "https://cdn-icons-png.flaticon.com/512/1779/1779940.png",
        content: `Погода в ${city}: ${temp > 0 ? "+" : ""}${temp}°C, ${cond}`,
      },
    ];
  }

  if (botUsername.includes("translat") || botUsername.includes("перевод")) {
    return [
      {
        id: "translate-1",
        type: "article",
        title: `Перевод: "${query}"`,
        description: "EN → RU",
        thumbnail_url: "https://cdn-icons-png.flaticon.com/512/1779/1779525.png",
        content: `[Перевод] ${query} → [переведённый текст]`,
      },
    ];
  }

  if (botUsername.includes("search") || botUsername.includes("поиск")) {
    return [
      {
        id: "search-1",
        type: "article",
        title: `Результаты: "${query}"`,
        description: "Найдено в интернете",
        thumbnail_url: "https://cdn-icons-png.flaticon.com/512/1779/1779347.png",
        content: `Результаты поиска для "${query}": https://example.com/search?q=${encodeURIComponent(query)}`,
      },
      {
        id: "search-2",
        type: "article",
        title: `Википедия: "${query}"`,
        description: "Из Википедии",
        thumbnail_url: "https://cdn-icons-png.flaticon.com/512/1779/1779347.png",
        content: `Из Википедии: ${query} — это концепция, описывающая...`,
      },
    ];
  }

  return [
    {
      id: "result-1",
      type: "article",
      title: `Результат для "${query}"`,
      description: "Результат от бота",
      thumbnail_url: "https://cdn-icons-png.flaticon.com/512/1779/1779940.png",
      content: `Бот ${botUsername} вернул: ${query}`,
    },
  ];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { botId } = await params;
    const body = await parseJson(req, querySchema);

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw new HttpError(404, "bot_not_found");

    const results = generateMockResults(bot.username, body.query);

    return ok({
      results,
      next_offset: null,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
