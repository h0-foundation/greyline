/* Near-duplicate image detection over perceptual hashes — pure, dependency-free.
 *
 * Given a set of already-hashed images (aHash + dHash, produced in-browser by
 * lib/perceptual-hash), find the pairs that are perceptually close enough to be
 * the same or a recycled/edited image. dHash is the primary signal — it is
 * robust to brightness and rescaling — so thresholding and ranking use the dHash
 * Hamming distance; the aHash distance is reported as corroboration but is NOT
 * used for thresholding, because flat / low-detail images alias under aHash and
 * would produce false matches. The human reviews each flagged pair.
 */

import { hammingDistance } from "./perceptual-hash";

export interface HashedImage {
  /** Stable identifier (e.g. a slot id) used to key the pair. */
  id: string;
  name: string;
  aHash: string;
  dHash: string;
}

export interface DuplicatePair {
  a: HashedImage;
  b: HashedImage;
  /** dHash Hamming distance (0-64) — the canonical near-duplicate signal. */
  dDistance: number;
  /** aHash Hamming distance (0-64) — corroborating, weaker. */
  aDistance: number;
  /** Compact badge label derived from the dHash distance. */
  label: string;
}

/** A short badge label for a dHash Hamming distance (kept compact for the UI). */
export function compactLabel(dDistance: number): string {
  if (dDistance === 0) return "near-identical";
  if (dDistance <= 5) return "very similar";
  if (dDistance <= 10) return "similar";
  return "possibly related";
}

/**
 * Return every pair whose dHash Hamming distance is within `threshold`
 * (default 12 = "possibly related" or closer), ordered closest-first. O(n²) over
 * the input — fine for the handful of evidence images in a single case.
 */
export function findNearDuplicates(images: HashedImage[], threshold = 12): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const a = images[i];
      const b = images[j];
      const dDistance = hammingDistance(a.dHash, b.dHash);
      if (dDistance > threshold) continue;
      pairs.push({
        a,
        b,
        dDistance,
        aDistance: hammingDistance(a.aHash, b.aHash),
        label: compactLabel(dDistance),
      });
    }
  }
  pairs.sort((x, y) => x.dDistance - y.dDistance || x.aDistance - y.aDistance);
  return pairs;
}
