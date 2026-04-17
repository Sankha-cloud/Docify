"use client";

import { useEffect, useRef, useState } from "react";

const PAGE_H = 1123;
// 1px bottom border + 8px gap + 1px top border = 10px total separator
const CYCLE_H = PAGE_H + 10; // 1133

export function PageIndicator() {
  const [current, setCurrent] = useState(1);
  const [total, setTotal] = useState(1);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    // Works regardless of whether <main> or window is the scroll container.
    const getScroller = (): HTMLElement | Window => {
      const el = document.querySelector<HTMLElement>("[data-tiptap-root]");
      if (!el) return window;
      // If the element itself scrolls (overflow-y-auto with constrained height),
      // use it. Otherwise fall back to window.
      return el.scrollHeight > el.clientHeight ? el : window;
    };

    const update = () => {
      const editorEl = document.querySelector<HTMLElement>(
        "[data-tiptap-root] .ProseMirror",
      );
      if (!editorEl) return;

      const totalPages = Math.max(
        1,
        Math.ceil(editorEl.scrollHeight / PAGE_H),
      );

      // Measure how far the editor top has moved above the header bottom.
      const headerEl = document.querySelector<HTMLElement>("header");
      const headerBottom = headerEl
        ? headerEl.getBoundingClientRect().bottom
        : 0;
      const editorTop = editorEl.getBoundingClientRect().top;
      // Pixels of editor content scrolled above the header baseline.
      const scrolledIn = Math.max(0, headerBottom - editorTop);

      const page = Math.min(
        totalPages,
        Math.floor(scrolledIn / CYCLE_H) + 1,
      );

      setTotal(totalPages);
      setCurrent(page);
    };

    const scroller = getScroller();
    scroller.addEventListener("scroll", update, { passive: true });

    roRef.current = new ResizeObserver(update);
    const editorEl = document.querySelector<HTMLElement>(
      "[data-tiptap-root] .ProseMirror",
    );
    if (editorEl) roRef.current.observe(editorEl);

    update();

    return () => {
      scroller.removeEventListener("scroll", update);
      roRef.current?.disconnect();
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-label={`Page ${current} of ${total}`}
      className="pointer-events-none fixed bottom-6 right-6 z-40 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-sm select-none"
    >
      Page {current} of {total}
    </div>
  );
}
