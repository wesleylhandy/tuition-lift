"use client";

/**
 * useScrollReveal — IntersectionObserver-based scroll-triggered visibility.
 * Adds data-visible when section enters viewport. Respects prefers-reduced-motion:
 * when set, content shows immediately (no scroll reveal animation).
 *
 * Usage:
 *   const { ref, isVisible } = useScrollReveal();
 *   return <section ref={ref} data-visible={isVisible} ...>
 *
 * CSS: use [data-visible="true"] for opacity/transform; @media (prefers-reduced-motion: reduce)
 * to disable or simplify transitions.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseScrollRevealOptions {
  /** CSS rootMargin for IntersectionObserver (e.g. "0px 0px -50px 0px" to trigger earlier) */
  rootMargin?: string;
  /** Threshold 0–1; 0.1 = 10% visible triggers */
  threshold?: number;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const { rootMargin = "0px 0px -50px 0px", threshold = 0.1 } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const handler = () => setPrefersReducedMotion(mq.matches);
    setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (prefersReducedMotion) {
        setIsVisible(true);
        return;
      }

      if (!node) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setIsVisible(true);
        },
        { rootMargin, threshold }
      );
      observerRef.current = observer;
      observer.observe(node);
    },
    [prefersReducedMotion, rootMargin, threshold]
  );

  useEffect(() => {
    if (prefersReducedMotion) setIsVisible(true);
  }, [prefersReducedMotion]);

  return {
    ref: setRef,
    isVisible: prefersReducedMotion ? true : isVisible,
  };
}
