import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return Promise.all(entries.flatMap((entry) => entry.isDirectory()
    ? files(join(directory, entry.name))
    : [join(directory, entry.name)]));
}

const releaseFiles = await files("dist");
const text = await Promise.all(releaseFiles.map(async (file) => ({ file, content: await readFile(file, "utf8").catch(() => "") })));
const forbidden = /(?:localhost|127\.0\.0\.1|Dev Login|sourceMappingURL)/i;
const violation = text.find(({ content }) => forbidden.test(content));
if (violation) throw new Error(`Release output contains a forbidden development value: ${violation.file}`);
