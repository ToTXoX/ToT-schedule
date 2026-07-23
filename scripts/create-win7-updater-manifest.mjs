import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, resolve} from 'node:path';

const [version, tag, repository, installerPath, signaturePath, outputPath] =
  process.argv.slice(2);

if (
  !version ||
  !tag ||
  !repository ||
  !installerPath ||
  !signaturePath ||
  !outputPath
) {
  console.error(
    'Usage: node create-win7-updater-manifest.mjs <version> <tag> <repository> <installer> <signature> <output>',
  );
  process.exit(1);
}

for (const path of [installerPath, signaturePath]) {
  if (!existsSync(path)) {
    console.error(`Required updater artifact was not found: ${path}`);
    process.exit(1);
  }
}

const installerName = basename(installerPath);
const signature = readFileSync(signaturePath, 'utf8').trim();
const downloadUrl =
  `https://github.com/${repository}/releases/download/` +
  `${encodeURIComponent(tag)}/${encodeURIComponent(installerName)}`;
const platform = {signature, url: downloadUrl};
const manifest = {
  version,
  notes:
    'Windows 7 Legacy 版更新。仅适用于 Windows 7 x64；Windows 10/11 请使用标准版。',
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': platform,
    'windows-x86_64-nsis': platform,
  },
};

writeFileSync(resolve(outputPath), `${JSON.stringify(manifest, null, 2)}\n`);
