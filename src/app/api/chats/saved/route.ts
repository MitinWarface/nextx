import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSelfChat } from "@/lib/service-chat";
import { ok, fail } from "@/lib/api-helpers";

// Спецчат «Избранное» — SELF-чат с самим собой
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const chat = await getSelfChat(user.id);
    if (!chat) return NextResponse.json({ error: "self_chat_not_found" }, { status: 500 });
    return ok({ chatId: chat.id });
  } catch (err) {
    return fail(err);
  }
}
