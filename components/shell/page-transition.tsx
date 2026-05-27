"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { TRANSITION } from "@/lib/motion";

/**
 * Subtle enter-only transition on route change. App Router renders new content
 * before exit can complete, so we animate entrances only — calm, no jank.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSITION.default}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
