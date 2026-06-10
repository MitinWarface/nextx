/**
 * GET  /api/business/[businessId]/crm — list contacts
 * POST /api/business/[businessId]/crm — create contact
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
    const search = searchParams.get("search") || "";
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");

    const contacts = await prisma.crmContact.findMany({
      where: {
        businessId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { deals: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return ok({ contacts });
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
    const { businessId } = await params;
    const body = await parseJson(req, createSchema);

    const contact = await prisma.crmContact.create({
      data: {
        businessId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        notes: body.notes,
        tags: body.tags ?? [],
      },
    });

    return ok({ contact });
  } catch (err) {
    return fail(err);
  }
}
