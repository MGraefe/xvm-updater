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
    console.log('⚙️ Scraping download page...');
    const downloadPage = await downloadText(
      'https://nightly.modxvm.com/download/master/?C=M&O=D'
    );

    const linkMatch = downloadPage.match(/xvm_[0-9._]+_master_[a-f0-9]+\.zip/g);
    if (!linkMatch) {
      throw new Error('cannot find download url');
    }

    const downloadUrl = `https://nightly.modxvm.com/download/master/${linkMatch[0]}`;
    const filename = `${tmpDir}/xvm.zip`;
    console.log(`⬇️ downloading ${downloadUrl} to ${filename}`);
    await downloadFile(downloadUrl, filename);

    const extDir = `${tmpDir}/archive`;
    await fsp.mkdir(extDir);
    console.log('✅ done, 📦 unzipping to temp dir: ', extDir);
    await decompress(filename, extDir);

    console.log(`📂 copying to game dir: ${wotDir}`);
    await fsp.cp(`${extDir}/wg`, wotDir, {
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
