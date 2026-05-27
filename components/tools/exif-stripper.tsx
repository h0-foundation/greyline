"use client";

import { useRef, useState } from "react";
import {
  ImageOff,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Download,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExifResult = {
  ok: true;
  filename: string;
  originalSize: number;
  removedBytes: number;
  analysis: Record<string, unknown>;
  stripped: string;
};

function isExifResult(v: unknown): v is ExifResult {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    o.ok === true &&
    typeof o.filename === "string" &&
    typeof o.stripped === "string" &&
    typeof o.analysis === "object" &&
    o.analysis !== null
  );
}

// A metadata key counts as a location risk if its name references geolocation.
function isLocationKey(key: string): boolean {
  return /gps|location|\blat\b|latitude|\blng\b|longitude|geo|coord/i.test(key);
}

// Does any key in the analysis map flag location data, and is it actually set?
function hasLocationData(analysis: Record<string, unknown>): boolean {
  return Object.entries(analysis).some(
    ([k, v]) => isLocationKey(k) && truthyValue(v),
  );
}

function truthyValue(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0 && v !== "false";
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0;
  return false;
}

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function ExifStripper() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ExifResult | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    if (!file.type.includes("jpeg") && !/\.jpe?g$/i.test(file.name)) {
      setError("Please choose a JPEG image (.jpg / .jpeg).");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/tools/exif", { method: "POST", body: form });
      const data: unknown = await res.json();
      if (!res.ok || !isExifResult(data)) {
        const msg =
          typeof data === "object" && data && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Could not process this file.";
        setError(msg);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!result) return;
    const blob = base64ToBlob(result.stripped, "image/jpeg");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clean-${result.filename}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const gps = result ? hasLocationData(result.analysis) : false;

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 text-xs text-faint">
        <Lock className="size-3.5" />
        Processed locally — your photo never leaves this machine.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center transition-colors",
          dragging
            ? "border-accent-text bg-accent-subtle"
            : "border-border bg-card",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent-subtle text-accent-text">
          <ImageOff className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Drop a JPEG here, or pick one
          </p>
          <p className="text-xs text-muted-foreground">
            Nothing is uploaded to the internet — it stays on localhost.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Processing…
            </>
          ) : (
            <>
              <Upload className="size-4" /> Choose photo
            </>
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Verdict banner */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              gps
                ? "border-destructive/30 bg-destructive/10"
                : "border-success/30 bg-success/10",
            )}
          >
            <span className={cn(gps ? "text-destructive" : "text-success")}>
              {gps ? (
                <ShieldAlert className="size-5" />
              ) : (
                <ShieldCheck className="size-5" />
              )}
            </span>
            <div className="space-y-0.5">
              <p
                className={cn(
                  "text-sm font-semibold",
                  gps ? "text-destructive" : "text-success",
                )}
              >
                {gps ? "GPS location found" : "No location data found"}
              </p>
              <p className="text-xs text-muted-foreground">
                {gps
                  ? "This photo embeds where it was taken. Download the stripped copy and share that instead."
                  : "No coordinates detected. Other identifying metadata may still be present below."}
              </p>
            </div>
          </div>

          {/* Metadata table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Detected metadata
              </h2>
              <span className="truncate font-mono text-xs text-faint">
                {result.filename}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {Object.entries(result.analysis).map(([key, value]) => {
                  const risk = isLocationKey(key) && truthyValue(value);
                  return (
                    <tr key={key}>
                      <td
                        className={cn(
                          "px-4 py-2.5 align-top",
                          risk
                            ? "font-medium text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {risk && <MapPin className="size-3.5" />}
                          {formatKey(key)}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right align-top font-mono tabular-nums",
                          risk ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {formatValue(value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer / download */}
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                Stripped {formatBytes(result.removedBytes)} of metadata
              </p>
              <p className="font-mono text-xs text-faint tabular-nums">
                {formatBytes(result.originalSize)} →{" "}
                {formatBytes(
                  Math.max(0, result.originalSize - result.removedBytes),
                )}
              </p>
            </div>
            <Button type="button" onClick={download}>
              <Download className="size-4" />
              Download stripped copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
