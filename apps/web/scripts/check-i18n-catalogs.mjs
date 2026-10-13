import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const provider = await readFile(resolve(root, "components/i18n/TranslationProvider.tsx"), "utf8");
const localeBlock = provider.match(/export const ZION_LOCALES = \[([\s\S]*?)\] as const;/)?.[1];
const sourceBlock = provider.match(/const sourceStrings = \{([\s\S]*?)\} as const;/)?.[1];
if (!localeBlock || !sourceBlock) throw new Error("Could not find ZION_LOCALES/sourceStrings declarations.");

const locales = [...localeBlock.matchAll(/"([a-zA-Z-]+)"/g)].map((match) => match[1]);
const keys = [...sourceBlock.matchAll(/(?:^|[,\n])\s*([A-Za-z_$][\w$]*)\s*:\s*"/g)].map((match) => match[1]);
const uniqueKeys = [...new Set(keys)];
const catalogDir = resolve(root, "components/i18n/catalogs");
const files = new Set((await readdir(catalogDir)).filter((name) => name.endsWith(".json")));
const registry = await readFile(resolve(catalogDir, "index.ts"), "utf8");
const errors = [];

for (const locale of locales) {
  const file = `${locale}.json`;
  if (!files.has(file)) {
    errors.push(`${locale}: missing ${file}`);
    continue;
  }
  if (!registry.includes(`./${file.replace(".json", "")}.json`)) errors.push(`${locale}: not registered in index.ts`);
  const catalog = JSON.parse(await readFile(resolve(catalogDir, file), "utf8"));
  const missing = uniqueKeys.filter((key) => typeof catalog[key] !== "string" || !catalog[key].trim());
  const extra = Object.keys(catalog).filter((key) => !uniqueKeys.includes(key));
  if (missing.length) errors.push(`${locale}: missing/empty keys: ${missing.join(", ")}`);
  if (extra.length) errors.push(`${locale}: unexpected keys: ${extra.join(", ")}`);
}

const unexpectedFiles = [...files].filter((name) => !locales.includes(name.slice(0, -5)));
if (unexpectedFiles.length) errors.push(`Unregistered catalog files: ${unexpectedFiles.join(", ")}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${locales.length} locale catalogs × ${uniqueKeys.length} messages.`);
}
