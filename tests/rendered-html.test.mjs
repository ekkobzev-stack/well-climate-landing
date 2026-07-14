import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { POST as handleLead } from "../app/api/lead/route.ts";
import { POST as handleTelegramRelay } from "../app/api/internal/telegram/route.ts";
import { formatRussianPhone, validateProjectFile, validateRussianPhone } from "../app/formValidation.ts";

async function loadWorker(label) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${label}`);
  return (await import(workerUrl.href)).default;
}

async function render(route = "/") {
  const worker = await loadWorker(route);
  return worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

function makeLeadForm({ phone = "+7 (903) 018-30-25", file, service = "VRF / VRV" } = {}) {
  const form = new FormData();
  form.set("name", "Тест без отправки третьим лицам");
  form.set("phone", phone);
  form.set("type", "Бизнес-центр или офис");
  form.set("description", "Проверка обработчика формы");
  form.set("service", service);
  form.set("consent", "on");
  form.set("pageUrl", "https://well-climate.ru/?utm_source=test");
  form.set("utm", JSON.stringify({ utm_source: "test" }));
  form.set("submittedAt", "2026-07-12T00:00:00.000Z");
  form.set("startedAt", String(Date.now() - 5000));
  if (file) form.set("project", file, file.name);
  return form;
}

function relayRequest(payload, secret, deliveryKey = "telegram-test-delivery") {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Request("http://localhost/api/internal/telegram", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": deliveryKey,
      "X-Well-Climate-Timestamp": timestamp,
      "X-Well-Climate-Signature": `sha256=${signature}`,
    },
  });
}

test("signed Telegram relay validates requests and suppresses a replay", async () => {
  const secret = "relay-test-secret-with-at-least-32-characters";
  const oldSecret = process.env.CRM_INTAKE_SECRET;
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  const oldFetch = globalThis.fetch;
  process.env.CRM_INTAKE_SECRET = secret;
  process.env.TELEGRAM_BOT_TOKEN = "123456789:test-token-with-at-least-thirty-characters";
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), payload: JSON.parse(String(init.body)) });
    return Response.json({ ok: true, result: { message_id: 701 } });
  };
  try {
    const payload = {
      chat_id: "-1001234567890",
      text: "Тест служебного уведомления",
      action_url: "https://app.well-climate.ru/crm?deal=1",
    };
    const first = await handleTelegramRelay(relayRequest(payload, secret));
    const replay = await handleTelegramRelay(relayRequest(payload, secret));
    assert.equal(first.status, 200);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replay, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].payload.chat_id, payload.chat_id);
    assert.equal(calls[0].payload.reply_markup.inline_keyboard[0][0].text, "Открыть карточку");

    const rejected = await handleTelegramRelay(relayRequest(payload, "wrong-secret-with-at-least-32-characters", "telegram-bad-signature"));
    assert.equal(rejected.status, 401);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldSecret === undefined) delete process.env.CRM_INTAKE_SECRET; else process.env.CRM_INTAKE_SECRET = oldSecret;
    if (oldToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = oldToken;
  }
});

async function withMockTelegram(mock, action, crmMock = async () => Response.json({
  created: true,
  event_id: 1,
  lead_id: 1,
  deal_id: 1,
  task_id: 1,
}, { status: 201 })) {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  const oldChat = process.env.TELEGRAM_CHAT_ID;
  const oldCrmUrl = process.env.CRM_INTAKE_URL;
  const oldCrmSecret = process.env.CRM_INTAKE_SECRET;
  const oldFetch = globalThis.fetch;
  process.env.TELEGRAM_BOT_TOKEN = "test-token-not-a-secret";
  process.env.TELEGRAM_CHAT_ID = "123456";
  process.env.CRM_INTAKE_URL = "https://crm.example.test/api/intake/website";
  process.env.CRM_INTAKE_SECRET = "crm-test-secret-with-at-least-32-characters";
  globalThis.fetch = (url, init) => String(url) === process.env.CRM_INTAKE_URL
    ? crmMock(url, init)
    : mock(url, init);
  try { return await action(); }
  finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = oldToken;
    if (oldChat === undefined) delete process.env.TELEGRAM_CHAT_ID; else process.env.TELEGRAM_CHAT_ID = oldChat;
    if (oldCrmUrl === undefined) delete process.env.CRM_INTAKE_URL; else process.env.CRM_INTAKE_URL = oldCrmUrl;
    if (oldCrmSecret === undefined) delete process.env.CRM_INTAKE_SECRET; else process.env.CRM_INTAKE_SECRET = oldCrmSecret;
  }
}

test("renders updated commercial landing without public placeholders", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Климатические системы для коммерческих объектов под ключ/);
  assert.match(html, /Получить предварительный расчёт/);
  assert.match(html, /Получить расчёт →/);
  assert.match(html, /name="phone"/);
  assert.match(html, /name="service"/);
  assert.doesNotMatch(html, /Кейсы из практики Well-Climate|Офисы «Деловые Линии»|Магазин Top Inn|Ресторан «ЗИЛАРТ»/);
  assert.match(html, /Типовые решения для разных объектов/);
  assert.match(html, /typical-solutions\/commercial-vrf-rooftop\.webp/);
  assert.match(html, /typical-solutions\/retail-wall-unit\.webp/);
  assert.match(html, /typical-solutions\/fan-coil-installation\.webp/);
  assert.match(html, /team\/engineer-well-climate\.webp/);
  assert.match(html, /Инженер/);
  assert.doesNotMatch(html, /Место для реальной фотографии|не являются заявлением|официальный дилерский статус|НЕ ДЕЙСТВИТЕЛЕН/);
});

test("renders finished privacy page without internal notes", async () => {
  const response = await render("/privacy");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Политика обработки персональных данных/);
  assert.match(html, /защищённому каналу во внутреннюю CRM Well-Climate/);
  assert.match(html, /служебное уведомление в Telegram/);
  assert.doesNotMatch(html, /Юридические реквизиты оператора должны|защищённый канал Telegram/);
});

test("renders Yandex Metrika only when a counter id is configured", async () => {
  const previous = process.env.YANDEX_METRIKA_ID;
  process.env.YANDEX_METRIKA_ID = "110622251";
  try {
    const response = await render("/?metrika-test=1");
    const html = await response.text();
    assert.match(html, /mc\.yandex\.ru\/watch\/110622251/);
  } finally {
    if (previous === undefined) delete process.env.YANDEX_METRIKA_ID;
    else process.env.YANDEX_METRIKA_ID = previous;
  }
});

test("formats and validates Russian phone numbers on the client", () => {
  assert.equal(formatRussianPhone("89030183025"), "+7 (903) 018-30-25");
  assert.equal(formatRussianPhone("9030183025"), "+7 (903) 018-30-25");
  assert.equal(validateRussianPhone("+7 (903) 018-30-25"), true);
  assert.equal(validateRussianPhone("+7 (903) 018"), false);
});

test("validates project file type and 20 MB limit on the client", () => {
  assert.equal(validateProjectFile(new File(["pdf"], "project.pdf", { type: "application/pdf" })), "");
  assert.match(validateProjectFile(new File(["exe"], "project.exe")), /Допустимы/);
  assert.match(validateProjectFile(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.pdf")), /20 МБ/);
});

test("lead endpoint fails safely when delivery is not configured", async () => {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  const oldChat = process.env.TELEGRAM_CHAT_ID;
  const oldCrmUrl = process.env.CRM_INTAKE_URL;
  const oldCrmSecret = process.env.CRM_INTAKE_SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.CRM_INTAKE_URL;
  delete process.env.CRM_INTAKE_SECRET;
  try {
    const response = await handleLead(new Request("http://localhost/api/lead", { method: "POST", body: makeLeadForm() }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /временно недоступен/i);
  } finally {
    if (oldToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = oldToken;
    if (oldChat !== undefined) process.env.TELEGRAM_CHAT_ID = oldChat;
    if (oldCrmUrl !== undefined) process.env.CRM_INTAKE_URL = oldCrmUrl;
    if (oldCrmSecret !== undefined) process.env.CRM_INTAKE_SECRET = oldCrmSecret;
  }
});

test("lead endpoint signs and sends the exact website payload to CRM", async () => {
  let crmCall;
  await withMockTelegram(
    async () => Response.json({ ok: true, result: {} }),
    async () => {
      const response = await handleLead(new Request("http://localhost/api/lead", {
        method: "POST",
        body: makeLeadForm({ phone: "+7 (903) 555-66-77", service: "Вентиляция" }),
        headers: { "x-forwarded-for": "127.0.0.71" },
      }));
      assert.equal(response.status, 200);
    },
    async (url, init) => {
      crmCall = { url: String(url), init };
      return Response.json({ created: true, event_id: 17, lead_id: 18, deal_id: 19, task_id: 20 }, { status: 201 });
    },
  );

  assert.equal(crmCall.url, "https://crm.example.test/api/intake/website");
  const payload = JSON.parse(crmCall.init.body);
  const headers = crmCall.init.headers;
  assert.match(payload.external_id, /^website-\d+-[0-9a-f-]{36}$/);
  assert.equal(payload.phone, "+7 (903) 555-66-77");
  assert.equal(payload.object_type, "Бизнес-центр или офис");
  assert.equal(payload.service, "Вентиляция");
  assert.equal(headers["Idempotency-Key"], payload.external_id);
  const timestamp = headers["X-Well-Climate-Timestamp"];
  const expected = createHmac("sha256", "crm-test-secret-with-at-least-32-characters")
    .update(`${timestamp}.${crmCall.init.body}`)
    .digest("hex");
  assert.equal(headers["X-Well-Climate-Signature"], `sha256=${expected}`);
});

test("mock Telegram receives service, UTM, page, PDF and image", async () => {
  const calls = [];
  await withMockTelegram(async (url, init) => {
    calls.push({ url: String(url), body: init?.body });
    return Response.json({ ok: true, result: {} });
  }, async () => {
    const files = [
      new File(["%PDF-1.4"], "project.pdf", { type: "application/pdf" }),
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "object.png", { type: "image/png" }),
    ];
    for (const [index, file] of files.entries()) {
      const form = makeLeadForm({ phone: `+7 (903) 018-3${index}25`, file });
      const response = await handleLead(new Request("http://localhost/api/lead", { method: "POST", body: form, headers: { "x-forwarded-for": `127.0.0.${index + 1}` } }));
      assert.equal(response.status, 200);
    }
  });
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call.url, /\/sendDocument$/);
    assert.equal(call.body.get("chat_id"), "123456");
    assert.match(String(call.body.get("caption")), /Направление: VRF \/ VRV/);
    assert.match(String(call.body.get("caption")), /utm_source/);
    assert.match(String(call.body.get("caption")), /well-climate\.ru/);
    assert.ok(call.body.get("document") instanceof File);
  }
});

test("browser autofill cannot silently discard a valid lead", async () => {
  let telegramCalls = 0;
  await withMockTelegram(async () => {
    telegramCalls += 1;
    return Response.json({ ok: true, result: {} });
  }, async () => {
    const form = makeLeadForm({ phone: "+7 (903) 444-55-66" });
    form.set("companyWebsite", "https://autofilled.example");
    const response = await handleLead(new Request("http://localhost/api/lead", { method: "POST", body: form, headers: { "x-forwarded-for": "127.0.0.61" } }));
    assert.equal(response.status, 200);
  });
  assert.equal(telegramCalls, 1);
});

test("server rejects oversized files before calling Telegram", async () => {
  let telegramCalls = 0;
  await withMockTelegram(async () => { telegramCalls += 1; return Response.json({ ok: true }); }, async () => {
    const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" });
    const response = await handleLead(new Request("http://localhost/api/lead", { method: "POST", body: makeLeadForm({ phone: "+7 (903) 111-22-33", file }) }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /20 МБ/);
  });
  assert.equal(telegramCalls, 0);
});

test("Telegram error does not lose a lead already registered in CRM", async () => {
  await withMockTelegram(async () => Response.json({ ok: false }, { status: 502 }), async () => {
    const response = await handleLead(new Request("http://localhost/api/lead", { method: "POST", body: makeLeadForm({ phone: "+7 (903) 222-33-44" }) }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).notification, "delayed");
  });
});

test("CRM error blocks Telegram and reports that the lead was not registered", async () => {
  let telegramCalls = 0;
  await withMockTelegram(
    async () => { telegramCalls += 1; return Response.json({ ok: true }); },
    async () => {
      const response = await handleLead(new Request("http://localhost/api/lead", {
        method: "POST",
        body: makeLeadForm({ phone: "+7 (903) 777-88-99" }),
        headers: { "x-forwarded-for": "127.0.0.72" },
      }));
      assert.equal(response.status, 502);
      assert.match((await response.json()).error, /Не удалось зарегистрировать заявку/);
    },
    async () => Response.json({ error: "unavailable" }, { status: 503 }),
  );
  assert.equal(telegramCalls, 0);
});

test("spam protection blocks an immediate duplicate", async () => {
  await withMockTelegram(async () => Response.json({ ok: true }), async () => {
    const request = () => new Request("http://localhost/api/lead", { method: "POST", body: makeLeadForm({ phone: "+7 (903) 333-44-55" }), headers: { "x-forwarded-for": "127.0.0.50" } });
    assert.equal((await handleLead(request())).status, 200);
    assert.equal((await handleLead(request())).status, 429);
  });
});

test("sitemap has stable modification dates and required pages", async () => {
  const first = await render("/sitemap.xml");
  const second = await render("/sitemap.xml");
  const firstText = await first.text();
  const secondText = await second.text();
  assert.equal(first.status, 200);
  assert.equal(firstText, secondText);
  assert.match(firstText, /https:\/\/well-climate\.ru\//);
  assert.match(firstText, /https:\/\/well-climate\.ru\/privacy/);
  assert.match(firstText, /2026-07-11T21:00:00\.000Z/);
});

async function readClientFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const chunks = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) chunks.push(...await readClientFiles(fullPath));
    else if (/\.(?:js|css|html|json)$/.test(entry.name)) chunks.push(await readFile(fullPath, "utf8"));
  }
  return chunks;
}

test("client artifact contains no server secrets", async () => {
  const contents = (await readClientFiles(fileURLToPath(new URL("../dist/client", import.meta.url)))).join("\n");
  assert.doesNotMatch(contents, /TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|CRM_INTAKE_SECRET|test-token-not-a-secret|crm-test-secret-with-at-least-32-characters/);
});
