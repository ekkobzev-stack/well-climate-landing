"use client";

export type MetricGoal =
  | "phone_click"
  | "telegram_click"
  | "form_navigate"
  | "form_start"
  | "service_select"
  | "file_attach"
  | "form_success"
  | "form_error";

type YandexMetrika = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: YandexMetrika;
    __WELL_CLIMATE_METRIKA_ID__?: number;
  }
}

export function reachGoal(goal: MetricGoal, params: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  const counterId = window.__WELL_CLIMATE_METRIKA_ID__;
  if (!counterId || typeof window.ym !== "function") return;
  window.ym(counterId, "reachGoal", goal, params);
}

