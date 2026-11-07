/** Fixed visual scale only. The recommendation score itself is never capped or renormalized. */
// 20 places × at most 110 × novelty 1.2 = 2640; fixed rounded visual endpoint.
export const MAP_COLOR_MAX = 3000;
const low = [235, 246, 239];
const high = [15, 88, 65];
export const UNAVAILABLE_COLOR = '#e3e7e3';

export function scoreColor(score: number | null): { fill: string; text: string } {
  if (score === null || !Number.isFinite(score)) return { fill: UNAVAILABLE_COLOR, text: '#4c5b52' };
  const intensity = Math.min(1, Math.max(0, score) / MAP_COLOR_MAX);
  const rgb = low.map((channel, i) => Math.round(channel + (high[i] - channel) * intensity));
  const luminance = rgb.map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  return {
    fill: `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`,
    text: luminance < 0.179 ? '#ffffff' : '#000000',
  };
}
