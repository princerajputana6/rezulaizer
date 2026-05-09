'use client';
import { useEffect } from 'react';

// Adds a reveal effect using Tailwind classes only (no custom CSS)
// Elements should have: 'opacity-0 translate-y-6 transition-all duration-700'
// and this hook will add 'opacity-100 translate-y-0' when in view.
export function useScrollReveal(selector = '.reveal') {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) return;

    const onIntersect = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-6');
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(onIntersect, {
      root: null,
      threshold: 0.15,
    });

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector]);
}