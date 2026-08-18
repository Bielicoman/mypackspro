import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pack } from '../../core/model/types.js';
import { bridge, folderName, type PackRef } from '../bridge/index.js';
import { migrateLegacyData } from '../../node/migrate.js';
import { isNodeAvailable } from '../../node/nodeApi.js';

export interface ScanStatus {
  packName: string;
  found: number;
}

export interface PacksApi {
  packs: readonly Pack[];
  loading: boolean;
  scanning: ScanStatus | null;
  notice: string | null;
  live: boolean;
  addFolder: () => Promise<void>;
  removePack: (rootPath: string) => Promise<void>;
  rescan: (rootPath: string) => Promise<void>;
  dismissNotice: () => void;
}

export function usePacks(): PacksApi {
  const [packs, setPacks] = useState<readonly Pack[]>([]);
  const [refs, setRefs] = useState<readonly PackRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<ScanStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Evita actualizar estado depois do painel fechar (o CEP destrói o documento).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const scanRef = useCallback(async (ref: PackRef): Promise<Pack | null> => {
    setScanning({ packName: ref.name, found: 0 });
    try {
      const { pack, truncated } = await bridge.scanPack(ref, {
        onProgress: (found) => {
          if (alive.current) setScanning({ packName: ref.name, found });
        },
      });
      if (truncated) {
        setNotice(
          `"${ref.name}" é muito grande e foi lido apenas em parte. Considere apontar para uma subpasta.`,
        );
      }
      return pack;
    } catch (e) {
      setNotice(`Não foi possível ler "${ref.name}": ${(e as Error).message}`);
      return null;
    } finally {
      if (alive.current) setScanning(null);
    }
  }, []);

  /* carga inicial */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Antes de ler seja o que for: recuperar os dados da versão anterior.
        if (isNodeAvailable()) await migrateLegacyData();

        const loaded = await bridge.loadRefs();
        if (cancelled) return;
        setRefs(loaded);

        const scanned: Pack[] = [];
        for (const ref of loaded) {
          const pack = await scanRef(ref);
          if (cancelled) return;
          if (pack !== null) scanned.push(pack);
        }
        if (!cancelled) setPacks(scanned);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scanRef]);

  const normKey = (p: string) => p.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();

  const addFolder = useCallback(async () => {
    const rootPath = await bridge.pickFolder();
    if (rootPath === null) return;

    const norm = normKey(rootPath);
    if (refs.some((r) => normKey(r.rootPath) === norm)) {
      setNotice('Essa pasta já foi importada.');
      return;
    }

    const ref: PackRef = { rootPath, name: folderName(rootPath), addedAt: Date.now() };
    const pack = await scanRef(ref);
    if (pack === null) return;

    const nextRefs = [...refs, ref];
    setRefs(nextRefs);
    setPacks((prev) => [...prev, pack]);
    await bridge.saveRefs(nextRefs);
  }, [refs, scanRef]);

  const removePack = useCallback(
    async (rootPath: string) => {
      const norm = normKey(rootPath);
      const nextRefs = refs.filter((r) => normKey(r.rootPath) !== norm);
      setRefs(nextRefs);
      setPacks((prev) => prev.filter((p) => normKey(p.rootPath) !== norm));
      await bridge.saveRefs(nextRefs);
    },
    [refs],
  );

  const rescan = useCallback(
    async (rootPath: string) => {
      const norm = normKey(rootPath);
      const ref = refs.find((r) => normKey(r.rootPath) === norm);
      if (ref === undefined) return;
      const pack = await scanRef(ref);
      if (pack === null) return;
      setPacks((prev) => prev.map((p) => (normKey(p.rootPath) === norm ? pack : p)));
    },
    [refs, scanRef],
  );

  return {
    packs,
    loading,
    scanning,
    notice,
    live: bridge.live,
    addFolder,
    removePack,
    rescan,
    dismissNotice: () => setNotice(null),
  };
}
