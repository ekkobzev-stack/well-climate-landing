import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 300;
const delivered = new Map<string, { messageId: string; receivedAt: number }>();
type TelegramAction = { text: string; callback_data: string };

function jsonError(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

function configuredSecrets() {
  const secret = process.env.CRM_INTAKE_SECRET?.trim() || "";
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  if (secret.length < 32 || !/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) return null;
  return { secret, token };
}

function signatureValid(body: Buffer, timestamp: string, signature: string, secret: string) {
  if (!/^\d{10}$/.test(timestamp)) return false;
  const signedAt = Number(timestamp);
  if (Math.abs(Math.floor(Date.now() / 1000) - signedAt) > MAX_CLOCK_SKEW_SECONDS) return false;
  const providedHex = signature.replace(/^sha256=/, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(providedHex)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest();
  const provided = Buffer.from(providedHex, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function validPayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  const chatId = typeof payload.chat_id === "string" ? payload.chat_id.trim() : "";
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const actionUrl = typeof payload.action_url === "string" ? payload.action_url.trim() : "";
  const rawActions = payload.actions === undefined ? [] : payload.actions;
  if (!/^-?[1-9]\d+$/.test(chatId) || !text || text.length > 4000) return null;
  if (!Array.isArray(rawActions) || rawActions.length > 3) return null;
  const actions: TelegramAction[] = [];
  for (const value of rawActions) {
    if (!value || typeof value !== "object") return null;
    const action = value as Record<string, unknown>;
    const label = typeof action.text === "string" ? action.text.trim() : "";
    const callbackData = typeof action.callback_data === "string" ? action.callback_data.trim() : "";
    if (!label || label.length > 40 || !/^[A-Za-z0-9:_-]{10,64}$/.test(callbackData)) return null;
    actions.push({ text: label, callback_data: callbackData });
  }
  if (actionUrl) {
    try {
      const url = new URL(actionUrl);
      if (!["http:", "https:"].includes(url.protocol)) return null;
    } catch {
      return null;
    }
  }
  return { chatId, text, actionUrl, actions };
}

export async function POST(request: Request) {
  const configuration = configuredSecrets();
  if (!configuration) return jsonError("Telegram relay is not configured", 503);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return jsonError("Payload is too large", 413);
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length > MAX_BODY_BYTES) return jsonError("Payload is too large", 413);
  const timestamp = request.headers.get("x-well-climate-timestamp") || "";
  const signature = request.headers.get("x-well-climate-signature") || "";
  if (!signatureValid(body, timestamp, signature, configuration.secret)) {
    return jsonError("Invalid signature", 401);
  }
  const deliveryKey = request.headers.get("idempotency-key")?.trim() || "";
  if (!/^[a-zA-Z0-9:._+-]{8,240}$/.test(deliveryKey)) {
    return jsonError("Invalid idempotency key", 409);
  }
  const previous = delivered.get(deliveryKey);
  if (previous) return Response.json({ ok: true, message_id: previous.messageId, replay: true });

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    return jsonError("Invalid JSON", 422);
  }
  const payload = validPayload(parsed);
  if (!payload) return jsonError("Invalid notification", 422);
  const telegramPayload: Record<string, unknown> = {
    chat_id: payload.chatId,
    text: payload.text,
    disable_web_page_preview: true,
  };
  if (payload.actions.length || payload.actionUrl) {
    const inlineKeyboard: Array<Array<Record<string, string>>> = payload.actions.map((action) => [{
      text: action.text,
      callback_data: action.callback_data,
    }]);
    if (payload.actionUrl) {
      inlineKeyboard.push([{ text: "Открыть карточку", url: payload.actionUrl }]);
    }
    telegramPayload.reply_markup = {
      inline_keyboard: inlineKeyboard,
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.telegram.org/bot${configuration.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telegramPayload),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return jsonError("Telegram API is unavailable", 502);
  }
  const result = await response.json().catch(() => null) as { ok?: boolean; result?: { message_id?: number } } | null;
  if (!response.ok || !result?.ok) return jsonError("Telegram rejected the notification", 502);
  const messageId = String(result.result?.message_id || "");
  delivered.set(deliveryKey, { messageId, receivedAt: Date.now() });
  if (delivered.size > 1000) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of delivered) if (value.receivedAt < cutoff) delivered.delete(key);
  }
  return Response.json({ ok: true, message_id: messageId, replay: false });
}
