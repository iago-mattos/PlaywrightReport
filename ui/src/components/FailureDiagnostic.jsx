import {
  Check,
  CircleAlert,
  Copy,
  Download,
} from "lucide-react";
import { useState } from "react";

import { copyText, parseExpectedReceived } from "../lib/report.js";
import { Button } from "./ui/Button.jsx";

export function FailureDiagnostic({ test, onOpenImage }) {
  const [copied, setCopied] = useState(false);
  const error = test.errors[0];
  const lastImage = test.attachments
    .filter(({ kind }) => kind === "image")
    .at(-1);
  const trace = test.attachments.find(({ kind }) => kind === "trace");
  const comparison = error ? parseExpectedReceived(error) : {};

  if (!error) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/40">
      <div className="flex items-start gap-3 border-b border-red-200 p-4 dark:border-red-900">
        <div className="rounded-lg bg-red-100 p-2 text-red-700 dark:bg-red-900 dark:text-red-200">
          <CircleAlert className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">
            Diagnóstico da falha
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-red-800 dark:text-red-200">
            {error.message.split("\n")[0]}
          </p>
          {error.location ? (
            <p className="mt-2 break-all text-xs text-red-700 dark:text-red-300">
              {error.location.file}:{error.location.line}:{error.location.column}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-3">
          {comparison.expected || comparison.received ? (
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-background p-3 dark:border-emerald-900">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Esperado
                </p>
                <p className="mt-1 break-words">{comparison.expected ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-background p-3 dark:border-red-900">
                <p className="font-semibold text-red-700 dark:text-red-300">
                  Recebido
                </p>
                <p className="mt-1 break-words">{comparison.received ?? "—"}</p>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await copyText(error.stack ?? error.message);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar erro"}
            </Button>
            {trace ? (
              <a href={trace.path} download>
                <Button variant="outline" size="sm">
                  <Download className="size-3.5" /> Baixar trace
                </Button>
              </a>
            ) : null}
          </div>
        </div>
        {lastImage ? (
          <button
            type="button"
            onClick={() => onOpenImage(lastImage)}
            className="group overflow-hidden rounded-lg border bg-background text-left"
          >
            <img
              src={lastImage.path}
              alt="Última screenshot antes da falha"
              className="aspect-video w-full object-cover transition group-hover:scale-[1.02]"
            />
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
              Abrir última screenshot
            </p>
          </button>
        ) : null}
      </div>
    </section>
  );
}
