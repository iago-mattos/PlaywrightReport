import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Clock3,
} from "lucide-react";

import { formatDuration } from "../lib/report.js";
import { Badge } from "./ui/Badge.jsx";

export function ResultRow({ test, onSelect }) {
  const icon =
    test.outcome === "expected" ? (
      <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
    ) : test.outcome === "unexpected" ? (
      <CircleAlert className="size-4 text-red-600 dark:text-red-400" />
    ) : (
      <Clock3 className="size-4 text-amber-600 dark:text-amber-400" />
    );

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        "--row-accent":
          test.outcome === "unexpected"
            ? "var(--danger)"
            : test.outcome === "expected"
              ? "var(--success)"
              : "var(--warning)",
      }}
      className="result-rail pressable flex w-full items-center justify-between gap-4 border-t px-5 py-3.5 text-left first:border-t-0 hover:bg-muted/55"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{test.title}</p>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {test.file}:{test.line}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatDuration(test.duration)}
          </span>
          {test.attachments.length ? (
            <Badge variant="outline">{test.attachments.length} evidências</Badge>
          ) : null}
        </div>
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}
