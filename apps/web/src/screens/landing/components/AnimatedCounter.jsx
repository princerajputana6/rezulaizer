'use client';
import React, { useEffect, useState } from 'react';

const AnimatedCounter = ({ end = 0, duration = 2500, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const id = `counter-${end}-${suffix}`;

  useEffect(() => {
    const el = document.getElementById(id);
    if (!el || hasStarted) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setHasStarted(true);
        let startTime;
        let frameId;
        const animate = (currentTime) => {
          if (!startTime) startTime = currentTime;
          const progress = Math.min((currentTime - startTime) / duration, 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
      }
    }, { threshold: 0.2 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [id, end, duration, hasStarted]);

  return <span id={id}>{count.toLocaleString()}{suffix}</span>;
};

export default AnimatedCounter;