'use client';
import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  end: number;
  suffix?: string;
  decimals?: number;
}

export function CountUp({ end, suffix = '', decimals = 0 }: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver;
    hasAnimatedRef.current = false;

    const cancelRaf = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (ref.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            const duration = 2000; // 2 seconds
            const startTime = performance.now();

            const update = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // cubic ease out
              const easeProgress = 1 - Math.pow(1 - progress, 3);
              setCount(easeProgress * end);

              if (progress < 1) {
                rafRef.current = requestAnimationFrame(update);
              } else {
                setCount(end);
                rafRef.current = null;
              }
            };

            rafRef.current = requestAnimationFrame(update);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(ref.current);
    }
    return () => {
      cancelRaf();
      if (observer) observer.disconnect();
    };
  }, [end]);

  return <span ref={ref}>{count.toFixed(decimals)}{suffix}</span>;
}
