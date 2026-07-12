"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { reachGoal } from "./metricEvents";
import { formatRussianPhone, validateProjectFile, validateRussianPhone } from "./formValidation";

type FormState = "idle" | "sending" | "success" | "error";
type FieldErrors = Partial<Record<"phone" | "type" | "consent", string>>;

export default function ContactForm() {
  const [phone, setPhone] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [selectedService, setSelectedService] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const startedAt = useRef(0);
  const formStarted = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    const selectService = (event: Event) => setSelectedService((event as CustomEvent<string>).detail || "");
    window.addEventListener("well-climate:service", selectService);
    return () => window.removeEventListener("well-climate:service", selectService);
  }, []);

  function markFormStarted() {
    if (formStarted.current) return;
    formStarted.current = true;
    reachGoal("form_start");
  }

  function validateFields(form: HTMLFormElement) {
    const data = new FormData(form);
    const errors: FieldErrors = {};
    const phoneValue = String(data.get("phone") || "");
    if (!phoneValue.trim()) errors.phone = "Укажите номер телефона.";
    else if (!validateRussianPhone(phoneValue)) errors.phone = "Введите российский номер из 11 цифр.";
    if (!String(data.get("type") || "").trim()) errors.type = "Выберите тип объекта.";
    if (data.get("consent") !== "on") errors.consent = "Подтвердите согласие на обработку данных.";
    return errors;
  }

  function focusFirstError(form: HTMLFormElement, errors: FieldErrors, hasFileError: boolean) {
    const name = errors.phone ? "phone" : errors.type ? "type" : errors.consent ? "consent" : hasFileError ? "project" : "";
    const field = name ? form.elements.namedItem(name) : null;
    if (field instanceof HTMLElement) {
      field.focus();
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formState === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("project") instanceof File ? data.get("project") as File : undefined;
    const nextFileError = validateProjectFile(file?.size ? file : undefined);
    const errors = validateFields(form);
    setFieldErrors(errors);
    setFileError(nextFileError);

    if (Object.keys(errors).length || nextFileError) {
      setFormState("error");
      setMessage("Проверьте выделенные поля формы.");
      reachGoal("form_error", { reason: "client_validation" });
      focusFirstError(form, errors, Boolean(nextFileError));
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries([...params.entries()].filter(([key]) => key.startsWith("utm_")));
    data.set("phone", phone);
    data.set("service", selectedService);
    data.set("pageUrl", window.location.href);
    data.set("utm", JSON.stringify(utm));
    data.set("submittedAt", new Date().toISOString());
    data.set("startedAt", String(startedAt.current));
    setFormState("sending");
    setMessage("");

    try {
      const response = await fetch("/api/lead", { method: "POST", body: data });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось отправить заявку.");
      setFormState("success");
      setMessage("Заявка отправлена. Инженер Well-Climate свяжется с вами для уточнения задачи.");
      reachGoal("form_success", selectedService ? { service: selectedService } : {});
      form.reset();
      setPhone("");
      setFileName("");
      setFileError("");
      setFieldErrors({});
      setSelectedService("");
      try { sessionStorage.removeItem("well-climate-service"); } catch { /* storage may be unavailable */ }
      startedAt.current = Date.now();
      formStarted.current = false;
    } catch (error) {
      setFormState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось отправить заявку. Позвоните нам или повторите позже.");
      reachGoal("form_error", { reason: "request_failed" });
    }
  }

  return (
    <form onSubmit={submit} onFocusCapture={markFormStarted} noValidate aria-label="Заявка на предварительный расчёт">
      <input name="service" type="hidden" value={selectedService} readOnly />
      <label><span>Имя — необязательно</span><input name="name" autoComplete="name" placeholder="Как к вам обращаться" /></label>
      <label className={fieldErrors.phone ? "hasError" : undefined}>
        <span>Телефон *</span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (000) 000-00-00" value={phone} onChange={(event) => { setPhone(formatRussianPhone(event.target.value)); setFieldErrors((current) => ({ ...current, phone: undefined })); }} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined} />
        {fieldErrors.phone && <small className="fieldError" id="phone-error" role="alert">{fieldErrors.phone}</small>}
      </label>
      <label className={`wide${fieldErrors.type ? " hasError" : ""}`}>
        <span>Тип объекта *</span>
        <select name="type" defaultValue="" onChange={(event) => { setFieldErrors((current) => ({ ...current, type: undefined })); reachGoal("service_select", { source: "object_type", objectType: event.target.value }); }} aria-invalid={Boolean(fieldErrors.type)} aria-describedby={fieldErrors.type ? "type-error" : undefined}>
          <option value="" disabled>Выберите тип объекта</option><option>Бизнес-центр или офис</option><option>Ресторан или объект общественного питания</option><option>Торговый или общественный объект</option><option>Производственный или технологический объект</option><option>Загородный дом</option><option>Другой объект</option>
        </select>
        {fieldErrors.type && <small className="fieldError" id="type-error" role="alert">{fieldErrors.type}</small>}
      </label>
      {selectedService && <p className="selectedService wide">Выбрано направление: <b>{selectedService}</b><button type="button" onClick={() => { setSelectedService(""); try { sessionStorage.removeItem("well-climate-service"); } catch { /* storage may be unavailable */ } }} aria-label="Сбросить выбранное направление">×</button></p>}
      <label className="wide textareaLabel"><span>Описание задачи — необязательно</span><textarea name="description" placeholder="Что нужно рассчитать, поставить или смонтировать" rows={4} /></label>
      <label className="wide fileUpload">
        <input name="project" type="file" accept=".pdf,.dwg,.dxf,.zip,.jpg,.jpeg,.png,.webp" aria-describedby="file-rules" onChange={(event) => {
          const file = event.target.files?.[0];
          const error = validateProjectFile(file);
          setFileError(error);
          setFileName(file?.name || "");
          if (file && !error) reachGoal("file_attach", { extension: file.name.split(".").pop()?.toLowerCase() || "unknown" });
        }} />
        <span id="file-rules">PDF / DWG / DXF / ZIP / JPG / PNG / WEBP · до 20 МБ</span>
        <b>{fileName || "Приложить проект или фотографии"}</b>
        <i>{fileName ? "Файл выбран" : "Выбрать →"}</i>
      </label>
      {fileError && <p className="formError" role="alert">{fileError}</p>}
      <p className="formHint">Можно приложить готовый проект, спецификацию или фотографии объекта.</p>
      <label className={`consent wide${fieldErrors.consent ? " hasError" : ""}`}><input name="consent" type="checkbox" onChange={() => setFieldErrors((current) => ({ ...current, consent: undefined }))} aria-invalid={Boolean(fieldErrors.consent)} aria-describedby={fieldErrors.consent ? "consent-error" : undefined} /><span>Согласен на обработку персональных данных в соответствии с <a href="/privacy" target="_blank">политикой конфиденциальности</a>.</span></label>
      {fieldErrors.consent && <p className="fieldError consentError" id="consent-error" role="alert">{fieldErrors.consent}</p>}
      <button type="submit" className="btn green" disabled={formState === "sending"} aria-busy={formState === "sending"}>{formState === "sending" ? "Отправляем проект…" : "Получить предварительный расчёт"}<span aria-hidden="true">→</span></button>
      {message && <p className={formState === "success" ? "formSuccess" : "formError"} role="status" aria-live="polite">{message}</p>}
    </form>
  );
}
