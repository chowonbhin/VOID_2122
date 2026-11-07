import { describe, expect, it } from 'vitest';
import { scoreColor, UNAVAILABLE_COLOR } from './scoreColor';

function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map(c => parseInt(c, 16) / 255)
    .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

describe('map score encoding', () => {
  it('gets darker as score rises, independent of recommendation rank', () => {
    const scores = [0, 50, 100, 188.8980, 207.0125, 240.7024, 300];
    const shades = scores.map(score => luminance(scoreColor(score).fill));
    shades.slice(1).forEach((shade, i) => expect(shade).toBeLessThan(shades[i]));
  });
  it('distinguishes zero from unavailable data and saturates at the labelled 300+ endpoint', () => {
    expect(scoreColor(0).fill).not.toBe(UNAVAILABLE_COLOR);
    expect(scoreColor(null).fill).toBe(UNAVAILABLE_COLOR);
    expect(scoreColor(NaN).fill).toBe(UNAVAILABLE_COLOR);
    expect(scoreColor(500).fill).toBe(scoreColor(300).fill);
  });
  it('keeps the score labels readable across the whole scale', () => {
    for (const score of [null, ...Array.from({ length: 301 }, (_, i) => i)]) {
      const { fill, text } = scoreColor(score);
      const a = luminance(fill), b = luminance(text);
      expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
