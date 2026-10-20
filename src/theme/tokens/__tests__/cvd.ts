/**
 * Colour-vision-deficiency check for the chart tokens. Simulates full
 * deuteranopia, protanopia and tritanopia (Machado, Oliveira & Fernandes 2009,
 * severity 1.0, applied to linear sRGB) and measures CIE76 ΔE in CIELAB (D65).
 * The matrices and CIELAB constants are the published definitions.
 */
type Matrix = [[number, number, number], [number, number, number], [number, number, number]];
export const CVD: Record<'deuteranopia' | 'protanopia' | 'tritanopia', Matrix> = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

const linear = (hex: string): number[] =>
  [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

function lab([r, g, b]: number[]): number[] {
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** CIELAB of a hex colour as seen with the given deficiency (or normal vision). */
export function seenAs(hex: string, matrix?: Matrix): number[] {
  const rgb = linear(hex);
  return lab(matrix ? matrix.map((row) => clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])) : rgb);
}

export const deltaE = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
