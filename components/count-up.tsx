"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/** Eased count-up for headline stats. Honors reduced-motion (renders the final
 *  value immediately) and only runs once on mount. */
export function CountUp({
  to,
  duration = 0.9,
  className,
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);
  const ran = useRef(false);

  useEffect(() => {
    if (reduce || ran.current) return;
    ran.current = true;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, duration, reduce]);

  return (
    <span className={className}>{value.toLocaleString("en")}</span>
  );
}
