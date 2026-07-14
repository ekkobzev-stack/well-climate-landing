import { createHash, createHmac, randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "dwg", "dxf", "zip", "jpg", "jpeg", "png", "webp"]);
const recentRequests = new Map<string, number>();

type CrmIntakeResult = {
  event_id: number;
  lead_id: number;
  deal_id: number;
  task_id: number;
};

function clean(value: FormDataEntryValue | null, max = 1200) {
  return String(value || "").trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

async function telegramRequest(url: string, body: FormData | URLSearchParams) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { method: "POST", body, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const description = typeof payload?.description === "string" ? payload.description : "Telegram rejected the request";
      throw new Error(`Telegram delivery failed (${response.status}): ${description}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function crmConfiguration() {
  const url = process.env.CRM_INTAKE_URL?.trim();
  const secret = process.env.CRM_INTAKE_SECRET?.trim();
  if (!url || !secret || secret.length < 32) return null;
  const parsed = new URL(url);
  const localHttp = parsed.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) return null;
  return { url, secret };
}

async function crmRequest(payload: Record<string, unknown>): Promise<CrmIntakeResult> {
  const configuration = crmConfiguration();
  if (!configuration) throw new Error("CRM intake is not configured securely");
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", configuration.secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(configuration.url, {
      method: "POST",
      body,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": String(payload.external_id),
        "X-Well-Climate-Timestamp": timestamp,
        "X-Well-Climate-Signature": `sha256=${signature}`,
      },
    });
    const result = await response.json().catch(() => null);
    if (![200, 201].includes(response.status) || !result?.event_id || !result?.task_id) {
      throw new Error(`CRM intake rejected the request (${response.status})`);
    }
    return result as CrmIntakeResult;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || !crmConfiguration()) return jsonError("Приём заявок временно недоступен. Позвоните нам по телефону +7 (903) 018-30-25.", 503);

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Не удалось прочитать данные формы.", 400);
  const phone = clean(form.get("phone"), 80);
  const type = clean(form.get("type"), 160);
  const name = clean(form.get("name"), 160);
  const description = clean(form.get("description"), 1800);
  const service = clean(form.get("service"), 160);
  const pageUrl = clean(form.get("pageUrl"), 700);
  const utm = clean(form.get("utm"), 1000);
  const clientSubmittedAt = clean(form.get("submittedAt"), 80);
  const consent = clean(form.get("consent"), 20);
  const startedAt = Number(clean(form.get("startedAt"), 30));
  if (!phone || !type) return jsonError("Укажите телефон и тип объекта.", 400);
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length !== 11 || !/^[78]/.test(phoneDigits)) return jsonError("Проверьте формат номера телефона.", 400);
  if (consent !== "on") return jsonError("Подтвердите согласие на обработку персональных данных.", 400);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500) return jsonError("Форма отправлена слишком быстро. Попробуйте ещё раз.", 429);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const requestKey = createHash("sha256").update(`${forwarded}:${phone}`).digest("hex");
  const previous = recentRequests.get(requestKey) || 0;
  if (Date.now() - previous < 60_000) return jsonError("Заявка уже отправляется. Подождите минуту перед повторной отправкой.", 429);

  const fileEntry = form.get("project");
  const file = fileEntry instanceof File && fileEntry.size ? fileEntry : null;
  if (file) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(extension)) return jsonError("Недопустимый формат файла.", 400);
    if (file.size > MAX_FILE_SIZE) return jsonError("Файл должен быть не больше 20 МБ.", 400);
  }

  recentRequests.set(requestKey, Date.now());
  for (const [key, value] of recentRequests) if (Date.now() - value > 10 * 60_000) recentRequests.delete(key);

  const submittedAt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Moscow" }).format(new Date());
  const lines = [
    "<b>Новая заявка с well-climate.ru</b>",
    `Телефон: <b>${escapeHtml(phone)}</b>`,
    `Тип объекта: ${escapeHtml(type)}`,
    service && `Направление: ${escapeHtml(service)}`,
    name && `Имя: ${escapeHtml(name)}`,
    description && `Задача: ${escapeHtml(description)}`,
    `Страница: ${escapeHtml(pageUrl || "не указана")}`,
    `UTM: ${escapeHtml(utm || "нет")}`,
    clientSubmittedAt && `Время отправки на устройстве: ${escapeHtml(clientSubmittedAt)}`,
    `Дата и время заявки: ${escapeHtml(submittedAt)}`,
  ].filter(Boolean).join("\n");

  const externalId = `website-${Date.now()}-${randomUUID()}`;
  const objectDescription = [
    `Тип объекта: ${type}`,
    service && `Направление: ${service}`,
    description && `Задача: ${description}`,
    file && `Файл: ${file.name} (${file.size} байт)`,
  ].filter(Boolean).join("\n");
  const crmPayload = {
    external_id: externalId,
    contact_name: name || "Посетитель сайта",
    phone,
    category: "Входящая заявка с сайта",
    object_description: objectDescription,
    source_url: (pageUrl || "https://well-climate.ru").slice(0, 500),
    object_type: type,
    service: service || null,
    utm: utm || null,
    client_submitted_at: clientSubmittedAt || null,
    file: file ? { name: file.name.slice(0, 300), size: file.size, type: file.type || null } : null,
  };

  try {
    await crmRequest(crmPayload);
  } catch (error) {
    console.error("[lead] CRM intake failed", error instanceof Error ? error.message : "Unknown CRM error");
    recentRequests.delete(requestKey);
    return jsonError("Не удалось зарегистрировать заявку. Попробуйте ещё раз или позвоните по телефону +7 (903) 018-30-25.", 502);
  }

  try {
    const api = `https://api.telegram.org/bot${token}`;
    if (file) {
      const payload = new FormData();
      payload.set("chat_id", chatId);
      payload.set("caption", lines.slice(0, 1024));
      payload.set("parse_mode", "HTML");
      payload.set("document", file, file.name);
      await telegramRequest(`${api}/sendDocument`, payload);
    } else {
      const payload = new URLSearchParams({ chat_id: chatId, text: lines, parse_mode: "HTML", disable_web_page_preview: "true" });
      await telegramRequest(`${api}/sendMessage`, payload);
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[lead] Telegram delivery failed", error instanceof Error ? error.message : "Unknown Telegram error");
    return Response.json({ ok: true, notification: "delayed" });
  }
}
