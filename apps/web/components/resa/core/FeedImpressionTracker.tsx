"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { resaRequest } from "@/lib/resa/api";

export default function FeedImpressionTracker({
  contentId,
  children,
}: {
  contentId: string;
  children: ReactNode;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let visibleSince: number | null = null;
    let accumulatedMs = 0;
    let sent = false;

    const flush = () => {
      if (visibleSince !== null) {
        accumulatedMs += Math.max(0, performance.now() - visibleSince);
        visibleSince = null;
      }
    };

    const send = () => {
      flush();
      if (sent || accumulatedMs < 2000) return;
      sent = true;
      const duration = Math.min(Math.round(accumulatedMs), 300000);
      void resaRequest(`/v1/resa/content/${contentId}/impression`, {
        method: "POST",
        body: JSON.stringify({
          duration_ms: Math.max(1000, duration),
          completed: duration >= 10000,
        }),
      }).catch(() => {});
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (document.visibilityState !== "visible") {
          flush();
          return;
        }
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (visibleSince === null) visibleSince = performance.now();
        } else {
          flush();
          send();
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(element);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
        send();
      } else if (visibleSince === null && element.getBoundingClientRect().top < window.innerHeight) {
        visibleSince = performance.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      send();
    };
  }, [contentId]);

  return <div ref={elementRef}>{children}</div>;
}
