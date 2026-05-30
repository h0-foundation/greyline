"use client";

import { useState } from "react";
import { Fingerprint, Upload, Info, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { grayscale, aHash, dHash, hammingDistance, similarityLabel } from "@/lib/perceptual-hash";

type Hashed = { url: string; name: string; ahash: string; dhash: string };

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
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff"; // flatten transparency to a stable background
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return grayscale(ctx.getImageData(0, 0, w, h).data, w, h);
}

async function hashFile(file: File): Promise<Hashed> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  return { url, name: file.name, ahash: aHash(grayAt(img, 8, 8)), dhash: dHash(grayAt(img, 9, 8)) };
}

function Slot({ label, value, onPick }: { label: string; value: Hashed | null; onPick: (f: File) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-faint transition-colors hover:border-primary/40 hover:text-foreground">
        <Upload className="size-5" aria-hidden />
        <span>{value ? "Replace image" : `Choose ${label.toLowerCase()}`}</span>
        <input
          type="file"
          accept="image/*"
          aria-label={label}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
      </label>
      {value && (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt={value.name} className="max-h-40 w-full rounded-md object-contain" />
          <dl className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-faint">dHash</dt>
              <dd className="font-mono tabular-nums text-foreground">{value.dhash}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-faint">aHash</dt>
              <dd className="font-mono tabular-nums text-foreground">{value.ahash}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

export function ImageHashTool() {
  const [a, setA] = useState<Hashed | null>(null);
  const [b, setB] = useState<Hashed | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(which: "a" | "b", file: File) {
    setError(null);
    try {
      const hashed = await hashFile(file);
      if (which === "a") setA(hashed);
      else setB(hashed);
    } catch {
      setError("Couldn't read that image. Try a standard JPG/PNG/WebP.");
    }
  }

  const dist = a && b ? hammingDistance(a.dhash, b.dhash) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-4 text-sm text-faint">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p>
          Fingerprint an image to spot near-duplicates — recycled, cropped, recompressed, or lightly edited photos sit a small distance apart.
          Everything is computed in your browser; <strong className="text-foreground">the images never leave this machine</strong>. For a web match,
          hand the original to a reverse-image search yourself.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Slot label="First image" value={a} onPick={(f) => pick("a", f)} />
        <Slot label="Second image (optional)" value={b} onPick={(f) => pick("b", f)} />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {dist !== null && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-faint">
              <Fingerprint className="size-4" aria-hidden /> dHash Hamming distance
            </span>
            <span className="font-mono text-lg tabular-nums text-foreground">{dist}/64</span>
          </div>
          <p className={cn("mt-1.5 font-medium", dist <= 10 ? "text-foreground" : "text-faint")}>{similarityLabel(dist)}</p>
        </div>
      )}

      <p className="text-xs text-faint">
        Tip: pair this with the{" "}
        <Link href="/tools/chrono" className="inline-flex items-center gap-1 text-accent-text hover:underline">
          Chronolocation lab <ArrowRight className="size-3" />
        </Link>{" "}
        and the{" "}
        <Link href="/tools/verify" className="inline-flex items-center gap-1 text-accent-text hover:underline">
          verification playbook <ArrowRight className="size-3" />
        </Link>
        .
      </p>
    </div>
  );
}
