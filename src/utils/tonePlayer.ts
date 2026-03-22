import * as Tone from 'tone';

// ルート音名 → 半音数
const ROOT: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// コード種別 → 構成音の半音インターバル
const INTERVALS: Record<string, number[]> = {
  '':       [0, 4, 7],
  'maj':    [0, 4, 7],
  'm':      [0, 3, 7],
  'min':    [0, 3, 7],
  '7':      [0, 4, 7, 10],
  'maj7':   [0, 4, 7, 11],
  'M7':     [0, 4, 7, 11],
  'm7':     [0, 3, 7, 10],
  'mM7':    [0, 3, 7, 11],
  'dim':    [0, 3, 6],
  'dim7':   [0, 3, 6, 9],
  'm7b5':   [0, 3, 6, 10],
  'aug':    [0, 4, 8],
  'sus2':   [0, 2, 7],
  'sus4':   [0, 5, 7],
  'sus':    [0, 5, 7],
  '9':      [0, 4, 7, 10, 14],
  'maj9':   [0, 4, 7, 11, 14],
  'm9':     [0, 3, 7, 10, 14],
  'add9':   [0, 4, 7, 14],
  '6':      [0, 4, 7, 9],
  'm6':     [0, 3, 7, 9],
  '11':     [0, 4, 7, 10, 14, 17],
  '13':     [0, 4, 7, 10, 14, 21],
  '7sus4':  [0, 5, 7, 10],
};

export function parseChordToNotes(chord: string): string[] {
  if (!chord || chord === '—') return [];

  // ルート音を抽出（例: C, C#, Db）
  const rootMatch = chord.match(/^([A-G][#b]?)/);
  if (!rootMatch) return [];
  const root = rootMatch[1];
  const rootSemitone = ROOT[root];
  if (rootSemitone === undefined) return [];

  // ベース音指定（例: C/E）を除去してクオリティを取得
  const quality = chord.slice(root.length).replace(/\/[A-G][#b]?$/, '');
  const intervals = INTERVALS[quality] ?? INTERVALS[''];

  return intervals.map(interval => {
    const total = rootSemitone + interval;
    const semitone = total % 12;
    const octave = 4 + Math.floor(total / 12);
    return `${NOTE_NAMES[semitone]}${octave}`;
  });
}

// シングルトンシンセサイザー
let synth: Tone.PolySynth | null = null;

function getSynth(): Tone.PolySynth {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 1.8 },
    }).toDestination();
    synth.volume.value = -8;
  }
  return synth;
}

/** 単音コードを鳴らす */
export async function playChord(chord: string, durationSec = 1.5): Promise<void> {
  await Tone.start();
  const notes = parseChordToNotes(chord);
  if (notes.length === 0) return;
  getSynth().triggerAttackRelease(notes, durationSec);
}

let stopFlag = false;

/** コード進行全体を順番に再生する */
export async function playProgression(
  chords: string[],
  bpm: number,
  onChordIndex?: (i: number) => void,
): Promise<void> {
  await Tone.start();
  stopFlag = false;

  const secPerBeat = 60 / bpm;
  const secPerMeasure = secPerBeat * 4; // 4/4固定

  for (let i = 0; i < chords.length; i++) {
    if (stopFlag) break;
    onChordIndex?.(i);
    const notes = parseChordToNotes(chords[i]);
    if (notes.length > 0) {
      getSynth().triggerAttackRelease(notes, secPerMeasure * 0.9);
    }
    await new Promise(r => setTimeout(r, secPerMeasure * 1000));
  }
  onChordIndex?.(-1);
}

/** 再生を停止する */
export function stopPlayback(): void {
  stopFlag = true;
  synth?.releaseAll();
}
