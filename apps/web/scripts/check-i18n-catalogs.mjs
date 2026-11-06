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
  if (!registry.includes(`./${file.replace(".json", "")}.json`)) errors.push(`${locale}: not imported in catalog registry`);
  const exposedAsShorthand = registry.includes(`  ${locale},`);
  const exposedAsNamed = registry.includes(`  "${locale}":`);
  if (!exposedAsShorthand && !exposedAsNamed) errors.push(`${locale}: not exposed by catalog registry`);

  let catalog;
  try {
    catalog = JSON.parse(await readFile(resolve(catalogDir, file), "utf8"));
  } catch (error) {
    errors.push(`${locale}: invalid JSON (${error.message})`);
    continue;
  }
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    errors.push(`${locale}: catalog must be a JSON object`);
    continue;
  }

  const extra = Object.keys(catalog).filter((key) => !uniqueKeys.includes(key));
  if (extra.length) errors.push(`${locale}: unexpected keys: ${extra.join(", ")}`);
}

const english = JSON.parse(await readFile(resolve(catalogDir, "en.json"), "utf8"));
const missingEnglish = uniqueKeys.filter((key) => typeof english[key] !== "string" || !english[key].trim());
if (missingEnglish.length) errors.push(`en: required fallback strings missing: ${missingEnglish.join(", ")}`);

const unexpectedFiles = [...files].filter((name) => !locales.includes(name.slice(0, -5)));
if (unexpectedFiles.length) errors.push(`Unregistered catalog files: ${unexpectedFiles.join(", ")}`);

const coverage = [];
for (const locale of locales) {
  const catalog = JSON.parse(await readFile(resolve(catalogDir, `${locale}.json`), "utf8"));
  const missing = uniqueKeys.filter((key) => typeof catalog[key] !== "string" || !catalog[key].trim());
  if (missing.length) coverage.push(`${locale}: ${uniqueKeys.length - missing.length}/${uniqueKeys.length} translated; ${missing.length} use English fallback`);
}
if (errors.length) {
  console.error(errors.join("\\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${locales.length} locale catalogs, registry entries, JSON integrity and ${uniqueKeys.length} English fallback messages.`);
  if (coverage.length) {
    console.warn("Translation coverage (incomplete locales use the English fallback):");
    console.warn(coverage.join("\\n"));
  }
}
