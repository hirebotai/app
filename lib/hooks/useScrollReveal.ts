'use client';

import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref: elementRef, isVisible };
}

export function useStaggeredReveal(itemCount: number, options: UseScrollRevealOptions = {}) {
  const { ref, isVisible } = useScrollReveal(options);
  const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(itemCount).fill(false));

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      setVisibleItems((prev) =>
        prev.map((_, i) => i < Math.floor((Date.now() / 100) % (itemCount + 1)))
      );
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, itemCount]);

  return { ref, visibleItems };
}