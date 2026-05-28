"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { VisitedCountry } from "$server/db/repositories/travel";

const TILT = [-2, 1.5, -1, 2, -1.5, 1];

/**
 * The passport-stamp wall — each visited country is a tilted, dashed "stamp"
 * that drops in on mount (staggered ledger-reveal) and straightens + lifts on
 * hover. The signature collectible moment. Honors reduced-motion.
 */
export function StampWall({ visited }: { visited: VisitedCountry[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {visited.map((c, i) => {
        const tilt = TILT[i % TILT.length];
        return (
          <motion.li
            key={c.country_code}
            initial={reduce ? false : { opacity: 0, scale: 0.86, rotate: tilt * 2 }}
            animate={{ opacity: 1, scale: 1, rotate: tilt }}
            transition={{
              delay: reduce ? 0 : Math.min(i, 24) * 0.025,
              type: "spring",
              stiffness: 460,
              damping: 22,
            }}
            style={{ rotate: `${tilt}deg` }}
          >
            <Link
              href={`/countries/${c.country_code}`}
              className="group flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-primary/35 bg-primary/[0.05] p-2 text-center transition-[transform,border-color,background-color] duration-[var(--duration-snap)] ease-out hover:rotate-0 hover:scale-[1.05] hover:border-primary/60 hover:bg-primary/[0.09]"
            >
              <span className="text-2xl leading-none grayscale-[0.15] transition-[filter] group-hover:grayscale-0" aria-hidden>
                {c.flag || "🏳️"}
              </span>
              <span className="block w-full truncate text-[11px] font-semibold uppercase tracking-wide text-accent-text">
                {c.name}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-faint">
                {c.first ? c.first.slice(0, 4) : "—"} · {c.trips}×
              </span>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
