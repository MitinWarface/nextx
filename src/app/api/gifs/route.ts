/**
 * GET /api/gifs?q=...&limit=20&offset=0
 * Proxy to Giphy API (public beta key)
 */
import type { NextRequest } from "next/server";

const GIPHY_KEY = "dc6zaTOxFJmzC"; // Public beta key
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 50);
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);

  const endpoint = q
    ? `${GIPHY_BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=g&lang=ru`
    : `${GIPHY_BASE}/trending?api_key=${GIPHY_KEY}&limit=${limit}&offset=${offset}&rating=g`;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 300 } });
    const data = await res.json();
    const gifs = (data.data ?? []).map((g: Record<string, unknown>) => {
      const images = g.images as Record<string, Record<string, string>> | undefined;
      const original = images?.original ?? {};
      const fixedHeight = images?.fixed_height ?? {};
      const preview = images?.fixed_height_small ?? {};
      return {
        id: g.id,
        title: g.title ?? "",
        url: original.url ?? "",
        width: Number(original.width) || 480,
        height: Number(original.height) || 270,
        previewUrl: preview.url ?? fixedHeight.url ?? "",
        previewWidth: Number(preview.width) || Number(fixedHeight.width) || 200,
        previewHeight: Number(preview.height) || Number(fixedHeight.height) || 112,
      };
    });
    return Response.json({ gifs, total: data.pagination?.total_count ?? 0 });
  } catch {
    return Response.json({ gifs: [], total: 0 }, { status: 502 });
  }
}
