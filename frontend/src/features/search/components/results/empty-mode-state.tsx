import type { LucideIcon } from "lucide-react";

export function EmptyModeState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-border bg-background/25 p-8 text-center">
      <div>
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
