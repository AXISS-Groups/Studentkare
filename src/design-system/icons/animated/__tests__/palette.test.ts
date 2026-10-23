import { describe, expect, it } from 'vitest';
import { applyPalette, parseColour, rolesOf } from '../palette';

/** Shapes as the test reads them back. */
type Shape = { c: { k: unknown }; g: { k: { k: unknown } } };
const shapes = (data: typeof file) => data.layers[0].shapes as unknown as Shape[];

const file = {
  sk: { v: 1, roles: ['@ink', 'illustrationGold'] },
  layers: [{
    shapes: [
      { ty: 'st', sk: '@ink', c: { a: 0, k: [0, 0, 0, 1] } },
      { ty: 'fl', sk: ['illustrationGold', 'illustrationGold'], c: { a: 1, k: [{ t: 0, s: [0, 0, 0, 1] }, { t: 9, s: [0, 0, 0, 0.5] }] } },
      { ty: 'gf', sk: ['@ink', 'illustrationGold'], g: { p: 2, k: { a: 0, k: [0, 0, 0, 0, 1, 0, 0, 0] } } },
      { ty: 'fl', c: { a: 0, k: [0.2, 0.2, 0.2, 1] } },
    ],
  }],
};

describe('applyPalette', () => {
  const resolve = (role: string) => (role === '@ink' ? [1, 0, 0] as const : role === 'illustrationGold' ? [0, 1, 0] as const : null);

  it('swaps each role for its colour, keeping opacity, without touching the input', () => {
    const out = applyPalette(file, resolve);
    const [stroke, fill, grad, plain] = shapes(out);
    expect(stroke.c.k).toEqual([1, 0, 0, 1]);
    expect((fill.c.k as Array<{ s: number[] }>)[1].s).toEqual([0, 1, 0, 0.5]);
    expect(grad.g.k.k).toEqual([0, 1, 0, 0, 1, 0, 1, 0]);
    expect(plain.c.k).toEqual([0.2, 0.2, 0.2, 1]);
    expect(shapes(file)[0].c.k).toEqual([0, 0, 0, 1]);
  });

  it('leaves a colour as built when the role cannot be resolved', () => {
    const out = applyPalette(file, () => null);
    expect(shapes(out)[0].c.k).toEqual([0, 0, 0, 1]);
  });

  it('reads the roles a file declares', () => {
    expect(rolesOf(file)).toEqual(['@ink', 'illustrationGold']);
    expect(rolesOf({})).toEqual([]);
  });
});

describe('parseColour', () => {
  it.each([
    ['#fff', [1, 1, 1]],
    ['#0C0494', [12 / 255, 4 / 255, 148 / 255]],
    ['#FFFFFF1A', [1, 1, 1]],
    ['rgb(255, 0, 0)', [1, 0, 0]],
    ['rgba(0, 255, 0, 0.5)', [0, 1, 0]],
  ])('%s', (input, rgb) => expect(parseColour(input)).toEqual(rgb));
  it('rejects what it cannot read', () => expect(parseColour('var(--sk-color-action)')).toBeNull());
});
