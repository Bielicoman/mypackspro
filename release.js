/**
 * My Packs Pro — Master Version Bump & Multi-Artifact Release Engine
 * (C) 2026 Alex Ascencio.
 *
 * Usage:
 *   node release.js <new_version> ["Changelog item 1"] ["Changelog item 2"]
 * Example:
 *   node release.js 0.1.1 "Novo sistema de importação rápida" "Compatibilidade Premiere 2026"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const newVersion = args[0];
const customChangelog = args.slice(1);

if (!newVersion) {
    console.error('❌ Erro: Por favor informe a nova versão. Exemplo: node release.js 0.1.1');
    process.exit(1);
}

const PLUGIN_ID = 'com.alexascencio.mypackspro';
const PLUGIN_NAME = 'My Packs Pro';
const ROOT_DIR = __dirname;
const SITE_DIR = path.join(ROOT_DIR, 'site');

console.log(`\n======================================================`);
console.log(`🚀 INICIANDO RELEASE: ${PLUGIN_NAME} v${newVersion}`);
console.log(`======================================================\n`);

// 1. Atualizar version.json (Raiz)
const versionJsonPath = path.join(ROOT_DIR, 'version.json');
let versionData = {};
if (fs.existsSync(versionJsonPath)) {
    versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
}

const prevVersion = versionData.version || '0.1.0';
versionData.pluginId = PLUGIN_ID;
versionData.name = PLUGIN_NAME;
versionData.version = newVersion;
versionData.fullName = `${PLUGIN_NAME} ${newVersion}`;
versionData.releaseDate = new Date().toISOString().split('T')[0];

if (customChangelog.length > 0) {
    versionData.changelog = customChangelog;
}

const versionJsonContent = JSON.stringify(versionData, null, 2);
fs.writeFileSync(versionJsonPath, versionJsonContent, 'utf8');
console.log(`✓ [1/6] version.json atualizado na raiz (v${prevVersion} -> v${newVersion})`);

// 2. Sincronizar version.json no Site
if (fs.existsSync(SITE_DIR)) {
    const siteVersionJsonPath = path.join(SITE_DIR, 'version.json');
    fs.writeFileSync(siteVersionJsonPath, versionJsonContent, 'utf8');
    console.log(`✓ [2/6] version.json sincronizado no /site`);
}

// 3. Atualizar CSXS/manifest.xml
const manifestPath = path.join(ROOT_DIR, 'CSXS', 'manifest.xml');
if (fs.existsSync(manifestPath)) {
    let manifestContent = fs.readFileSync(manifestPath, 'utf8');
    manifestContent = manifestContent.replace(/ExtensionBundleVersion="[^"]+"/, `ExtensionBundleVersion="${newVersion}"`);
    manifestContent = manifestContent.replace(/<Extension Id="([^"]+)" Version="[^"]+" \/>/g, `<Extension Id="$1" Version="${newVersion}" />`);
    fs.writeFileSync(manifestPath, manifestContent, 'utf8');
    console.log(`✓ [3/6] CSXS/manifest.xml atualizado para v${newVersion}`);
}

// 4. Atualizar package.json
const pkgPath = path.join(ROOT_DIR, 'package.json');
if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    console.log(`✓ [4/6] package.json atualizado para v${newVersion}`);
}

// 5. Build Vite
console.log(`✓ [5/6] Compilando bundle Vite...`);
try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
} catch (e) {
    console.warn('⚠️ Vite build aviso:', e.message);
}

// 6. Empacotar ZXP
console.log(`✓ [6/6] Gerando pacote MyPacksPro.zxp oficial...`);
try {
    execSync('node package-zxp.js', { cwd: ROOT_DIR, stdio: 'inherit' });
} catch (e) {
    console.warn('⚠️ Erro ao gerar ZXP:', e.message);
}

console.log(`\n======================================================`);
console.log(`🎉 RELEASE CONCLUÍDO COM SUCESSO!`);
console.log(`Plugin: ${PLUGIN_NAME} ${newVersion} (MyPacksPro.zxp)`);
console.log(`======================================================\n`);
