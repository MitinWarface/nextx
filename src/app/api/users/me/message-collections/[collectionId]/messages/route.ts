/**
 * GET    /api/users/me/message-collections/[collectionId]/messages — get messages in collection (paginated)
 * POST   /api/users/me/message-collections/[collectionId]/messages — add message to collection
 * DELETE /api/users/me/message-collections/[collectionId]/messages — remove message from collection
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, noContent, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const addMessageSchema = z.object({
  messageId: z.string().min(1),
  chatId: z.string().min(1),
});

const removeMessageSchema = z.object({
  messageId: z.string().min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { collectionId } = await params;
    const collection = await prisma.messageCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== user!.id) {
      throw new HttpError(404, "collection_not_found");
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const items = await prisma.messageCollectionItem.findMany({
      where: { collectionId },
      include: {
        collection: {
          select: { id: true, name: true, emoji: true },
        },
      },
      orderBy: { addedAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = items.length > limit;
    const messages = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    return ok({
      messages,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { collectionId } = await params;
    const collection = await prisma.messageCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== user!.id) {
      throw new HttpError(404, "collection_not_found");
    }

    const body = await parseJson(req, addMessageSchema);

    // Check if message already exists in collection
    const existing = await prisma.messageCollectionItem.findUnique({
      where: {
        collectionId_messageId: {
          collectionId,
          messageId: body.messageId,
        },
      },
    });

    if (existing) {
      throw new HttpError(409, "message_already_in_collection");
    }

    const item = await prisma.messageCollectionItem.create({
      data: {
        collectionId,
        messageId: body.messageId,
        chatId: body.chatId,
      },
    });

    return created({ item });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { collectionId } = await params;
    const collection = await prisma.messageCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== user!.id) {
      throw new HttpError(404, "collection_not_found");
    }

    const body = await parseJson(req, removeMessageSchema);

    const item = await prisma.messageCollectionItem.findUnique({
      where: {
        collectionId_messageId: {
          collectionId,
          messageId: body.messageId,
        },
      },
    });

    if (!item) {
      throw new HttpError(404, "message_not_in_collection");
    }

    await prisma.messageCollectionItem.delete({
      where: { id: item.id },
    });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}