"use client";

import { useState } from "react";
import { FileScan, Upload, Download, ShieldCheck, ShieldAlert, AlertTriangle, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeAndStrip, type MetaBlock, type ImageFormat } from "@/lib/metadata-strip";

/* Universal, lossless metadata stripper — fully client-side, nothing uploaded.
 *
 * Unlike the canvas re-encode in /tools/sanitize (which works on any image but
 * recompresses), this does byte-level surgery on the container — JPEG APPn/COM
 * segments, PNG/WebP metadata chunks — so the compressed pixel data is untouched
 * (no quality loss) and the tool can show exactly which metadata blocks it found
 * before removing them. Falls back to suggesting the sanitizer for formats it
 * can't strip losslessly. */

type Result = {
  name: string;
  format: ImageFormat;
  supported: boolean;
  removed: MetaBlock[];
  removedBytes: number;
  originalSize: number;
  outUrl: string | null;
  outName: string;
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const FORMAT_LABEL: Record<ImageFormat, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
  unknown: "Unrecognised",
};

function strippedName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name}-clean`;
  return `${name.slice(0, dot)}-clean${name.slice(dot)}`;
}

export function MetadataStripper() {
  const [stripIcc, setStripIcc] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    if (result?.outUrl) URL.revokeObjectURL(result.outUrl);
    setResult(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const res = analyzeAndStrip(bytes, { stripIcc });
      const mime =
        res.format === "jpeg" ? "image/jpeg" : res.format === "png" ? "image/png" : res.format === "webp" ? "image/webp" : "application/octet-stream";
      const outUrl =
        res.supported && res.removed.length > 0
          ? URL.createObjectURL(
              // Slice to a plain ArrayBuffer so the BlobPart type is satisfied
              // regardless of the source buffer kind.
              new Blob([res.output.slice().buffer as ArrayBuffer], { type: mime }),
            )
          : null;
      setResult({
        name: file.name,
        format: res.format,
        supported: res.supported,
        removed: res.removed,
        removedBytes: res.removedBytes,
        originalSize: bytes.length,
        outUrl,
        outName: strippedName(file.name),
      });
    } catch {
      setError("Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  const sensitiveCount = result?.removed.filter((r) => r.sensitive).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <label htmlFor="meta-input" className="block text-sm font-medium text-foreground">
          Image to scan &amp; strip
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Runs entirely in your browser — nothing is uploaded. JPEG, PNG and WebP are cleaned
          <strong className="text-foreground"> losslessly</strong> (byte-level surgery, no recompression). For other formats,
          use <a href="/tools/sanitize" className="text-accent-text hover:underline">Sanitize &amp; redact</a> (re-encodes).
        </p>
        <input
          id="meta-input"
          type="file"
          accept="image/*"
          onChange={onFile}
          className="mt-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-subtle file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-text hover:file:bg-accent/20"
        />
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={stripIcc} onChange={(e) => setStripIcc(e.target.checked)} className="size-3.5" />
          Also remove the ICC colour profile (can shift colours; not normally identifying)
        </label>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        {busy && <p className="mt-2 text-sm text-faint">Scanning…</p>}
      </div>

      {result && !result.supported && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <FileWarning className="size-4 text-warning" /> {FORMAT_LABEL[result.format]} — not supported for lossless stripping
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This tool does byte-level surgery on JPEG/PNG/WebP only. To clean a {FORMAT_LABEL[result.format]} file, use{" "}
            <a href="/tools/sanitize" className="text-accent-text hover:underline">Sanitize &amp; redact</a>, which re-encodes from
            pixels and drops all metadata (with some quality loss).
          </p>
        </div>
      )}

      {result && result.supported && result.removed.length === 0 && (
        <div className="rounded-xl border border-success/40 bg-success/5 p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <ShieldCheck className="size-4 text-success" /> No metadata found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {FORMAT_LABEL[result.format]} · {fmtBytes(result.originalSize)}. This file carries no EXIF, XMP, IPTC, text, or
            other strippable metadata{stripIcc ? "" : " (ICC profile left intact)"}. Nothing to remove.
          </p>
        </div>
      )}

      {result && result.supported && result.removed.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
            {sensitiveCount > 0 ? <ShieldAlert className="size-4 text-destructive" /> : <FileScan className="size-4 text-faint" />}
            {result.removed.length} metadata block{result.removed.length === 1 ? "" : "s"} found
            {sensitiveCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-destructive">
                <AlertTriangle className="size-3.5" /> {sensitiveCount} potentially identifying
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {FORMAT_LABEL[result.format]} · {fmtBytes(result.originalSize)} → {fmtBytes(result.originalSize - result.removedBytes)}{" "}
            ({fmtBytes(result.removedBytes)} removed). Pixels untouched.
          </p>

          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {result.removed.map((m, i) => (
              <li key={`${m.tag}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-sm text-foreground">
                  <span className="font-mono text-xs text-faint">{m.tag}</span>
                  {m.label}
                </span>
                <span className="inline-flex items-center gap-2">
                  {m.sensitive && (
                    <span className="rounded-md border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                      identifying
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-faint">{fmtBytes(m.bytes)}</span>
                </span>
              </li>
            ))}
          </ul>

          {result.outUrl && (
            <a
              href={result.outUrl}
              download={result.outName}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              <Download className="size-4" /> Download {result.outName}
            </a>
          )}
        </div>
      )}

      {!result && !busy && (
        <p className="flex items-center gap-2 text-sm text-faint">
          <Upload className="size-4" /> Choose an image to scan its metadata and download a cleaned copy.
        </p>
      )}
    </div>
  );
}
