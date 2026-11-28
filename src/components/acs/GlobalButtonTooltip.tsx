import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipTargetState {
  text: string;
  top: number;
  left: number;
  placement: "top" | "bottom";
}

function getButtonHoverText(el: HTMLElement): string {
  const explicit = el.getAttribute("data-tooltip")?.trim();
  if (explicit) return explicit;
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  if (text && text.length <= 64) return text;
  return "";
}

/**
 * Lightweight document-level hover/focus tooltip renderer for all buttons
 * without wrapping Radix triggers or interfering with refs / asChild Slots.
 */
export function GlobalButtonTooltip() {
  const [tip, setTip] = useState<TooltipTargetState | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const hide = () => {
      clearTimer();
      activeElRef.current = null;
      setTip(null);
    };

    const showFor = (target: HTMLElement) => {
      const text = getButtonHoverText(target);
      if (!text) {
        hide();
        return;
      }
      if (!target.isConnected) return;
      const rect = target.getBoundingClientRect();

      const placeBelow = rect.top < 52;
      const centerX = rect.left + rect.width / 2;
      const clampedX = Math.max(120, Math.min(window.innerWidth - 120, centerX));
      setTip({
        text,
        left: clampedX,
        top: placeBelow ? rect.bottom + 8 : rect.top - 8,
        placement: placeBelow ? "bottom" : "top",
      });
    };

    const handleOver = (e: Event) => {
      const rawTarget = e.target;
      if (!(rawTarget instanceof Element)) return;
      const btn = rawTarget.closest(
        'button, [data-tooltip], [role="button"]',
      ) as HTMLElement | null;
      if (!btn || btn.hasAttribute("disabled") && !btn.getAttribute("data-tooltip")) {
        if (!btn) hide();
        return;
      }
      if (activeElRef.current === btn) return;
      clearTimer();
      activeElRef.current = btn;
      timerRef.current = window.setTimeout(() => {
        if (activeElRef.current === btn) {
          showFor(btn);
        }
      }, 220);
    };

    const handleOut = (e: MouseEvent) => {
      const active = activeElRef.current;
      if (!active) return;
      const related = e.relatedTarget;
      if (related instanceof Node && active.contains(related)) return;
      hide();
    };

    document.addEventListener("mouseover", handleOver, true);
    document.addEventListener("mouseout", handleOut, true);
    document.addEventListener("focusin", handleOver, true);
    document.addEventListener("focusout", hide, true);
    document.addEventListener("pointerdown", hide, true);
    window.addEventListener("scroll", hide, true);

    return () => {
      clearTimer();
      document.removeEventListener("mouseover", handleOver, true);
      document.removeEventListener("mouseout", handleOut, true);
      document.removeEventListener("focusin", handleOver, true);
      document.removeEventListener("focusout", hide, true);
      document.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  if (!tip || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: `${tip.left}px`,
        top: `${tip.top}px`,
        transform:
          tip.placement === "top"
            ? "translate(-50%, -100%)"
            : "translate(-50%, 0)",
      }}
      className="pointer-events-none z-[120] max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-center text-[11px] leading-snug font-medium text-background shadow-lg"
    >
      {tip.text}
    </div>,
    document.body,
  );
}
