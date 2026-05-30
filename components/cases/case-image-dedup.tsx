"use client";

import { useState } from "react";
import { Images, Upload, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { grayscale, aHash, dHash } from "@/lib/perceptual-hash";
import { findNearDuplicates, type HashedImage, type DuplicatePair } from "@/lib/image-compare";

/* Per-case near-duplicate image check. The investigator drops the case's
 * evidence images in; each is perceptually hashed IN THE BROWSER (canvas →
 * luma → aHash/dHash) and cross-compared, flagging recycled or lightly-edited
 * duplicates. Images are never uploaded or stored — this is a local comparison
 * aid, so it doesn't touch the case's chain of custody. Same canvas→hash
 * pipeline as components/tools/image-hash.tsx (draw at 8×8 for aHash, 9×8 for
 * dHash). */

type Pic = HashedImage & { url: string };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function grayAt(img: HTMLImageElement, w: number, h: number): number[] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#fff"; // flatten transparency to a stable background
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return grayscale(ctx.getImageData(0, 0, w, h).data, w, h);
}

async function hashFile(file: File, id: string): Promise<Pic> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  return {
    id,
    name: file.name,
    aHash: aHash(grayAt(img, 8, 8)),
    dHash: dHash(grayAt(img, 9, 8)),
    url,
  };
}

export function CaseImageDedup() {
  const [pics, setPics] = useState<Pic[]>([]);
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [nextId, setNextId] = useState(0);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const hashed: Pic[] = [];
    let id = nextId;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        hashed.push(await hashFile(f, `img-${id++}`));
      } catch {
        /* undecodable image — skip it */
      }
    }
    setNextId(id);
    const next = [...pics, ...hashed];
    setPics(next);
    setPairs(findNearDuplicates(next));
    setBusy(false);
  }

  function reset() {
    for (const p of pics) URL.revokeObjectURL(p.url);
    setPics([]);
    setPairs(null);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <h2 className="mb-1 inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <Images className="size-4 text-faint" /> Near-duplicate image check
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Drop this case&apos;s evidence images to flag recycled or lightly-edited duplicates.
        Hashing runs entirely in your browser — images are never uploaded or stored.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-accent/40">
          <Upload className="size-4 text-faint" />
          <span>Add images</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label="Add case images"
            onChange={(e) => onPick(e.target.files)}
          />
        </label>
        {pics.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <X className="size-4" /> Clear
          </Button>
        )}
        {busy && <span className="text-xs text-faint">Hashing…</span>}
      </div>

      {pics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {pics.map((p) => (
            <figure key={p.id} className="w-24 space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, never remote */}
              <img src={p.url} alt={p.name} className="h-24 w-24 rounded-md border border-border object-cover" />
              <figcaption className="truncate font-mono text-[10px] text-faint" title={p.name}>
                {p.dHash.slice(0, 8)}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {pairs && (
        <div className="mt-5 space-y-3">
          {pics.length < 2 ? (
            <p className="text-sm text-faint">Add at least two images to compare.</p>
          ) : pairs.length === 0 ? (
            <p className="inline-flex items-center gap-2 text-sm text-success">
              No near-duplicate images found among {pics.length}.
            </p>
          ) : (
            <>
              <p className="inline-flex items-center gap-2 text-sm text-foreground">
                <AlertTriangle className="size-4 text-warning" />
                {pairs.length} near-duplicate pair{pairs.length === 1 ? "" : "s"} found.
              </p>
              <ul className="space-y-2">
                {pairs.map((pr) => (
                  <li
                    key={`${pr.a.id}-${pr.b.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/50 p-3"
                  >
                    <span className="inline-flex items-center gap-2 text-sm text-foreground">
                      <span className="font-mono text-xs">{pr.a.name}</span>
                      <span className="text-faint">↔</span>
                      <span className="font-mono text-xs">{pr.b.name}</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-foreground">
                        {pr.label}
                      </span>
                      <span className="font-mono text-[11px] text-faint">
                        dHash {pr.dDistance} · aHash {pr.aDistance}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
