import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;

function jsonError(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

function configuredSecrets() {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "";
  const crmSecret = process.env.CRM_INTAKE_SECRET?.trim() || "";
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const actionUrl = process.env.CRM_TELEGRAM_ACTION_URL?.trim() || "";
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(webhookSecret) || crmSecret.length < 32) return null;
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) return null;
  try {
    if (new URL(actionUrl).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { webhookSecret, crmSecret, token, actionUrl };
}

function secretValid(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function validCallback(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const update = value as Record<string, unknown>;
  const query = update.callback_query;
  if (!query || typeof query !== "object") return null;
  const callback = query as Record<string, unknown>;
  const from = callback.from;
  const message = callback.message;
  if (!from || typeof from !== "object" || !message || typeof message !== "object") return null;
  const chat = (message as Record<string, unknown>).chat;
  if (!chat || typeof chat !== "object") return null;
  const callbackQueryId = typeof callback.id === "string" ? callback.id.trim() : "";
  const callbackData = typeof callback.data === "string" ? callback.data.trim() : "";
  const telegramUserId = String((from as Record<string, unknown>).id ?? "");
  const chatId = String((chat as Record<string, unknown>).id ?? "");
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(callbackQueryId)) return null;
  if (!/^wc1:(accept|contact|remind):\d+:\d+:\d+:[a-f0-9]{16}$/.test(callbackData)) return null;
  if (!/^[1-9]\d+$/.test(telegramUserId) || !/^-?[1-9]\d+$/.test(chatId)) return null;
  return { callbackQueryId, callbackData, telegramUserId, chatId };
}

async function answerCallback(token: string, callbackQueryId: string, text: string, alert: boolean) {
  const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text.slice(0, 180),
      show_alert: alert,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean } | null;
  return response.ok && result?.ok === true;
}

export async function POST(request: Request) {
  const configuration = configuredSecrets();
  if (!configuration) return jsonError("Telegram webhook is not configured", 503);
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!secretValid(providedSecret, configuration.webhookSecret)) {
    return jsonError("Invalid webhook secret", 401);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return jsonError("Payload is too large", 413);
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.length > MAX_BODY_BYTES) return jsonError("Payload is too large", 413);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return jsonError("Invalid JSON", 422);
  }
  const callback = validCallback(parsed);
  if (!callback) return jsonError("Unsupported Telegram update", 422);

  const actionBody = Buffer.from(JSON.stringify({
    callback_query_id: callback.callbackQueryId,
    callback_data: callback.callbackData,
    chat_id: callback.chatId,
    telegram_user_id: callback.telegramUserId,
  }));
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", configuration.crmSecret)
    .update(`${timestamp}.`)
    .update(actionBody)
    .digest("hex");

  let crmResponse: Response;
  try {
    crmResponse = await fetch(configuration.actionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": callback.callbackQueryId,
        "X-Well-Climate-Timestamp": timestamp,
        "X-Well-Climate-Signature": `sha256=${signature}`,
      },
      body: actionBody,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    await answerCallback(configuration.token, callback.callbackQueryId, "Платформа временно недоступна", true).catch(() => false);
    return jsonError("CRM platform is unavailable", 502);
  }
  const result = await crmResponse.json().catch(() => null) as { message?: string; detail?: string } | null;
  const successful = crmResponse.ok && typeof result?.message === "string";
  const answer = successful ? result.message! : (result?.detail || "Действие не выполнено");
  const answered = await answerCallback(
    configuration.token,
    callback.callbackQueryId,
    answer,
    !successful,
  ).catch(() => false);
  if (!answered) return jsonError("Telegram API is unavailable", 502);
  if (crmResponse.status >= 500) return jsonError("CRM platform is unavailable", 502);
  return Response.json({ ok: successful });
}
