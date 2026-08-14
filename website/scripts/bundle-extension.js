import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const archiverPkg = require('archiver');
const archiver = typeof archiverPkg === 'function' ? archiverPkg : archiverPkg.default || archiverPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const websiteDir = path.resolve(__dirname, '..');
const extensionDir = path.resolve(websiteDir, '../extension');
const publicDir = path.resolve(websiteDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function bundle() {
  console.log('[MailX Build] Packaging latest extension build...');

  // 1. If extension folder exists, build it first
  if (fs.existsSync(path.join(extensionDir, 'package.json'))) {
    try {
      console.log('[MailX Build] Building extension...');
      execSync('npm run build', { cwd: extensionDir, stdio: 'inherit' });
    } catch (err) {
      console.warn('[MailX Build] Extension build command failed, falling back to existing dist/ if present.');
    }
  }

  const distDir = path.join(extensionDir, 'dist');
  if (!fs.existsSync(distDir)) {
    console.warn(`[MailX Build] Warning: ${distDir} not found. Skipping zip packaging.`);
    return;
  }

  // 2. Copy branding logo
  const logoSrc = path.join(extensionDir, 'public/icons/mailx-logo.png');
  const logoDest = path.join(publicDir, 'mailx-logo.png');
  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, logoDest);
  }

  // 3. Zip extension/dist to website/public/mailx-extension.zip
  const zipPath = path.join(publicDir, 'mailx-extension.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = new archiverPkg.ZipArchive({ zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`[MailX Build] Successfully created ${zipPath} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
      resolve(null);
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

bundle().catch((err) => {
  console.error('[MailX Build] Error during extension bundle packaging:', err);
});
