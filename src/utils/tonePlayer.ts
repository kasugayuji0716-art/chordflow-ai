import * as Tone from 'tone';

const ROOT: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
  '7sus4':  [0, 5, 7, 10],
  '9':      [0, 4, 7, 10, 14],
  'maj9':   [0, 4, 7, 11, 14],
  'm9':     [0, 3, 7, 10, 14],
  'add9':   [0, 4, 7, 14],
  '6':      [0, 4, 7, 9],
  'm6':     [0, 3, 7, 9],
};

function midiToNote(midi: number): string {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[semitone]}${octave}`;
}

/**
 * コード名を自然なピアノボイシングに変換
 * - バス音: ルートをオクターブ2
 * - コードトーン: オクターブ3〜4に積み上げ（高くなりすぎない）
 */
export function parseChordToNotes(chord: string): string[] {
  if (!chord || chord === '—') return [];

  const rootMatch = chord.match(/^([A-G][#b]?)/);
  if (!rootMatch) return [];
  const root = rootMatch[1];
  const rootSemitone = ROOT[root];
  if (rootSemitone === undefined) return [];

  const quality = chord.slice(root.length).replace(/\/[A-G][#b]?$/, '');
  const intervals = (INTERVALS[quality] ?? INTERVALS['']).slice(0, 4); // 最大4声

  // バス: ルート音をオクターブ2（MIDI: C2=36）
  const bassMidi = 24 + rootSemitone;

  // コードトーン: オクターブ3〜4に密集ボイシング
  // 基点: ルート音のオクターブ3
  const chordBase = 36 + rootSemitone;
  let prevMidi = chordBase - 1;

  const chordNotes = intervals.map(interval => {
    let midi = chordBase + interval;
    // 前の音より低ければオクターブ上げる
    while (midi <= prevMidi) midi += 12;
    // 上限: F4(65)を超えたら下げる（こもりすぎを防ぐ）
    while (midi > 65) midi -= 12;
    prevMidi = midi;
    return midiToNote(midi);
  });

  return [midiToNote(bassMidi), ...chordNotes];
}

// ---- シンセ + エフェクトチェーン ----
let polySynth: Tone.PolySynth | null = null;

function getSynth(): Tone.PolySynth {
  if (!polySynth) {
    // リバーブ: 自然な残響
    const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.2 }).toDestination();
    // コンプ: ダイナミクスを整える
    const comp = new Tone.Compressor(-18, 4).connect(reverb);

    polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' }, // 倍音豊かな三角波
      envelope: {
        attack: 0.008,
        decay: 0.5,
        sustain: 0.25,
        release: 2.5,
      },
    });
    polySynth.volume.value = -4;
    polySynth.connect(comp);
  }
  return polySynth;
}

/**
 * ストラム再生: 下から上へ少しずらして弾く（ギター・ピアノ的）
 * durationSec: コードを保持する秒数
 * strumMs: 音の間隔（ms）
 */
function strumNotes(notes: string[], durationSec: number, strumMs = 40): void {
  const synth = getSynth();
  notes.forEach((note, i) => {
    const delayMs = i * strumMs;
    const noteDuration = Math.max(0.3, durationSec - delayMs / 1000);
    setTimeout(() => {
      synth.triggerAttackRelease(note, noteDuration);
    }, delayMs);
  });
}

/** 単音コードを試聴（クリック時） */
export async function playChord(chord: string): Promise<void> {
  await Tone.start();
  const notes = parseChordToNotes(chord);
  if (notes.length === 0) return;
  strumNotes(notes, 1.6, 45);
}

let stopFlag = false;

/** コード進行を通しで再生（BPMに合わせる） */
export async function playProgression(
  chords: string[],
  bpm: number,
  onChordIndex?: (i: number) => void,
): Promise<void> {
  await Tone.start();
  stopFlag = false;

  const secPerBeat = 60 / bpm;
  const secPerMeasure = secPerBeat * 4; // 4/4 固定

  for (let i = 0; i < chords.length; i++) {
    if (stopFlag) break;
    onChordIndex?.(i);

    const notes = parseChordToNotes(chords[i]);
    if (notes.length > 0) {
      // コード音を保持する時間: 小節の85%（次のコードの前に少し隙間）
      strumNotes(notes, secPerMeasure * 0.85, 40);
    }

    await new Promise<void>(r => setTimeout(r, secPerMeasure * 1000));
  }
  onChordIndex?.(-1);
}

export function stopPlayback(): void {
  stopFlag = true;
  polySynth?.releaseAll();
}
