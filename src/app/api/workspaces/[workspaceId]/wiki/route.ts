import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params;
    const pages = await prisma.wikiPage.findMany({
      where: { workspaceId },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return ok({ pages });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user!.id } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    const body = await req.json();
    const { title, content } = body as { title: string; content?: string };
    if (!title || title.length < 2) throw new HttpError(400, "title_too_short");

    const page = await prisma.wikiPage.create({
      data: { workspaceId, title, content: content ?? "", authorId: user!.id },
    });

    return created({ page });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const body = await req.json();
    const { pageId, title, content } = body as { pageId: string; title?: string; content?: string };
    if (!pageId) throw new HttpError(400, "pageId_required");

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user!.id } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;

    const page = await prisma.wikiPage.update({ where: { id: pageId }, data });
    return ok({ page });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const body = await req.json();
    const { pageId } = body as { pageId: string };
    if (!pageId) throw new HttpError(400, "pageId_required");

    const page = await prisma.wikiPage.findUnique({ where: { id: pageId } });
    if (!page || page.workspaceId !== workspaceId) throw new HttpError(404, "not_found");
    if (page.authorId !== user!.id) {
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user!.id } },
      });
      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        throw new HttpError(403, "forbidden");
      }
    }

    await prisma.wikiPage.delete({ where: { id: pageId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
