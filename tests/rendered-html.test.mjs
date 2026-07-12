import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { POST as handleLead } from "../app/api/lead/route.ts";
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

async function withMockTelegram(mock, action) {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  const oldChat = process.env.TELEGRAM_CHAT_ID;
  const oldFetch = globalThis.fetch;
  process.env.TELEGRAM_BOT_TOKEN = "test-token-not-a-secret";
  process.env.TELEGRAM_CHAT_ID = "123456";
  globalThis.fetch = mock;
  try { return await action(); }
  finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = oldToken;
    if (oldChat === undefined) delete process.env.TELEGRAM_CHAT_ID; else process.env.TELEGRAM_CHAT_ID = oldChat;
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
  assert.match(html, /серверную интеграцию с Telegram/);
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

test("lead endpoint fails safely when Telegram is not configured", async () => {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  const oldChat = process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  try {
    const response = await handleLead(new Request("http://localhost/api/lead", { method: "POST", body: makeLeadForm() }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /временно недоступен/i);
  } finally {
    if (oldToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = oldToken;
    if (oldChat !== undefined) process.env.TELEGRAM_CHAT_ID = oldChat;
  }
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

test("Telegram error is reported and does not silently lose the lead", async () => {
  await withMockTelegram(async () => Response.json({ ok: false }, { status: 502 }), async () => {
    const response = await handleLead(new Request("http://localhost/api/lead", { method: "POST", body: makeLeadForm({ phone: "+7 (903) 222-33-44" }) }));
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /Не удалось передать заявку/);
  });
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
  assert.doesNotMatch(contents, /TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|test-token-not-a-secret/);
});
