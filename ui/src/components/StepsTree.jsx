import { formatDuration } from "../lib/report.js";

export function StepsTree({ steps, depth = 0 }) {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={`${step.title}-${index}`} style={{ marginLeft: `${depth * 14}px` }}>
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-card px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.category}</p>
              {step.error ? (
                <p className="mt-1 text-xs text-red-600">{step.error}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDuration(step.duration)}
            </span>
          </div>
          {step.steps.length ? (
            <StepsTree steps={step.steps} depth={depth + 1} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
