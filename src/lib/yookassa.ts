/**
 * YooKassa API client — создание платежей и вебхуков.
 * Документация: https://yookassa.ru/developers/api
 */

const YOOKASSA_BASE = "https://api.yookassa.ru/v3";
const SHOP_ID = process.env.YOOKASSA_SHOP_ID ?? "";
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY ?? "";

export interface YooKassaPayment {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url: string };
  capture: boolean;
  created_at: string;
  metadata?: Record<string, string>;
}

export interface YooKassaWebhookEvent {
  type: "payment.succeeded" | "payment.canceled" | "payment.waiting_for_capture";
  event: {
    id: string;
    status: string;
    amount: { value: string; currency: string };
    metadata?: Record<string, string>;
    paid?: boolean;
  };
}

function authHeaders(idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return headers;
}

/**
 * Создать платёж в YooKassa.
 * Возвращает confirmation_url для редиректа пользователя.
 */
export async function createPayment(params: {
  amountKopecks: number;
  description: string;
  metadata: Record<string, string>;
  return_url: string;
}): Promise<YooKassaPayment> {
  const idempotencyKey = `checkout_${params.metadata.userId}_${Date.now()}`;

  const res = await fetch(`${YOOKASSA_BASE}/payments`, {
    method: "POST",
    headers: authHeaders(idempotencyKey),
    body: JSON.stringify({
      amount: {
        value: (params.amountKopecks / 100).toFixed(2),
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: params.return_url,
      },
      description: params.description,
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa createPayment failed: ${res.status} ${err}`);
  }

  return res.json();
}

/**
 * Получить статус платежа.
 */
export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const res = await fetch(`${YOOKASSA_BASE}/payments/${paymentId}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa getPayment failed: ${res.status} ${err}`);
  }

  return res.json();
}

/**
 * Подтвердить платёж (для capture=false).
 */
export async function capturePayment(paymentId: string): Promise<YooKassaPayment> {
  const res = await fetch(`${YOOKASSA_BASE}/payments/${paymentId}/capture`, {
    method: "POST",
    headers: authHeaders(paymentId),
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa capturePayment failed: ${res.status} ${err}`);
  }

  return res.json();
}

/**
 * Проверить подпись вебхука (HMAC-SHA256).
 * YooKassa отправляет заголовок Authorization с HMAC подписью.
 */
export function verifyWebhookSignature(
  requestBody: string,
  authHeader: string | null,
): boolean {
  if (!authHeader || !SECRET_KEY) return false;

  // YooKassa использует HMAC-SHA256 с секретным ключом как пароль
  // Формат: "HMAC-SHA256 <base64(hmac)>" или просто base64(hmac)
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", SECRET_KEY);
  hmac.update(requestBody);
  const expectedSignature = hmac.digest("base64");

  // Сравниваем с подписью из заголовка
  const receivedSignature = authHeader.replace(/^HMAC-SHA256\s+/, "").trim();
  const expectedBuf = Buffer.from(expectedSignature);
  const receivedBuf = Buffer.from(receivedSignature);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
