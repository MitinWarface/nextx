import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser(_request.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        type: true,
        latitude: true,
        longitude: true,
        locationName: true,
        liveLocationMinutes: true,
        liveLocationExpiresAt: true,
        senderId: true,
        chatId: true,
      },
    });

    if (!message || message.type !== "LOCATION") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: message.chatId, userId: user.id } },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    const isExpired =
      message.liveLocationExpiresAt &&
      new Date(message.liveLocationExpiresAt) < new Date();

    return ok({
      latitude: message.latitude,
      longitude: message.longitude,
      locationName: message.locationName,
      liveLocationMinutes: message.liveLocationMinutes,
      liveLocationExpiresAt: message.liveLocationExpiresAt,
      isExpired: !!isExpired,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser(request.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const { messageId } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      throw new HttpError(400, "invalid_payload");
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        type: true,
        senderId: true,
        chatId: true,
        liveLocationMinutes: true,
        liveLocationExpiresAt: true,
      },
    });

    if (!message || message.type !== "LOCATION") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (message.senderId !== user.id) {
      throw new HttpError(403, "not_sender");
    }

    if (!message.liveLocationMinutes || message.liveLocationMinutes <= 0) {
      throw new HttpError(400, "not_live");
    }

    if (
      message.liveLocationExpiresAt &&
      new Date(message.liveLocationExpiresAt) < new Date()
    ) {
      throw new HttpError(410, "expired");
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        latitude: body.latitude,
        longitude: body.longitude,
        ...(body.locationName ? { locationName: body.locationName } : {}),
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        locationName: true,
        liveLocationExpiresAt: true,
      },
    });

    return ok({
      latitude: updated.latitude,
      longitude: updated.longitude,
      locationName: updated.locationName,
      liveLocationExpiresAt: updated.liveLocationExpiresAt,
    });
  } catch (err) {
    return fail(err);
  }
}
