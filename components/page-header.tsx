import { cn } from "@/lib/utils";

type Meta = { label: string; value: string };

/**
 * Dossier header — editorial serif title on the left, a mono metadata cluster on
 * the right, closed by a full-width hairline rule. The "classified file" opening
 * from the Field-Atlas visual language.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: Meta[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-medium leading-[0.95] tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-end gap-4">
          {meta && meta.length > 0 && (
            <dl className="hidden gap-4 sm:flex">
              {meta.map((m) => (
                <div key={m.label} className="text-right">
                  <dt className="label-caps">{m.label}</dt>
                  <dd className="font-mono text-sm tabular-nums text-foreground">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div className="h-px w-full bg-border" />
    </div>
  );
}
