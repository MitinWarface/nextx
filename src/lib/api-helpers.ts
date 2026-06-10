/**
 * Утилиты для API-роутов: единый формат ответов и ошибок.
 */
import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function fail(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "validation_failed", issues: err.issues },
      { status: 422 },
    );
  }
  if (
    err !== null &&
    typeof err === "object" &&
    "status" in err &&
    "message" in err &&
    typeof (err as any).status === "number" &&
    typeof (err as any).message === "string"
  ) {
    return NextResponse.json(
      { error: (err as any).message },
      { status: (err as any).status },
    );
  }
  console.error("[api]", err);
  return NextResponse.json(
    { error: "internal_error" },
    { status: 500 },
  );
}

export async function parseJson<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<T> {
  const body = await req.json().catch(() => {
    throw new HttpError(400, "invalid_json");
  });
  return schema.parse(body);
}

export function requireUser(userId: string | null | undefined): asserts userId is string {
  if (!userId) throw new HttpError(401, "unauthorized");
}
