import React, { useState, useEffect } from 'react';

export default function CountUp({ value, duration = 1500, isSpinning = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let animationFrameId;

    if (isSpinning) {
      let lastUpdate = 0;
      const spin = (timestamp) => {
        if (!lastUpdate || timestamp - lastUpdate > 30) {
          // Update roughly every 30ms with a random number
          setCount(Math.floor(Math.random() * 99));
          lastUpdate = timestamp;
        }
        animationFrameId = requestAnimationFrame(spin);
      };
      animationFrameId = requestAnimationFrame(spin);
      return () => cancelAnimationFrame(animationFrameId);
    }

    // Standard CountUp
    const target = parseFloat(value);
    if (isNaN(target)) {
      setCount(value);
      return;
    }

    let startTime = null;
    const startValue = parseFloat(count) || 0; // Use current count if recovering from spin
    const distance = target - startValue;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const current = startValue + easeProgress * distance;

      if (target % 1 !== 0) {
        setCount(current.toFixed(1));
      } else {
        setCount(Math.floor(current));
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration, isSpinning]);

  return <span>{count}</span>;
}
