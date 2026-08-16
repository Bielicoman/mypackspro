/**
 * Dados de exemplo para desenhar e avaliar o painel antes do scanner existir.
 *
 * Passa pelo `buildPack` real de propósito: assim o layout é validado contra a
 * mesma estrutura que a varredura de disco vai produzir, e não contra um formato
 * inventado que depois não bate.
 */

import { buildPack } from '../../core/scan/buildPack.js';
import type { Pack, ScannedFile } from '../../core/model/types.js';

const file = (relPath: string, mb = 12): ScannedFile => ({
  relPath,
  sizeBytes: Math.round(mb * 1024 * 1024),
  mtimeMs: 1_700_000_000_000,
});

const PACK_EDICAO: ScannedFile[] = [
  // soltos na raiz — aparecem fora de qualquer categoria
  file('LEIA-ME.txt', 0.01),
  file('intro padrao.mp4', 40),

  file('Memes/Reacoes/risada enlatada.mp3', 1.2),
  file('Memes/Reacoes/vine boom.mp3', 0.4),
  file('Memes/Reacoes/bruh.mp4', 2),
  file('Memes/Classicos/nyan cat.gif', 3),
  file('Memes/Classicos/among us.mov', 8),
  file('Memes/emoji chorando.png', 0.2),

  file('SFX/Whoosh/whoosh 1.wav', 1.5),
  file('SFX/Whoosh/whoosh 2.wav', 1.4),
  file('SFX/Whoosh/whoosh 10.wav', 1.6),
  file('SFX/Impacto/boom grave.flac', 4),
  file('SFX/Impacto/hit seco.opus', 0.6),
  file('SFX/transicao.aac', 0.9),

  file('VFX/Fogo/explosao 4k.mkv', 180),
  file('VFX/Fogo/chama lenta.mov', 90),
  file('VFX/Fumaca/smoke wisp.mp4', 25),
  file('VFX/Eletric/raio.webm', 14),

  file('Overlays/Luz/light leak 01.mp4', 30),
  file('Overlays/Luz/light leak 02.mp4', 28),
  file('Overlays/Poeira/dust particles.mov', 55),
  file('Overlays/grao filme.mp4', 22),

  file('Backgrounds/Abstrato/waves loop.mp4', 60),
  file('Backgrounds/Abstrato/gradiente.png', 2),
  file('Backgrounds/Solido/preto.png', 0.1),

  file('Titulos/lower third.mogrt', 5),
  file('Titulos/titulo cinematico.mogrt', 7),

  file('LUTs/teal orange.cube', 0.3),
  file('LUTs/film emulation.cube', 0.3),

  file('Projetos/montagem base.prproj', 15),
  file('Projetos/animacao logo.aep', 40),
  file('Projetos/thumb template.psd', 120),
  file('Projetos/preset favorito.ffx', 0.05),
];

const PACK_MUSICA: ScannedFile[] = [
  file('Lofi/chill beat 01.mp3', 6),
  file('Lofi/chill beat 02.mp3', 7),
  file('Epico/trailer hit.wav', 40),
  file('Epico/build up.m4a', 9),
  file('Ambiente/chuva.opus', 5),
  file('vinheta curta.wav', 2),
];

const PACK_BRUTOS: ScannedFile[] = [
  file('Camera A/A001.mxf', 900),
  file('Camera A/A002.mxf', 850),
  file('Camera B/B001.mov', 1200),
  file('Fotos/DSC_0001.nef', 45),
  file('Fotos/DSC_0002.cr3', 38),
];

export const MOCK_PACKS: readonly Pack[] = [
  buildPack({ rootPath: 'D:\\Packs\\Pack de Edicao 2026', files: PACK_EDICAO, scannedAt: Date.now() }),
  buildPack({ rootPath: 'D:\\Packs\\Musicas', files: PACK_MUSICA, scannedAt: Date.now() }),
  buildPack({ rootPath: 'E:\\Brutos Casamento', files: PACK_BRUTOS, scannedAt: Date.now() }),
];
