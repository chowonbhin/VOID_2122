import { FOOTFALL_PENALTY } from './policy';
import type { FootfallAdjustment, FootfallDataset, Region } from './types';

export function validateFootfallDataset(data: FootfallDataset): string[] {
  const problems: string[] = [];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.period)) problems.push('invalid footfall period');
  if (!data.source.label || !data.source.checkedAt || !data.sourceAsset) problems.push('missing footfall provenance');
  if (!data.markets.length) problems.push('empty footfall dataset');
  const ids = new Set<string>();
  for (const market of data.markets) {
    if (!market.id || ids.has(market.id)) problems.push(`duplicate or empty footfall market: ${market.id}`);
    ids.add(market.id);
    if (!Number.isFinite(market.dailyAverage) || market.dailyAverage < 0) problems.push(`invalid footfall value: ${market.id}`);
  }
  const total = data.markets.reduce((sum, market) => sum + market.dailyAverage, 0);
  if (!Number.isFinite(total) || total <= 0) problems.push('invalid footfall reference total');
  return problems;
}

/**
 * Fixed reference: all collected markets in the same dataset, never search-result candidates.
 * This is a share of collected market counts, not citywide unique people or live crowding.
 */
export function footfallAdjustment(
  region: Pick<Region, 'footfallMarketIds'>,
  level: 0 | 1 | 2,
  data?: FootfallDataset,
): FootfallAdjustment {
  const ids = region.footfallMarketIds;
  if (!ids?.length) return { status: 'unavailable', adjustment: 0, reason: 'unmapped' };
  if (!data) return { status: 'unavailable', adjustment: 0, reason: 'missing_data' };
  if (validateFootfallDataset(data).length || new Set(ids).size !== ids.length) {
    return { status: 'unavailable', adjustment: 0, reason: 'invalid_data' };
  }
  const markets = ids.map((id) => data.markets.find((market) => market.id === id));
  if (markets.some((market) => !market)) return { status: 'unavailable', adjustment: 0, reason: 'missing_data' };
  const dailyAverage = markets.reduce((sum, market) => sum + market!.dailyAverage, 0);
  const referenceTotal = data.markets.reduce((sum, market) => sum + market.dailyAverage, 0);
  const normalizedShare = dailyAverage / referenceTotal;
  return {
    status: 'available',
    adjustment: normalizedShare === 0 || level === 0 ? 0 : -FOOTFALL_PENALTY[level] * normalizedShare,
    normalizedShare, dailyAverage, referenceTotal, period: data.period, source: data.source,
  };
}
