export type ScaleType = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'lydian' | 'phrygian';
export type GenreType = 'pop' | 'rock' | 'jazz' | 'edm' | 'rnb' | 'ballad' | 'folk';
export type TimeSignature = '4/4' | '3/4' | '6/8';

export interface SongSettings {
  key: string;
  scale: ScaleType;
  bpm: number;
  timeSignature: TimeSignature;
  genre: GenreType;
}

export interface Section {
  id: string;
  name: string;
  measures: number;
  color: string;
}

export interface TensionPoint {
  measureIndex: number; // 0.0 to totalMeasures
  tension: number;      // 0-10
}

export interface SectionChords {
  sectionId: string;
  patterns: ChordPattern[];
}

export interface ChordPattern {
  index: number; // measure index within section (0-based)
  chord: string;
}
