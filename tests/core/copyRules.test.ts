import { describe, it, expect } from 'vitest';
import { findRule, resolveCopyDir, ruleKey } from '../../src/core/copy/rules.js';
import { isAbsolutePath, joinPath } from '../../src/core/util/path.js';

const PACK = 'p1';
const ROOT = 'D:\\Projetos\\Casamento';

describe('isAbsolutePath', () => {
  it('reconhece caminhos Windows, UNC e POSIX', () => {
    expect(isAbsolutePath('D:\\Midia\\SFX')).toBe(true);
    expect(isAbsolutePath('C:/x')).toBe(true);
    expect(isAbsolutePath('\\\\servidor\\share')).toBe(true);
    expect(isAbsolutePath('/home/alex')).toBe(true);
  });

  it('trata nomes de subpasta como relativos', () => {
    expect(isAbsolutePath('03 SFX')).toBe(false);
    expect(isAbsolutePath('audio/sfx')).toBe(false);
  });
});

describe('joinPath', () => {
  it('mantem o separador da base', () => {
    expect(joinPath('D:\\P', '03 SFX')).toBe('D:\\P\\03 SFX');
    expect(joinPath('/home/a', 'sfx')).toBe('/home/a/sfx');
  });

  it('normaliza barras e segmentos vazios', () => {
    expect(joinPath('D:\\P\\', '/03 SFX/')).toBe('D:\\P\\03 SFX');
    expect(joinPath('D:\\P', 'a/b')).toBe('D:\\P\\a\\b');
  });
});

describe('findRule', () => {
  const rules = {
    [ruleKey(PACK, ['SFX'])]: '03 SFX',
    [ruleKey(PACK, ['SFX', 'Impacto'])]: '03 SFX\\Impactos',
  };

  it('encontra a regra exata', () => {
    expect(findRule(rules, PACK, ['SFX'])).toBe('03 SFX');
  });

  it('herda a regra do ancestral mais proximo', () => {
    expect(findRule(rules, PACK, ['SFX', 'Whoosh'])).toBe('03 SFX');
    expect(findRule(rules, PACK, ['SFX', 'Whoosh', 'Longos'])).toBe('03 SFX');
  });

  it('a regra mais especifica ganha a do pai', () => {
    expect(findRule(rules, PACK, ['SFX', 'Impacto'])).toBe('03 SFX\\Impactos');
  });

  it('devolve indefinido sem regra aplicavel', () => {
    expect(findRule(rules, PACK, ['VFX'])).toBeUndefined();
    expect(findRule(rules, 'outro', ['SFX'])).toBeUndefined();
  });

  it('regra vazia conta como ausente', () => {
    expect(findRule({ [ruleKey(PACK, ['VFX'])]: '' }, PACK, ['VFX'])).toBeUndefined();
  });
});

describe('resolveCopyDir', () => {
  it('sem regra usa a subpasta padrao dentro da base', () => {
    expect(resolveCopyDir({ root: ROOT, packId: PACK, categoryPath: ['VFX'], rules: {} })).toBe(
      'D:\\Projetos\\Casamento\\My Packs Pro',
    );
  });

  it('regra relativa pendura-se na base — sobrevive a mudar de projeto', () => {
    const rules = { [ruleKey(PACK, ['SFX'])]: '03 SFX' };
    expect(resolveCopyDir({ root: ROOT, packId: PACK, categoryPath: ['SFX'], rules })).toBe(
      'D:\\Projetos\\Casamento\\03 SFX',
    );
    expect(resolveCopyDir({ root: 'E:\\Outro', packId: PACK, categoryPath: ['SFX'], rules })).toBe(
      'E:\\Outro\\03 SFX',
    );
  });

  it('regra absoluta e usada tal e qual', () => {
    const rules = { [ruleKey(PACK, ['TRILHAS'])]: 'D:\\Bibliotecas\\Trilhas' };
    expect(resolveCopyDir({ root: ROOT, packId: PACK, categoryPath: ['TRILHAS'], rules })).toBe(
      'D:\\Bibliotecas\\Trilhas',
    );
  });

  it('assets soltos na raiz caem na subpasta padrao', () => {
    const rules = { [ruleKey(PACK, ['SFX'])]: '03 SFX' };
    expect(resolveCopyDir({ root: ROOT, packId: PACK, categoryPath: [], rules })).toBe(
      'D:\\Projetos\\Casamento\\My Packs Pro',
    );
  });

  it('uma regra na raiz do pack vale para tudo', () => {
    const rules = { [ruleKey(PACK, [])]: 'Midia' };
    expect(resolveCopyDir({ root: ROOT, packId: PACK, categoryPath: ['SFX'], rules })).toBe(
      'D:\\Projetos\\Casamento\\Midia',
    );
  });
});
