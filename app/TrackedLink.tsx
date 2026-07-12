"use client";

import { ComponentProps, MouseEvent } from "react";
import { MetricGoal, reachGoal } from "./metricEvents";

type Props = ComponentProps<"a"> & { goal: MetricGoal; service?: string };

export default function TrackedLink({ goal, service, onClick, ...props }: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    reachGoal(goal, service ? { service } : {});
    if (service) {
      try { sessionStorage.setItem("well-climate-service", service); } catch { /* storage may be unavailable */ }
      window.dispatchEvent(new CustomEvent("well-climate:service", { detail: service }));
    }
    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}
