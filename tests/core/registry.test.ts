import { describe, it, expect } from 'vitest';
import {
  classify,
  extensionOf,
  isImportable,
  knownExtensions,
  needsProxy,
  UNKNOWN,
  PROXY_THRESHOLD_BYTES,
} from '../../src/core/formats/registry.js';

describe('extensionOf', () => {
  it('normaliza para minúsculas', () => {
    expect(extensionOf('CLIP.MP4')).toBe('mp4');
  });

  it('lida com caminhos Windows e nomes com vários pontos', () => {
    expect(extensionOf('C:\\Packs\\SFX\\whoosh.v2.wav')).toBe('wav');
    expect(extensionOf('/home/alex/meme.mp4')).toBe('mp4');
  });

  it('não confunde ponto na pasta com extensão do arquivo', () => {
    expect(extensionOf('C:\\minha.pasta\\arquivo')).toBe('');
  });

  it('devolve vazio para arquivos sem extensão, dotfiles e ponto final', () => {
    expect(extensionOf('LEIAME')).toBe('');
    expect(extensionOf('.gitignore')).toBe('');
    expect(extensionOf('quebrado.')).toBe('');
  });
});

describe('registro de formatos', () => {
  it('não tem extensões duplicadas', () => {
    const all = knownExtensions();
    expect(new Set(all).size).toBe(all.length);
  });

  it('nenhuma extensão registada cai em UNKNOWN', () => {
    for (const ext of knownExtensions()) {
      expect(classify(`x.${ext}`), ext).not.toBe(UNKNOWN);
    }
  });

  it('toda definição tem estratégia coerente com o tier', () => {
    for (const ext of knownExtensions()) {
      const def = classify(`x.${ext}`);
      if (def.tier === 3) expect(def.strategy, ext).toBe('icon');
      else expect(def.strategy, ext).not.toBe('icon');
    }
  });

  it('desconhecido não quebra nem é arrastável', () => {
    expect(classify('coisa.xyz')).toBe(UNKNOWN);
    expect(isImportable('coisa.xyz')).toBe(false);
  });
});

describe('classificação por tier', () => {
  it('tier 1 — mídia que o ffmpeg decodifica', () => {
    expect(classify('a.mp4')).toMatchObject({ family: 'video', tier: 1, strategy: 'ffmpegVideo' });
    expect(classify('a.opus')).toMatchObject({ family: 'audio', tier: 1, strategy: 'ffmpegAudio' });
    expect(classify('a.exr')).toMatchObject({ family: 'image', tier: 1, strategy: 'ffmpegImage' });
    expect(classify('a.gif')).toMatchObject({ tier: 1, strategy: 'ffmpegAnimated' });
  });

  it('tier 2 — preview extraído de dentro do arquivo', () => {
    expect(classify('a.mogrt')).toMatchObject({ tier: 2, strategy: 'zipPreview' });
    expect(classify('a.psd')).toMatchObject({ tier: 2, strategy: 'embeddedComposite' });
    expect(classify('a.cr3')).toMatchObject({ family: 'raw', tier: 2, strategy: 'embeddedJpeg' });
    expect(classify('a.cube')).toMatchObject({ family: 'lut', tier: 2, strategy: 'lut3d' });
  });

  it('tier 3 — só ícone', () => {
    expect(classify('a.prproj')).toMatchObject({ family: 'projectPremiere', tier: 3 });
    expect(classify('a.aep')).toMatchObject({ family: 'projectAfterEffects', tier: 3 });
    expect(classify('a.ttf')).toMatchObject({ family: 'font', tier: 3 });
  });
});

describe('importabilidade — controla se o arrasto é permitido', () => {
  it('mídia e projetos Adobe que o Premiere aceita', () => {
    for (const f of ['a.mp4', 'a.wav', 'a.png', 'a.psd', 'a.ai', 'a.mogrt', 'a.aep', 'a.prproj']) {
      expect(isImportable(f), f).toBe(true);
    }
  });

  it('presets, fontes, LUTs e SVG não são importáveis', () => {
    for (const f of ['a.ffx', 'a.abr', 'a.atn', 'a.ttf', 'a.cube', 'a.svg']) {
      expect(isImportable(f), f).toBe(false);
    }
  });
});

describe('needsProxy — otimização medida na Fase 0', () => {
  const small = { sizeBytes: 5 * 1024 * 1024, height: 1080, videoCodec: 'h264' };

  it('dispensa proxy para MP4 H.264 pequeno — o CEF toca direto', () => {
    expect(needsProxy('a.mp4', small)).toBe(false);
    expect(needsProxy('a.webm', { ...small, videoCodec: 'vp9' })).toBe(false);
  });

  it('exige proxy para contêineres que o Chromium 99 recusa', () => {
    expect(needsProxy('a.mkv', small)).toBe(true);
    expect(needsProxy('a.mov', small)).toBe(true);
  });

  it('exige proxy acima dos limiares de tamanho e resolução', () => {
    expect(needsProxy('a.mp4', { ...small, sizeBytes: PROXY_THRESHOLD_BYTES + 1 })).toBe(true);
    expect(needsProxy('a.mp4', { ...small, height: 2160 })).toBe(true);
  });

  it('exige proxy para codec que o navegador não decodifica', () => {
    expect(needsProxy('a.mp4', { ...small, videoCodec: 'prores' })).toBe(true);
    expect(needsProxy('a.mp4', { ...small, videoCodec: 'hevc' })).toBe(true);
  });

  it('na dúvida (sem codec conhecido) gera proxy', () => {
    expect(needsProxy('a.mp4', { sizeBytes: 1024 })).toBe(true);
  });

  it('áudio e imagem sempre passam pelo pipeline; tier 3 nunca', () => {
    expect(needsProxy('a.mp3', { sizeBytes: 1024 })).toBe(true);
    expect(needsProxy('a.png', { sizeBytes: 1024 })).toBe(true);
    expect(needsProxy('a.ttf', { sizeBytes: 1024 })).toBe(false);
  });
});
