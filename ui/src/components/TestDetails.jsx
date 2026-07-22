import {
  Check,
  CircleCheck,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  Film,
  Image as ImageIcon,
} from "lucide-react";
import { Fragment, useState } from "react";

import {
  copyText,
  formatBytes,
  formatDuration,
  outcomeLabels,
  outcomeVariant,
  testDomain,
} from "../lib/report.js";
import { FailureDiagnostic } from "./FailureDiagnostic.jsx";
import { StepsTree } from "./StepsTree.jsx";
import { Badge } from "./ui/Badge.jsx";
import { Button } from "./ui/Button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/Dialog.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/Tabs.jsx";

export function TestDetails({ test, domains }) {
  const [selectedImage, setSelectedImage] = useState();
  const [copiedTrace, setCopiedTrace] = useState();
  const images = test.attachments.filter(({ kind }) => kind === "image");
  const videos = test.attachments.filter(({ kind }) => kind === "video");
  const traces = test.attachments.filter(({ kind }) => kind === "trace");
  const otherFiles = test.attachments.filter(({ kind }) => kind === "other");
  const videoPoster = images.at(-1)?.path;

  async function copyTraceCommand(attachment) {
    await copyText(`npx playwright show-trace portal-report/${attachment.path}`);
    setCopiedTrace(attachment.path);
    window.setTimeout(() => setCopiedTrace(undefined), 1500);
  }

  return (
    <Fragment>
      <div className="flex flex-wrap gap-2">
        <Badge variant={outcomeVariant(test.outcome)}>
          {outcomeLabels[test.outcome]}
        </Badge>
        <Badge variant="outline">{test.project}</Badge>
        <Badge variant="outline">{testDomain(test, domains)}</Badge>
        {test.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>

      {test.outcome === "unexpected" ? (
        <div className="mt-5">
          <FailureDiagnostic test={test} onOpenImage={setSelectedImage} />
        </div>
      ) : null}

      <Tabs defaultValue="summary" className="mt-6">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="evidence">
            Evidências ({test.attachments.length})
          </TabsTrigger>
          <TabsTrigger value="steps">Etapas</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Arquivo</p>
              <p className="mt-1 break-all font-medium">
                {test.file}:{test.line}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Duração</p>
              <p className="mt-1 font-medium">{formatDuration(test.duration)}</p>
            </div>
          </div>
          {test.errors.length ? (
            <div className="space-y-3">
              {test.errors.map((error, index) => (
                <div key={index} className="space-y-2">
                  {error.snippet ? (
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">
                      {error.snippet}
                    </pre>
                  ) : null}
                  <details className="rounded-lg border bg-card">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                      Stack completo
                    </summary>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t p-4 text-xs">
                      {error.stack ?? error.message}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <CircleCheck className="size-4" /> Execução concluída sem erros.
            </div>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-6">
          {test.attachments.length ? null : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma evidência foi gerada para este teste.
            </p>
          )}
          {images.length ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <ImageIcon className="size-4" /> Screenshots
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((attachment) => (
                  <button
                    key={attachment.path}
                    type="button"
                    onClick={() => setSelectedImage(attachment)}
                    className="group overflow-hidden rounded-lg border bg-muted text-left"
                  >
                    <img
                      src={attachment.path}
                      alt={attachment.name}
                      className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="flex items-center justify-between gap-2 bg-card px-3 py-2 text-xs">
                      <span className="truncate">{attachment.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatBytes(attachment.size)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {videos.length ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Film className="size-4" /> Vídeos
              </h3>
              <div className="space-y-3">
                {videos.map((attachment) => (
                  <div
                    key={attachment.path}
                    className="overflow-hidden rounded-lg border bg-card"
                  >
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      poster={videoPoster}
                      className="aspect-video w-full bg-black object-contain"
                      src={attachment.path}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div>
                        <p className="text-xs font-medium">{attachment.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBytes(attachment.size)} · WebM
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a href={attachment.path} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="size-3.5" /> Abrir
                          </Button>
                        </a>
                        <a href={attachment.path} download>
                          <Button variant="outline" size="sm">
                            <Download className="size-3.5" /> Baixar
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {traces.length ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <FileArchive className="size-4" /> Traces
              </h3>
              <div className="space-y-2">
                {traces.map((attachment) => (
                  <div
                    key={attachment.path}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(attachment.size)} · Playwright Trace
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyTraceCommand(attachment)}
                      >
                        {copiedTrace === attachment.path ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copiedTrace === attachment.path
                          ? "Copiado"
                          : "Copiar comando"}
                      </Button>
                      <a href={attachment.path} download>
                        <Button variant="outline" size="sm">
                          <Download className="size-3.5" /> Baixar
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {otherFiles.length ? (
            <section>
              <h3 className="mb-3 font-semibold">Outros arquivos</h3>
              {otherFiles.map((attachment) => (
                <a
                  key={attachment.path}
                  href={attachment.path}
                  download
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>{attachment.name}</span>
                  <Badge variant="outline">{formatBytes(attachment.size)}</Badge>
                </a>
              ))}
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="steps">
          {test.steps.length ? (
            <StepsTree steps={test.steps} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma etapa registrada.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(selectedImage)}
        onOpenChange={(open) => !open && setSelectedImage(undefined)}
      >
        <DialogContent>
          {selectedImage ? (
            <Fragment>
              <DialogTitle>{selectedImage.name}</DialogTitle>
              <DialogDescription>
                {formatBytes(selectedImage.size)} · clique fora ou pressione Esc
                para fechar
              </DialogDescription>
              <img
                src={selectedImage.path}
                alt={selectedImage.name}
                className="mt-4 max-h-[78vh] w-full rounded-lg bg-muted object-contain"
              />
              <div className="mt-3 flex justify-end">
                <a href={selectedImage.path} download>
                  <Button variant="outline" size="sm">
                    <Download className="size-3.5" /> Baixar screenshot
                  </Button>
                </a>
              </div>
            </Fragment>
          ) : null}
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
