import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { defaultConfig } from "./defaults.mjs";

export async function loadConfig(cwd) {
  const configPath = resolve(cwd, "prognum-report.config.mjs");
  if (!existsSync(configPath)) return defaultConfig;

  const imported = await import(
    `${pathToFileURL(configPath).href}?updated=${statSync(configPath).mtimeMs}`
  );
  return {
    ...defaultConfig,
    ...(imported.default ?? {}),
    domains: imported.default?.domains ?? {},
    pdf: {
      ...defaultConfig.pdf,
      ...(imported.default?.pdf ?? {}),
      metadataFields: imported.default?.pdf?.metadataFields ?? {},
    },
  };
}
