import { describe, it, expect } from 'vitest';
import {
  appDataRoot,
  extraBinarySearchDirs,
  bundledBinSubdir,
  cepExtensionsDir,
  detectPlatform,
  executableName,
  pathListSeparator,
  revealCommand,
} from '../../src/core/platform/platform.js';

/*
 * O caminho macOS nunca corre nesta maquina. Estes testes sao a unica prova de
 * que ele esta certo, por isso cobrem cada decisao, nao so o caso feliz.
 */

describe('detectPlatform', () => {
  it('reconhece as familias que interessam', () => {
    expect(detectPlatform('win32')).toBe('win');
    expect(detectPlatform('darwin')).toBe('mac');
  });

  it('tudo o resto cai em "other" em vez de fingir ser Windows', () => {
    expect(detectPlatform('linux')).toBe('other');
    expect(detectPlatform('freebsd')).toBe('other');
    expect(detectPlatform('')).toBe('other');
  });
});

describe('executableName', () => {
  it('so o Windows leva .exe', () => {
    expect(executableName('ffmpeg', 'win')).toBe('ffmpeg.exe');
    expect(executableName('ffmpeg', 'mac')).toBe('ffmpeg');
    expect(executableName('ffprobe', 'mac')).toBe('ffprobe');
  });
});

describe('bundledBinSubdir', () => {
  it('cada plataforma tem a sua pasta', () => {
    expect(bundledBinSubdir('win')).toBe('bin/win');
    expect(bundledBinSubdir('mac')).toBe('bin/mac');
  });

  it('plataforma sem binarios devolve nulo, nao um caminho invalido', () => {
    expect(bundledBinSubdir('other')).toBeNull();
  });
});

describe('pathListSeparator', () => {
  it('Windows usa ponto e virgula; o resto, dois pontos', () => {
    expect(pathListSeparator('win')).toBe(';');
    expect(pathListSeparator('mac')).toBe(':');
    expect(pathListSeparator('other')).toBe(':');
  });
});

describe('revealCommand', () => {
  const FILE_WIN = 'D:\\Packs\\SFX\\whoosh 1.wav';
  const FILE_MAC = '/Users/alex/Packs/SFX/whoosh 1.wav';

  it('Windows seleciona o ficheiro com /select, e aspas no argumento', () => {
    const c = revealCommand('win', FILE_WIN, true);
    expect(c).not.toBeNull();
    expect(c!.command).toBe('explorer.exe');
    expect(c!.args).toEqual(['/select,"D:\\Packs\\SFX\\whoosh 1.wav"']);
    expect(c!.windowsVerbatimArguments).toBe(true);
  });

  it('Windows normaliza barras para o formato que o Explorer entende', () => {
    const c = revealCommand('win', 'D:/Packs/SFX/a.wav', true);
    expect(c!.args[0]).toBe('/select,"D:\\Packs\\SFX\\a.wav"');
  });

  it('Windows sem ficheiro abre so a pasta', () => {
    const c = revealCommand('win', 'D:\\Packs\\SFX', false);
    expect(c!.args).toEqual(['"D:\\Packs\\SFX"']);
  });

  it('macOS usa open -R e nao cita a mao', () => {
    const c = revealCommand('mac', FILE_MAC, true);
    expect(c!.command).toBe('open');
    expect(c!.args).toEqual(['-R', FILE_MAC]);
    expect(c!.windowsVerbatimArguments).toBe(false);
  });

  it('macOS sem ficheiro abre a pasta', () => {
    const c = revealCommand('mac', '/Users/alex/Packs', false);
    expect(c!.args).toEqual(['/Users/alex/Packs']);
  });

  it('plataforma desconhecida nao inventa comando', () => {
    expect(revealCommand('other', '/x', true)).toBeNull();
  });
});

describe('appDataRoot', () => {
  it('Windows usa APPDATA', () => {
    expect(appDataRoot('win', { APPDATA: 'C:\\Users\\alex\\AppData\\Roaming' }))
      .toBe('C:\\Users\\alex\\AppData\\Roaming');
  });

  it('macOS usa a convencao Application Support', () => {
    expect(appDataRoot('mac', { HOME: '/Users/alex' }))
      .toBe('/Users/alex/Library/Application Support');
  });

  it('outras plataformas caem em ~/.config', () => {
    expect(appDataRoot('other', { HOME: '/home/alex' })).toBe('/home/alex/.config');
  });

  it('sem a variavel de ambiente devolve nulo em vez de um caminho relativo', () => {
    expect(appDataRoot('win', {})).toBeNull();
    expect(appDataRoot('mac', {})).toBeNull();
    expect(appDataRoot('mac', { HOME: '' })).toBeNull();
  });
});

describe('cepExtensionsDir', () => {
  it('Windows monta com barra invertida', () => {
    expect(cepExtensionsDir('win', { APPDATA: 'C:\\Users\\alex\\AppData\\Roaming' }))
      .toBe('C:\\Users\\alex\\AppData\\Roaming\\Adobe\\CEP\\extensions');
  });

  it('macOS monta com barra normal', () => {
    expect(cepExtensionsDir('mac', { HOME: '/Users/alex' }))
      .toBe('/Users/alex/Library/Application Support/Adobe/CEP/extensions');
  });

  it('sem ambiente devolve nulo', () => {
    expect(cepExtensionsDir('win', {})).toBeNull();
  });
});

describe('extraBinarySearchDirs', () => {
  it('macOS inclui o Homebrew das duas arquiteturas', () => {
    const dirs = extraBinarySearchDirs('mac');
    expect(dirs).toContain('/opt/homebrew/bin');
    expect(dirs).toContain('/usr/local/bin');
  });

  it('Windows nao acrescenta nada — o PATH do processo ja basta', () => {
    expect(extraBinarySearchDirs('win')).toEqual([]);
  });

  it('a ordem poe o Apple Silicon primeiro', () => {
    expect(extraBinarySearchDirs('mac')[0]).toBe('/opt/homebrew/bin');
  });
});
