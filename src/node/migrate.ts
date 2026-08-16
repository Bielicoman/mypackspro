/**
 * Migração única do rename "Ascencio Pack" → "My Packs Pro".
 *
 * Sem isto, o rename faria o plugin apontar para uma pasta de dados vazia: o
 * utilizador perderia os packs importados e todo o cache de previews já gerado,
 * sem perceber porquê. Renomear a pasta preserva tudo e corre uma só vez.
 */

import { dataDir, existsSync, fsp, legacyDataDir } from './nodeApi.js';

export async function migrateLegacyData(): Promise<boolean> {
  const target = dataDir();
  const legacy = legacyDataDir();

  // Só migra quando há dados antigos e ainda nada de novo — nunca sobrepõe.
  if (!existsSync(legacy) || existsSync(target)) return false;

  try {
    await fsp().rename(legacy, target);
    return true;
  } catch {
    // Falhar aqui não é fatal: o plugin arranca vazio, como numa instalação nova.
    return false;
  }
}
