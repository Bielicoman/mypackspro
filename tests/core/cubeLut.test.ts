import { describe, it, expect } from 'vitest';
import { parseCubeLut, applyLutToImageData } from '../../src/core/preview/cubeLut.js';

describe('cubeLut — parser e aplicador', () => {
  it('faz parse de um .cube de identidade 2x2x2', () => {
    const cubeContent = `
# Identity LUT 2x2x2
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;
    const lut = parseCubeLut(cubeContent);
    expect(lut).not.toBeNull();
    expect(lut!.size).toBe(2);
    expect(lut!.data.length).toBe(2 * 2 * 2 * 3);

    // Aplica a imagem com tons médios
    const imgData = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255,
        128, 128, 128, 255,
        255, 0, 0, 255,
      ]),
    };

    applyLutToImageData(imgData, lut!);

    expect(imgData.data[0]).toBe(0);
    expect(imgData.data[1]).toBe(0);
    expect(imgData.data[2]).toBe(0);

    expect(imgData.data[4]).toBe(255);
    expect(imgData.data[5]).toBe(255);
    expect(imgData.data[6]).toBe(255);

    // 128 com interpolação deve permanecer ~128
    expect(imgData.data[8]).toBeCloseTo(128, -1);
    expect(imgData.data[9]).toBeCloseTo(128, -1);
    expect(imgData.data[10]).toBeCloseTo(128, -1);
  });

  it('faz parse de LUT com tags DOMAIN_MIN e DOMAIN_MAX', () => {
    const cubeContent = `
TITLE "Cinematic Teal & Orange"
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
LUT_3D_SIZE 2
0.1 0.1 0.2
0.9 0.5 0.3
0.1 0.8 0.4
0.9 0.9 0.5
0.2 0.2 0.8
0.8 0.4 0.9
0.2 0.7 0.9
1.0 1.0 1.0
`;
    const lut = parseCubeLut(cubeContent);
    expect(lut).not.toBeNull();
    expect(lut!.size).toBe(2);
    expect(lut!.domainMin).toEqual([0, 0, 0]);
    expect(lut!.domainMax).toEqual([1, 1, 1]);
  });
});
