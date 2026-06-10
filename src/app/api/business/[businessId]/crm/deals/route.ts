/**
 * GET  /api/business/[businessId]/crm/deals — list deals
 * POST /api/business/[businessId]/crm/deals — create deal
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  contactId: z.string().min(1),
  title: z.string().min(1).max(200),
  amount: z.number().int().positive().optional(),
  status: z.enum(["lead", "negotiation", "closed_won", "closed_lost"]).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { businessId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const deals = await prisma.crmDeal.findMany({
      where: {
        contact: { businessId },
        ...(status ? { status } : {}),
      },
      include: { contact: true },
      orderBy: { createdAt: "desc" },
    });

    return ok({ deals });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, createSchema);

    const deal = await prisma.crmDeal.create({
      data: {
        contactId: body.contactId,
        title: body.title,
        amount: body.amount,
        status: body.status ?? "lead",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: { contact: true },
    });

    return ok({ deal });
  } catch (err) {
    return fail(err);
  }
}
