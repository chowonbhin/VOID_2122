// Demo-only memories a user might have recorded. Never counted as visits or in scores.
import data from './sample-memories.json';
import { dongAt, dongByCode } from '../features/map/ansanGeo';

export interface Memory {
  id: string;
  title: string;
  date: string;
  memo?: string;
  dongCode: string;
  location: { lat: number; lng: number };
  placeId?: string;
  sample?: boolean;
}

export const sampleMemoryNote = data.note;
export const sampleMemories: Memory[] = data.memories.map(memory => ({ ...memory, dongCode: dongAt(memory.location.lat, memory.location.lng)?.code ?? dongByCode(memory.dongCode)?.code ?? memory.dongCode, sample: true }));
export const memoriesInDong = (code: string) => sampleMemories.filter(memory => memory.dongCode === code);

export function koreanDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
