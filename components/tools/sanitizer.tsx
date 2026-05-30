"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Download, Undo2, X, ImageUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizedFilename, normalizeRect, isDrawableRect, type Rect } from "@/lib/sanitize";

/* Image sanitizer + redactor — fully client-side, nothing is uploaded.
 *
 * Re-encoding through a canvas writes fresh pixels only, so EXIF/GPS/XMP/ICC and
 * any embedded thumbnail are dropped (the Dangerzone "render to pixels" idea for
 * raster images). Redaction rectangles are painted onto those pixels before
 * export, so the covered area is gone — not merely hidden behind an overlay. */

type Pt = { x: number; y: number };

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function Sanitizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [rects, setRects] = useState<Rect[]>([]);
  const [output, setOutput] = useState<{ url: string; size: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dragStart = useRef<Pt | null>(null);

  const redraw = useCallback((preview?: Rect) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h);
    if (preview && isDrawableRect(preview)) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillRect(preview.x, preview.y, preview.w, preview.h);
      ctx.restore();
    }
  }, [rects]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setOutput(null);
    setRects([]);
    setFileName(file.name);
    setOriginalSize(file.size);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      imgRef.current = img;
      URL.revokeObjectURL(url);
      redraw();
    };
    img.onerror = () => {
      setError("Could not read that file as an image.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function toCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>): Pt {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) / box.width) * canvas.width,
      y: ((e.clientY - box.top) / box.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!imgRef.current) return;
    dragStart.current = toCanvasCoords(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragStart.current) return;
    redraw(normalizeRect(dragStart.current, toCanvasCoords(e)));
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragStart.current) return;
    const r = normalizeRect(dragStart.current, toCanvasCoords(e));
    dragStart.current = null;
    if (isDrawableRect(r)) setRects((prev) => [...prev, r]);
  }

  function sanitize() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current || !fileName) return;
    redraw();
    const mime = format === "png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not encode the sanitized image.");
          return;
        }
        if (output) URL.revokeObjectURL(output.url);
        setOutput({ url: URL.createObjectURL(blob), size: blob.size, name: sanitizedFilename(fileName, format) });
      },
      mime,
      format === "jpg" ? 0.92 : undefined,
    );
  }

  const hasImage = Boolean(fileName);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <label htmlFor="sanitize-input" className="block text-sm font-medium text-foreground">
          Image to sanitize
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Stays in your browser — nothing is uploaded. The copy is re-encoded from pixels only, so EXIF/GPS,
          XMP, ICC profiles, and embedded thumbnails are dropped.
        </p>
        <input
          id="sanitize-input"
          type="file"
          accept="image/*"
          onChange={onFile}
          className="mt-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-subtle file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-text hover:file:bg-accent/20"
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {hasImage && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eraser className="size-4 text-faint" /> Drag on the image to redact — boxes are burned into the pixels.
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRects((r) => r.slice(0, -1))} disabled={rects.length === 0}>
                <Undo2 className="size-4" /> Undo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRects([])} disabled={rects.length === 0}>
                <X className="size-4" /> Clear
              </Button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="max-h-[60vh] w-full cursor-crosshair touch-none rounded-md border border-border bg-[repeating-conic-gradient(#0000_0_25%,#8881_0_50%)] [background-size:16px_16px]"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-md border border-border text-sm">
              {(["png", "jpg"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 ${format === f ? "bg-accent-subtle text-accent-text" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <Button onClick={sanitize}>
              <ShieldCheck className="size-4" /> Sanitize
            </Button>
            {rects.length > 0 && <span className="text-xs text-faint">{rects.length} redaction(s)</span>}
          </div>
        </div>
      )}

      {output && (
        <div className="rounded-xl border border-success/40 bg-success/5 p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <ShieldCheck className="size-4 text-success" /> Sanitized copy ready
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Original {fmtBytes(originalSize)} → sanitized {fmtBytes(output.size)}. Metadata removed
            {rects.length > 0 ? `, ${rects.length} region(s) redacted into the pixels` : ""}.
          </p>
          <a
            href={output.url}
            download={output.name}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            <Download className="size-4" /> Download {output.name}
          </a>
        </div>
      )}

      {!hasImage && (
        <p className="flex items-center gap-2 text-sm text-faint">
          <ImageUp className="size-4" /> Choose an image to begin. Supports PNG, JPEG, WebP, GIF, BMP.
        </p>
      )}
    </div>
  );
}
