/**
 * Parser e aplicador de LUT 3D (.cube) com interpolação trilinear.
 *
 * Suporta tabelas 3D de qualquer tamanho (ex.: 17x17x17, 33x33x33, 64x64x64)
 * e aplica a transformação em buffers de imagem (RGBA) com alta performance.
 */

export interface Lut3D {
  readonly size: number;
  readonly domainMin: [number, number, number];
  readonly domainMax: [number, number, number];
  /** Tabela RGB linearizada: [r + g*size + b*size*size]*3 */
  readonly data: Float32Array;
}

/**
 * Faz o parse de um arquivo .cube padrão Adobe.
 */
export function parseCubeLut(cubeText: string): Lut3D | null {
  const lines = cubeText.split(/\r?\n/);
  let size = 0;
  const domainMin: [number, number, number] = [0, 0, 0];
  const domainMax: [number, number, number] = [1, 1, 1];
  const numbers: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('//')) continue;

    const parts = raw.split(/\s+/);
    const tag = parts[0]?.toUpperCase();

    if (tag === 'LUT_3D_SIZE') {
      const parsedSize = parseInt(parts[1] ?? '', 10);
      if (!isNaN(parsedSize) && parsedSize > 1) {
        size = parsedSize;
      }
    } else if (tag === 'DOMAIN_MIN' && parts.length >= 4) {
      domainMin[0] = parseFloat(parts[1]!);
      domainMin[1] = parseFloat(parts[2]!);
      domainMin[2] = parseFloat(parts[3]!);
    } else if (tag === 'DOMAIN_MAX' && parts.length >= 4) {
      domainMax[0] = parseFloat(parts[1]!);
      domainMax[1] = parseFloat(parts[2]!);
      domainMax[2] = parseFloat(parts[3]!);
    } else if (parts.length >= 3) {
      const r = parseFloat(parts[0]!);
      const g = parseFloat(parts[1]!);
      const b = parseFloat(parts[2]!);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        numbers.push(r, g, b);
      }
    }
  }

  if (size === 0) {
    // Tenta inferir pelo total de números
    const totalEntries = Math.floor(numbers.length / 3);
    const cubeRoot = Math.round(Math.cbrt(totalEntries));
    if (cubeRoot * cubeRoot * cubeRoot === totalEntries && cubeRoot > 1) {
      size = cubeRoot;
    } else {
      return null;
    }
  }

  const expectedLength = size * size * size * 3;
  if (numbers.length < expectedLength) {
    return null;
  }

  const data = new Float32Array(expectedLength);
  for (let i = 0; i < expectedLength; i++) {
    data[i] = numbers[i] ?? 0;
  }

  return {
    size,
    domainMin,
    domainMax,
    data,
  };
}

/**
 * Aplica uma LUT 3D diretamente sobre os pixels RGBA de um ImageData usando interpolação trilinear.
 */
export function applyLutToImageData(
  imgData: { data: Uint8ClampedArray | Uint8Array; width: number; height: number },
  lut: Lut3D,
): void {
  const { size, data: table } = lut;
  const pixels = imgData.data;
  const len = pixels.length;
  const sizeMinus1 = size - 1;
  const sizeSq = size * size;

  for (let i = 0; i < len; i += 4) {
    const rNorm = (pixels[i]! / 255) * sizeMinus1;
    const gNorm = (pixels[i + 1]! / 255) * sizeMinus1;
    const bNorm = (pixels[i + 2]! / 255) * sizeMinus1;

    const r0 = Math.floor(rNorm);
    const r1 = r0 < sizeMinus1 ? r0 + 1 : sizeMinus1;
    const dr = rNorm - r0;

    const g0 = Math.floor(gNorm);
    const g1 = g0 < sizeMinus1 ? g0 + 1 : sizeMinus1;
    const dg = gNorm - g0;

    const b0 = Math.floor(bNorm);
    const b1 = b0 < sizeMinus1 ? b0 + 1 : sizeMinus1;
    const db = bNorm - b0;

    // 8 cantos da célula do cubo 3D
    const idx000 = (r0 + g0 * size + b0 * sizeSq) * 3;
    const idx100 = (r1 + g0 * size + b0 * sizeSq) * 3;
    const idx010 = (r0 + g1 * size + b0 * sizeSq) * 3;
    const idx110 = (r1 + g1 * size + b0 * sizeSq) * 3;

    const idx001 = (r0 + g0 * size + b1 * sizeSq) * 3;
    const idx101 = (r1 + g0 * size + b1 * sizeSq) * 3;
    const idx011 = (r0 + g1 * size + b1 * sizeSq) * 3;
    const idx111 = (r1 + g1 * size + b1 * sizeSq) * 3;

    // Interpolação Trilinear por canal (R, G, B)
    for (let c = 0; c < 3; c++) {
      const c000 = table[idx000 + c]!;
      const c100 = table[idx100 + c]!;
      const c010 = table[idx010 + c]!;
      const c110 = table[idx110 + c]!;

      const c001 = table[idx001 + c]!;
      const c101 = table[idx101 + c]!;
      const c011 = table[idx011 + c]!;
      const c111 = table[idx111 + c]!;

      const c00 = c000 * (1 - dr) + c100 * dr;
      const c10 = c010 * (1 - dr) + c110 * dr;
      const c01 = c001 * (1 - dr) + c101 * dr;
      const c11 = c011 * (1 - dr) + c111 * dr;

      const c0 = c00 * (1 - dg) + c10 * dg;
      const c1 = c01 * (1 - dg) + c11 * dg;

      const val = c0 * (1 - db) + c1 * db;
      pixels[i + c] = Math.min(255, Math.max(0, Math.round(val * 255)));
    }
  }
}
