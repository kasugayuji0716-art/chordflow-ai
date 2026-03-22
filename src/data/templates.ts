import type { SongSettings } from '../types';

export interface SongTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  settings: SongSettings;
  sections: { name: string; measures: number; color: string }[];
  chords: Record<string, string[]>; // section name → chord array
}

export const TEMPLATES: SongTemplate[] = [
  {
    id: 'jpop-ballad',
    name: 'J-POPバラード',
    description: '王道の泣けるバラード進行',
    emoji: '🎹',
    settings: { key: 'C', scale: 'major', bpm: 72, timeSignature: '4/4', genre: 'ballad' },
    sections: [
      { name: 'イントロ', measures: 4, color: '#6366f1' },
      { name: 'Aメロ',   measures: 8, color: '#22d3ee' },
      { name: 'Bメロ',   measures: 4, color: '#f59e0b' },
      { name: 'サビ',    measures: 8, color: '#ec4899' },
    ],
    chords: {
      'イントロ': ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],
      'Aメロ':   ['Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7'],
      'Bメロ':   ['Am7', 'Em7', 'Fmaj7', 'G7sus4'],
      'サビ':    ['Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7'],
    },
  },
  {
    id: 'uptempo-pop',
    name: 'アップテンポポップ',
    description: '明るくて踊れるポップチューン',
    emoji: '🎉',
    settings: { key: 'G', scale: 'major', bpm: 128, timeSignature: '4/4', genre: 'pop' },
    sections: [
      { name: 'イントロ', measures: 4, color: '#6366f1' },
      { name: 'Aメロ',   measures: 8, color: '#22d3ee' },
      { name: 'サビ',    measures: 8, color: '#ec4899' },
      { name: 'アウトロ', measures: 4, color: '#8b5cf6' },
    ],
    chords: {
      'イントロ': ['Gmaj7', 'Em7', 'Cmaj7', 'D7'],
      'Aメロ':   ['Gmaj7', 'Em7', 'Cmaj7', 'D7', 'Bm7', 'Em7', 'Am7', 'D7'],
      'サビ':    ['Gmaj7', 'Cmaj7', 'Em7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7'],
      'アウトロ': ['Gmaj7', 'Em7', 'Cmaj7', 'D7'],
    },
  },
  {
    id: 'jazz-standard',
    name: 'ジャズスタンダード',
    description: 'スウィングするジャズの定番進行',
    emoji: '🎷',
    settings: { key: 'C', scale: 'major', bpm: 100, timeSignature: '4/4', genre: 'jazz' },
    sections: [
      { name: 'A',  measures: 8, color: '#f59e0b' },
      { name: 'A2', measures: 8, color: '#f59e0b' },
      { name: 'B',  measures: 8, color: '#10b981' },
      { name: 'A3', measures: 8, color: '#f59e0b' },
    ],
    chords: {
      'A':  ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7'],
      'A2': ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7'],
      'B':  ['Gm7', 'C7', 'Fmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Am7b5', 'D7'],
      'A3': ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'Ebdim', 'Dm7', 'G7'],
    },
  },
  {
    id: 'minor-rock',
    name: 'マイナーロック',
    description: 'エモくてかっこいいロック進行',
    emoji: '🎸',
    settings: { key: 'Am', scale: 'minor', bpm: 140, timeSignature: '4/4', genre: 'rock' },
    sections: [
      { name: 'イントロ', measures: 4, color: '#6366f1' },
      { name: 'Aメロ',   measures: 8, color: '#22d3ee' },
      { name: 'サビ',    measures: 8, color: '#f43f5e' },
      { name: 'ブリッジ', measures: 4, color: '#10b981' },
    ],
    chords: {
      'イントロ': ['Am', 'G', 'F', 'E'],
      'Aメロ':   ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E7'],
      'サビ':    ['F', 'G', 'Am', 'E', 'F', 'G', 'Am', 'E7'],
      'ブリッジ': ['Dm', 'Am', 'E7', 'Am'],
    },
  },
  {
    id: 'edm',
    name: 'EDM / ダンス',
    description: 'フロアを盛り上げる四つ打ち進行',
    emoji: '🎧',
    settings: { key: 'Am', scale: 'minor', bpm: 128, timeSignature: '4/4', genre: 'edm' },
    sections: [
      { name: 'ビルドアップ', measures: 8, color: '#8b5cf6' },
      { name: 'ドロップ',   measures: 8, color: '#ec4899' },
      { name: 'ブレイク',   measures: 4, color: '#22d3ee' },
      { name: 'ドロップ2',  measures: 8, color: '#f43f5e' },
    ],
    chords: {
      'ビルドアップ': ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'E'],
      'ドロップ':   ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
      'ブレイク':   ['Am', 'F', 'C', 'E'],
      'ドロップ2':  ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
    },
  },
];
