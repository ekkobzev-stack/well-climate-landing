"use client";

import { useEffect } from "react";

export default function Analytics({ counterId }: { counterId?: string }) {
  useEffect(() => {
    if (!counterId || !/^\d+$/.test(counterId)) return;
    const id = Number(counterId);
    window.__WELL_CLIMATE_METRIKA_ID__ = id;

    if (!window.ym) {
      const queue: NonNullable<typeof window.ym> = function (...args: unknown[]) {
        (queue.a ||= []).push(args);
      };
      queue.l = Date.now();
      window.ym = queue;
    }

    window.ym(id, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: window.location.href,
      trackLinks: true,
      accurateTrackBounce: true,
    });

    if (!document.querySelector('script[data-well-climate-metrika="true"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;
      script.dataset.wellClimateMetrika = "true";
      document.head.appendChild(script);
    }
  }, [counterId]);

  if (!counterId || !/^\d+$/.test(counterId)) return null;
  return <noscript><div><img className="metrikaPixel" src={`https://mc.yandex.ru/watch/${counterId}`} width="1" height="1" alt="" /></div></noscript>;
}
