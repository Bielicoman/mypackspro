/**
 * My Packs Pro — Pure Node.js Zero-Dependency ZXP Packager
 * Packages the CEP extension into MyPacksPro.zxp complying with Adobe ZXP specification.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 Empacotando My Packs Pro para ZXP (Pure Node.js)...');

const rootDir = __dirname;
const zxpOutput = path.join(rootDir, 'MyPacksPro.zxp');
const releaseDir = path.join(rootDir, 'release');
const siteDir = path.join(rootDir, 'site');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function createZxp(sourceDir, outputFile) {
  const files = [];

  const includeFolders = ['CSXS', 'dist', 'jsx', 'icons', 'bin', 'docs'];
  const includeFiles = ['index.html', 'version.json', '.debug', 'LICENSE'];

  // Ensure mimetype is first without compression (Adobe CEP standard)
  const mimetypeFile = path.join(sourceDir, 'mimetype');
  if (fs.existsSync(mimetypeFile)) {
    files.push({ fullPath: mimetypeFile, relPath: 'mimetype', noCompress: true });
  }

  function walk(dir, rel) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relPath = rel ? `${rel}/${item}` : item;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, relPath);
      } else {
        files.push({ fullPath, relPath: relPath.replace(/\\/g, '/') });
      }
    }
  }

  for (const folder of includeFolders) {
    const fullPath = path.join(sourceDir, folder);
    if (fs.existsSync(fullPath)) {
      walk(fullPath, folder);
    }
  }

  for (const file of includeFiles) {
    const fullPath = path.join(sourceDir, file);
    if (fs.existsSync(fullPath)) {
      files.push({ fullPath, relPath: file });
    }
  }

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const f of files) {
    const data = fs.readFileSync(f.fullPath);
    const uncompressedSize = data.length;
    const crc = crc32(data);
    
    let compressedData = data;
    let method = 0; // Stored

    if (!f.noCompress && data.length > 0) {
      compressedData = zlib.deflateRawSync(data);
      method = 8; // Deflate
    }
    const compressedSize = compressedData.length;

    const nameBuf = Buffer.from(f.relPath, 'utf8');
    const nameLen = nameBuf.length;

    // Local file header (30 bytes + nameLen)
    const localHeader = Buffer.alloc(30 + nameLen);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed
    localHeader.writeUInt16LE(0, 6);          // flags
    localHeader.writeUInt16LE(method, 8);     // compression method
    localHeader.writeUInt16LE(0, 10);         // mod time
    localHeader.writeUInt16LE(0, 12);         // mod date
    localHeader.writeUInt32LE(crc, 14);       // crc32
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameLen, 26);
    localHeader.writeUInt16LE(0, 28);         // extra len
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header (46 bytes + nameLen)
    const centralHeader = Buffer.alloc(46 + nameLen);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4);         // version made by
    centralHeader.writeUInt16LE(20, 6);         // version needed
    centralHeader.writeUInt16LE(0, 8);          // flags
    centralHeader.writeUInt16LE(method, 10);    // compression method
    centralHeader.writeUInt16LE(0, 12);         // mod time
    centralHeader.writeUInt16LE(0, 14);         // mod date
    centralHeader.writeUInt32LE(crc, 16);       // crc32
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameLen, 28);
    centralHeader.writeUInt16LE(0, 30);         // extra len
    centralHeader.writeUInt16LE(0, 32);         // comment len
    centralHeader.writeUInt16LE(0, 34);         // disk start
    centralHeader.writeUInt16LE(0, 36);         // internal attr
    centralHeader.writeUInt32LE(0, 38);         // external attr
    centralHeader.writeUInt32LE(offset, 42);    // relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) {
    centralDirSize += ch.length;
  }

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // signature
  eocd.writeUInt16LE(0, 4);                   // disk number
  eocd.writeUInt16LE(0, 6);                   // disk with start of central dir
  eocd.writeUInt16LE(files.length, 8);        // total entries on this disk
  eocd.writeUInt16LE(files.length, 10);       // total entries
  eocd.writeUInt32LE(centralDirSize, 12);     // size of central dir
  eocd.writeUInt32LE(centralDirOffset, 16);   // offset of central dir
  eocd.writeUInt16LE(0, 20);                  // comment length

  const finalBuffer = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  fs.writeFileSync(outputFile, finalBuffer);
}

try {
  createZxp(rootDir, zxpOutput);
  
  const zipOutput = path.join(rootDir, 'MyPacksPro.zip');
  fs.copyFileSync(zxpOutput, zipOutput);

  if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });
  fs.copyFileSync(zxpOutput, path.join(releaseDir, 'MyPacksPro.zxp'));
  fs.copyFileSync(zxpOutput, path.join(releaseDir, 'MyPacksPro.zip'));

  if (fs.existsSync(siteDir)) {
    fs.copyFileSync(zxpOutput, path.join(siteDir, 'MyPacksPro.zxp'));
    fs.copyFileSync(zxpOutput, path.join(siteDir, 'MyPacksPro.zip'));
  }

  const sizeKb = (fs.statSync(zxpOutput).size / 1024).toFixed(1);
  console.log(`✅ MyPacksPro.zxp e MyPacksPro.zip criados e sincronizados com sucesso! (${sizeKb} KB)`);
} catch (err) {
  console.error('❌ Erro ao criar pacotes ZXP/ZIP:', err.message);
}
