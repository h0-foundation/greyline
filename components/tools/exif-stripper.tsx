"use client";

import { useRef, useState } from "react";
import {
  ImageOff,
  MapPin,
  Camera,
  Clock,
  FileWarning,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Download,
  Loader2,
  Lock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "high" | "med" | "low";

type ExifLint = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
};

type ExifAnalysis = {
  gps?: { lat: number; lng: number; alt?: number };
  device?: {
    make?: string;
    model?: string;
    bodySerial?: string;
    lensSerial?: string;
    lens?: string;
  };
  time?: { original?: string; digitized?: string; modified?: string };
  software?: string;
  orientation?: number;
  hasMakerNote: boolean;
  hasThumbnail: boolean;
  lint: ExifLint[];
};

type ExifResult = {
  ok: true;
  filename: string;
  originalSize: number;
  removedBytes: number;
  analysis: ExifAnalysis;
  stripped: string;
};

function isAnalysis(v: unknown): v is ExifAnalysis {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.hasMakerNote === "boolean" &&
    typeof o.hasThumbnail === "boolean" &&
    Array.isArray(o.lint)
  );
}

function isExifResult(v: unknown): v is ExifResult {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    o.ok === true &&
    typeof o.filename === "string" &&
    typeof o.stripped === "string" &&
    isAnalysis(o.analysis)
  );
}

const ORIENTATION_LABELS: Record<number, string> = {
  1: "Normal",
  2: "Mirrored horizontal",
  3: "Rotated 180°",
  4: "Mirrored vertical",
  5: "Mirrored + rotated 90° CCW",
  6: "Rotated 90° CW",
  7: "Mirrored + rotated 90° CW",
  8: "Rotated 90° CCW",
};

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

const SEVERITY_STYLE: Record<Severity, { text: string; label: string }> = {
  high: { text: "text-destructive", label: "High" },
  med: { text: "text-spark", label: "Medium" },
  low: { text: "text-accent-text", label: "Low" },
};

type Row = { label: string; value: string; serial?: boolean };

function buildRows(a: ExifAnalysis): Row[] {
  const rows: Row[] = [];
  const d = a.device;
  if (d?.make) rows.push({ label: "Camera make", value: d.make });
  if (d?.model) rows.push({ label: "Camera model", value: d.model });
  if (d?.lens) rows.push({ label: "Lens", value: d.lens });
  if (d?.bodySerial)
    rows.push({ label: "Body serial number", value: d.bodySerial, serial: true });
  if (d?.lensSerial)
    rows.push({ label: "Lens serial number", value: d.lensSerial, serial: true });
  if (a.time?.original)
    rows.push({ label: "Captured", value: a.time.original });
  if (a.time?.digitized)
    rows.push({ label: "Digitized", value: a.time.digitized });
  if (a.time?.modified)
    rows.push({ label: "Modified", value: a.time.modified });
  if (a.software) rows.push({ label: "Software / OS", value: a.software });
  if (a.orientation !== undefined)
    rows.push({
      label: "Orientation",
      value: ORIENTATION_LABELS[a.orientation] ?? `Code ${a.orientation}`,
    });
  if (a.hasMakerNote)
    rows.push({ label: "Vendor MakerNote", value: "Present" });
  if (a.hasThumbnail)
    rows.push({ label: "Embedded thumbnail", value: "Present" });
  return rows;
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

  const analysis = result?.analysis;
  const gps = analysis?.gps;
  const rows = analysis ? buildRows(analysis) : [];
  const foundAnything =
    !!analysis && (!!gps || rows.length > 0 || analysis.lint.length > 0);

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

      {result && analysis && (
        <div className="space-y-5">
          {/* Verdict banner */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              gps
                ? "border-destructive/30 bg-destructive/10"
                : foundAnything
                  ? "border-spark/30 bg-spark/10"
                  : "border-success/30 bg-success/10",
            )}
          >
            <span
              className={cn(
                gps
                  ? "text-destructive"
                  : foundAnything
                    ? "text-spark"
                    : "text-success",
              )}
            >
              {gps || foundAnything ? (
                <ShieldAlert className="size-5" />
              ) : (
                <ShieldCheck className="size-5" />
              )}
            </span>
            <div className="space-y-0.5">
              <p
                className={cn(
                  "text-sm font-semibold",
                  gps
                    ? "text-destructive"
                    : foundAnything
                      ? "text-spark"
                      : "text-success",
                )}
              >
                {gps
                  ? "Exact location found in this photo"
                  : foundAnything
                    ? "Identifying metadata found"
                    : "No identifying metadata found"}
              </p>
              <p className="text-xs text-muted-foreground">
                {gps
                  ? "This photo embeds the precise coordinate where it was taken, plus the details below."
                  : foundAnything
                    ? "No GPS coordinate, but the metadata below can still identify your device or context."
                    : "Nothing notable detected. Download the clean copy anyway to be safe."}
              </p>
            </div>
          </div>

          {/* GPS reveal */}
          {gps && (
            <div className="overflow-hidden rounded-xl border border-destructive/30 bg-card shadow-xs">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <MapPin className="size-4 text-destructive" />
                <h2 className="text-sm font-semibold text-foreground">
                  This is where the photo was taken
                </h2>
              </div>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-mono text-lg tabular-nums text-destructive">
                    {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Decimal degrees (latitude, longitude)
                    {gps.alt !== undefined
                      ? ` · altitude ${gps.alt.toFixed(0)} m`
                      : ""}
                  </p>
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=14/${gps.lat}/${gps.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-subtle"
                >
                  <ExternalLink className="size-3.5" />
                  View on map
                </a>
              </div>
            </div>
          )}

          {/* Privacy lint */}
          {analysis.lint.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <FileWarning className="size-4 text-spark" />
                <h2 className="text-sm font-semibold text-foreground">
                  Privacy lint
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {analysis.lint.map((l) => {
                  const sev = SEVERITY_STYLE[l.severity];
                  return (
                    <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("mt-0.5", sev.text)}
                      >
                        {sev.label}
                      </Badge>
                      <div className="space-y-0.5">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            sev.text,
                          )}
                        >
                          {l.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.detail}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Decoded metadata table */}
          {rows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Camera className="size-4 text-muted-foreground" />
                  Decoded metadata
                </h2>
                <span className="truncate font-mono text-xs text-faint">
                  {result.filename}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-2.5 align-top text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {row.serial && (
                            <FileWarning className="size-3.5 text-destructive" />
                          )}
                          {row.label}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right align-top font-mono tabular-nums",
                          row.serial ? "text-destructive" : "text-foreground",
                        )}
                      >
                        <span className="inline-flex items-center justify-end gap-2">
                          {row.value}
                          {row.serial && (
                            <Badge
                              variant="outline"
                              className="text-destructive"
                            >
                              cross-photo linkable
                            </Badge>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

          {/* Confirmation */}
          <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
            <ShieldCheck className="size-4 shrink-0" />
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 opacity-70" />
              All of the above — coordinates, serials, timestamps, software and
              thumbnail — is removed in the clean copy.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
