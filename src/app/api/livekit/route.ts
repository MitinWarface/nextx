import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getCurrentUser } from "@/lib/auth";
import { requireUser } from "@/lib/api-helpers";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY || !API_SECRET) {
      return NextResponse.json({ error: "livekit_not_configured" }, { status: 503 });
    }

    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { room, identity, name } = await req.json();

    if (!room || !identity) {
      return NextResponse.json({ error: "room and identity required" }, { status: 400 });
    }

    if (identity !== user.id) {
      return NextResponse.json({ error: "identity must match authenticated user" }, { status: 403 });
    }

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      name: name || user.displayName,
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (e: any) {
    console.error("[livekit] token error:", e?.message);
    return NextResponse.json({ error: "token_generation_failed" }, { status: 500 });
  }
}
