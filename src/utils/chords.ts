import type { SectionChords } from '../types';

/** セクションIDと小節数からコード配列を返す共通ユーティリティ */
export function getSectionChords(
  sectionId: string,
  measures: number,
  chordData: SectionChords[],
  empty = '—'
): string[] {
  const sec = chordData.find(d => d.sectionId === sectionId);
  const result = Array<string>(measures).fill(empty);
  if (sec) {
    sec.patterns.forEach(p => {
      if (p.index < measures) result[p.index] = p.chord;
    });
  }
  return result;
}
