// Enter WOT installation folder:
const wotDir = 'C:/Games/World_of_Tanks_EU';

// -------------

import os from 'node:os';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import decompress from 'decompress';

async function fetchUrl(url: string) {
  const res = await fetch(url);
  if (!res) {
    throw new Error(`fetch error at ${url}`);
  }
  return res;
}

async function downloadText(url: string) {
  const res = await fetchUrl(url);
  const text = await res.text();
  return text;
}

async function downloadFile(url: string, outputPath: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`
    );
  }

  const body = Readable.fromWeb(response.body);
  const fileStream = fs.createWriteStream(outputPath);
  await pipeline(body, fileStream);
}

async function main() {
  const tmpDir = await fsp.mkdtemp(`${os.tmpdir()}/xvm-updater-`);
  try {
    console.log('📥 downloading latest build artifacts from GitLab...');
    await downloadFile(
      'https://gitlab.com/api/v4/projects/13924720/jobs/artifacts/master/download?job=build',
      `${tmpDir}/artifacts.zip`
    );

    const extDir = `${tmpDir}/archive`;
    await fsp.mkdir(extDir);
    console.log('✅ done, 📦 unzipping to temp dir: ', extDir);
    await decompress(`${tmpDir}/artifacts.zip`, extDir);

    console.log(`📂 copying to game dir: ${wotDir}`);
    await fsp.cp(`${extDir}/~output/deploy_full/wg`, wotDir, {
      recursive: true,
      force: true,
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }

  console.log('🚀 update successful 🎉');
  await new Promise((r) => setTimeout(r, 3000));
}

main();
